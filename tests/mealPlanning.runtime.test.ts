import {
  createMealPlanEntry,
  deriveShoppingList,
  explainShoppingItem,
  generateRecipeCard,
  normalizeIngredientAlias,
  scaleRecipeIngredients
} from '../src/domain/meal-planning/derivations.js';
import {
  createRecipeSuggestionContext,
  suggestRecipeFromPrompt,
  suggestRecipeFromPromptWithContext
} from '../src/domain/meal-planning/aiRecipeSuggestion.js';
import { InMemoryMealPlanningService } from '../src/domain/meal-planning/service.js';
import type { FoodRules, PantryItem, Recipe } from '../src/domain/meal-planning/types.js';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const test = (name: string, run: () => void) => {
  run();
  console.log(`✓ ${name}`);
};

const nowIso = '2026-03-26T12:00:00.000Z';

const pastaRecipe: Recipe = {
  id: 'recipe-1',
  title: 'Weeknight Pasta',
  status: 'saved',
  version: 1,
  servingsDefault: 2,
  totalTimeMin: 25,
  ingredients: [
    {
      id: 'ing-1',
      rawText: '200 g pasta',
      itemKey: 'pasta',
      displayName: 'Pasta',
      quantity: 200,
      unit: 'g',
      optional: false
    },
    {
      id: 'ing-2',
      rawText: '2 tbsp olive oil',
      itemKey: 'olive_oil',
      displayName: 'Olive oil',
      quantity: 2,
      unit: 'tbsp',
      optional: false
    },
    {
      id: 'ing-3',
      rawText: '1 lemon (optional)',
      itemKey: 'lemon',
      displayName: 'Lemon',
      quantity: 1,
      unit: 'each',
      optional: true
    }
  ],
  instructions: [
    { step: 1, text: 'Boil pasta.' },
    { step: 2, text: 'Toss with olive oil and lemon zest.' }
  ],
  tags: ['weeknight'],
  createdAt: nowIso,
  updatedAt: nowIso
};

const pantry: PantryItem[] = [
  {
    id: 'pantry-1',
    itemKey: 'olive_oil',
    displayName: 'Olive oil',
    status: 'on_hand',
    staple: true,
    updatedAt: nowIso
  }
];

const savedFoodRules: FoodRules = {
  dietaryDefaults: ['gluten_free'],
  standingOrders: ['one pot', 'high protein'],
  ingredientExclusions: ['gluten'],
  allergies: ['asparagus']
};

test('meal plan entries keep recipe snapshot without duplicating full recipe', () => {
  const entry = createMealPlanEntry({
    id: 'meal-1',
    recipe: pastaRecipe,
    date: '2026-03-27',
    mealType: 'dinner',
    servings: 4,
    nowIso
  });

  assert(entry.recipeId === pastaRecipe.id, 'meal should reference recipe by id');
  assert(entry.sourceSnapshot.recipeVersion === pastaRecipe.version, 'meal should freeze recipe version');
  assert((entry as unknown as { ingredients?: unknown }).ingredients === undefined, 'meal should not duplicate ingredients');
});

test('ingredient scaling is deterministic for planned servings', () => {
  const scaled = scaleRecipeIngredients(pastaRecipe, 4);
  const pasta = scaled.find((item) => item.itemKey === 'pasta');

  assert(pasta?.quantity === 400, 'pasta quantity should double for 4 servings');
});

test('shopping list derivation includes provenance and pantry suppression', () => {
  const meal = createMealPlanEntry({
    id: 'meal-2',
    recipe: pastaRecipe,
    date: '2026-03-27',
    mealType: 'dinner',
    shoppingMode: 'include_missing_only',
    nowIso
  });

  const { items } = deriveShoppingList({
    shoppingListId: 'shop-1',
    scope: { type: 'week', startDate: '2026-03-26', endDate: '2026-04-01' },
    plannedMeals: [meal],
    recipeById: { [pastaRecipe.id]: pastaRecipe },
    pantryItems: pantry,
    nowIso
  });

  const oil = items.find((item) => item.itemKey === 'olive_oil');
  const pasta = items.find((item) => item.itemKey === 'pasta');

  assert(Boolean(oil), 'olive oil should still be represented for explainability');
  assert(oil?.purchaseState === 'already_have', 'pantry on-hand item should be suppressed as already have');
  assert(Boolean(pasta), 'pasta should be on list when not in pantry');
  assert(pasta?.sources[0].mealId === meal.id, 'shopping items should keep source meal provenance');
});

test('shopping explanation tells user why item exists and pantry impact', () => {
  const meal = createMealPlanEntry({
    id: 'meal-3',
    recipe: pastaRecipe,
    date: '2026-03-28',
    mealType: 'dinner',
    nowIso
  });

  const { items } = deriveShoppingList({
    shoppingListId: 'shop-2',
    scope: { type: 'week', startDate: '2026-03-26', endDate: '2026-04-01' },
    plannedMeals: [meal],
    recipeById: { [pastaRecipe.id]: pastaRecipe },
    pantryItems: pantry,
    nowIso
  });

  const explanation = explainShoppingItem(items[0], pantry);
  assert(explanation.becauseMeals.length >= 1, 'explanation should include contributing meals');
  assert(['added', 'downgraded', 'suppressed'].includes(explanation.pantryImpact.effect), 'pantry impact should be explicit');
});

test('service supports save -> plan -> shop -> recipe-card flow', () => {
  const service = new InMemoryMealPlanningService();
  const savedRecipe = service.saveRecipe(pastaRecipe);

  service.addToPlan({
    id: 'meal-4',
    recipeId: savedRecipe.id,
    date: '2026-03-29',
    mealType: 'dinner',
    servings: 2,
    nowIso
  });

  const shopping = service.recalculateShopping({
    shoppingListId: 'shop-3',
    scope: { type: 'week', startDate: '2026-03-26', endDate: '2026-04-01' },
    pantryItems: pantry,
    nowIso
  });

  const card = service.generateRecipeCard({
    recipeId: savedRecipe.id,
    plannedDate: '2026-03-29',
    mealType: 'dinner'
  });

  assert(shopping.items.length > 0, 'shopping list should be derived from plans');
  assert(shopping.explanations.length === shopping.items.length, 'each shopping item should be explainable');
  assert(card.ingredientsDisplay.length === savedRecipe.ingredients.length, 'recipe card should be generated from recipe source');
  assert(card.title === 'Weeknight Pasta', 'recipe card should reflect source recipe title');
});

test('alias normalization maps lightweight ingredient synonyms', () => {
  assert(normalizeIngredientAlias('scallions') === 'green_onion', 'scallions should normalize to green onion');
  assert(normalizeIngredientAlias('capsicum') === 'bell_pepper', 'capsicum should normalize to bell pepper');
});

test('recipe updates are snapshot-aware and reject stale edits', () => {
  const service = new InMemoryMealPlanningService();
  const saved = service.saveRecipe(pastaRecipe);
  const updated = service.updateRecipe({
    recipeId: saved.id,
    baseVersion: saved.version,
    patch: { title: 'Weeknight Pasta v2' }
  });

  assert(updated.version === saved.version + 1, 'version should increment on update');

  let conflictRaised = false;
  try {
    service.updateRecipe({
      recipeId: saved.id,
      baseVersion: saved.version,
      patch: { title: 'Stale edit should fail' }
    });
  } catch (_error) {
    conflictRaised = true;
  }

  assert(conflictRaised, 'stale baseVersion should raise snapshot conflict');
});

console.log('All meal planning runtime tests passed.');


test('generated suggestions are draft recipes with ai provenance', () => {
  const draft = suggestRecipeFromPrompt('quick vegetarian spicy dinner', nowIso);

  assert(draft.status === 'draft', 'ai suggestions should start as drafts');
  assert(draft.source?.type === 'ai_generated', 'ai suggestions should carry ai-generated provenance');
  assert(draft.source?.label === 'Outgrow AI planner', 'ai suggestion source label should remain explicit');
});

test('draft recipes can be persisted, planned, and then transitioned to saved', () => {
  const service = new InMemoryMealPlanningService();
  const draft = service.saveRecipe(suggestRecipeFromPrompt('quick high protein dinner', nowIso));

  assert(draft.status === 'draft', 'saved draft should remain draft until user keeps it');

  const tonight = service.addToPlan({
    id: 'meal-draft-1',
    recipeId: draft.id,
    date: '2026-03-26',
    mealType: 'dinner',
    nowIso
  });

  const shopping = service.recalculateShopping({
    shoppingListId: 'shop-draft-1',
    scope: { type: 'week', startDate: '2026-03-26', endDate: '2026-04-01' },
    nowIso
  });

  assert(tonight.recipeId === draft.id, 'draft recipe should be plannable');
  assert(shopping.items.length > 0, 'draft recipes should flow into shopping');

  const saved = service.updateRecipe({
    recipeId: draft.id,
    baseVersion: draft.version,
    patch: { status: 'saved' }
  });

  assert(saved.status === 'saved', 'keep/save action should transition draft to saved');
});

test('generated ingredient structured fields remain consistent with raw text', () => {
  const draft = suggestRecipeFromPrompt('comforting dinner', nowIso);

  for (const ingredient of draft.ingredients) {
    const expected = `${ingredient.quantity} ${ingredient.unit} ${ingredient.displayName.toLowerCase()}`;
    assert(ingredient.rawText.toLowerCase() === expected, `ingredient raw text should match structured quantity/unit: ${ingredient.id}`);
  }
});


test('iterative suggestions produce distinct draft candidates in one session', () => {
  let context = createRecipeSuggestionContext('quick vegetarian dinner');

  const first = suggestRecipeFromPromptWithContext({ prompt: 'quick vegetarian dinner', context, nowIso });
  context = first.context;
  const second = suggestRecipeFromPromptWithContext({ prompt: 'quick vegetarian dinner', context, nowIso });

  assert(first.recipe.title !== second.recipe.title, 'second suggestion should differ from first draft title');
  assert(first.recipe.status === 'draft' && second.recipe.status === 'draft', 'iterative suggestions stay in draft state');
});

test('not-for-me feedback pushes next recommendation away from rejected profile', () => {
  let context = createRecipeSuggestionContext('quick dinner with protein');

  const first = suggestRecipeFromPromptWithContext({ prompt: 'quick dinner with protein', context, nowIso });
  context = first.context;

  const next = suggestRecipeFromPromptWithContext({
    prompt: 'quick dinner with protein',
    context,
    feedback: { type: 'not_for_me', recipe: first.recipe, reasons: ['wrong_protein'] },
    nowIso
  });

  assert(first.recipe.title !== next.recipe.title, 'rejected recipe should not be resurfaced in the next turn');
});

test('more-like-this feedback increases style similarity without exact duplicate', () => {
  let context = createRecipeSuggestionContext('comforting quick dinner');

  const first = suggestRecipeFromPromptWithContext({ prompt: 'comforting quick dinner', context, nowIso });
  context = first.context;

  const next = suggestRecipeFromPromptWithContext({
    prompt: 'comforting quick dinner',
    context,
    feedback: { type: 'more_like_this', recipe: first.recipe },
    nowIso
  });

  assert(next.recipe.title !== first.recipe.title, 'more-like-this should avoid near-duplicate title');
  assert(next.recipe.tags.some((tag) => first.recipe.tags.includes(tag)), 'more-like-this should keep a similar style signal');
});

test('session suggestions avoid short-loop repeats and repeated patterns', () => {
  let context = createRecipeSuggestionContext('quick dinner');
  const titles: string[] = [];
  const patternKeys: string[] = [];

  for (let index = 0; index < 8; index += 1) {
    const result = suggestRecipeFromPromptWithContext({ prompt: 'quick dinner', context, nowIso });
    context = result.context;
    titles.push(result.recipe.title);
    patternKeys.push(`${result.recipe.ingredients[0]?.itemKey}|${result.recipe.tags[2]}|${result.recipe.title.split(' ').at(-1)?.toLowerCase()}`);
  }

  assert(new Set(titles).size >= 7, 'repeated suggest-another turns should keep title variety high');
  assert(new Set(patternKeys).size >= 6, 'repeated suggest-another turns should broaden method/format/protein patterns');
});

test('suggest-another expands session coverage across families, not just exact signatures', () => {
  let context = createRecipeSuggestionContext('quick dinner');
  const proteinFamilies = new Set<string>();
  const cuisineFamilies = new Set<string>();
  const formatFamilies = new Set<string>();

  for (let index = 0; index < 9; index += 1) {
    const result = suggestRecipeFromPromptWithContext({ prompt: 'quick dinner', context, nowIso });
    context = result.context;
    proteinFamilies.add(context.sessionCoverage.proteinsShown[0] ?? 'unknown');
    cuisineFamilies.add(context.sessionCoverage.cuisinesShown[0] ?? 'unknown');
    formatFamilies.add(context.sessionCoverage.formatsShown[0] ?? 'unknown');
  }

  assert(proteinFamilies.size >= 3, 'session should explore multiple protein families');
  assert(cuisineFamilies.size >= 3, 'session should explore multiple cuisine families');
  assert(formatFamilies.size >= 3, 'session should explore multiple meal formats');
});

test('session novelty memory survives prompt changes', () => {
  let context = createRecipeSuggestionContext('quick dinner');
  const first = suggestRecipeFromPromptWithContext({ prompt: 'quick dinner', context, nowIso });
  context = first.context;

  const afterPromptChange = suggestRecipeFromPromptWithContext({ prompt: 'lighter weeknight ideas', context, nowIso });
  const previousTitleTokens = new Set(first.recipe.title.toLowerCase().split(/\s+/));
  const nextTitleTokens = new Set(afterPromptChange.recipe.title.toLowerCase().split(/\s+/));
  const overlap = Array.from(previousTitleTokens).filter((token) => nextTitleTokens.has(token)).length;

  assert(overlap < previousTitleTokens.size, 'prompt changes should not erase novelty pressure from session history');
});

test('weekly success meal cues softly influence recipe style and provide transparent steering text', () => {
  const context = createRecipeSuggestionContext('dinner idea');
  const result = suggestRecipeFromPromptWithContext({
    prompt: 'dinner idea',
    context,
    weeklySuccessText: 'This week success looks like easy dinners with less cleanup and cozy meals.',
    nowIso
  });

  const methodTag = result.recipe.tags[2];
  assert(['one pot', 'sheet pan', 'skillet'].includes(methodTag), 'cleanup cue should steer toward lower-cleanup methods');
  assert((result.context.lastSteeringSignals?.length ?? 0) > 0, 'major steering cues should be explainable');
});

test('non-food weekly success text does not materially distort recipe suggestions', () => {
  const prompt = 'quick dinner';
  const base = suggestRecipeFromPromptWithContext({
    prompt,
    context: createRecipeSuggestionContext(prompt),
    nowIso
  });

  const nonFood = suggestRecipeFromPromptWithContext({
    prompt,
    context: createRecipeSuggestionContext(prompt),
    weeklySuccessText: 'This week success looks like finishing my slide deck and inbox cleanup.',
    nowIso
  });

  assert(base.recipe.title === nonFood.recipe.title, 'non-food weekly text should not alter generated suggestion');
});

test('explicit recipe feedback stays stronger than weekly success influence', () => {
  let context = createRecipeSuggestionContext('quick dinner');
  const first = suggestRecipeFromPromptWithContext({
    prompt: 'quick dinner',
    context,
    weeklySuccessText: 'This week success looks like cozy comfort meals.',
    nowIso
  });
  context = first.context;

  const next = suggestRecipeFromPromptWithContext({
    prompt: 'quick dinner',
    context,
    weeklySuccessText: 'This week success looks like easy cleanup and one-pan nights.',
    feedback: { type: 'more_like_this', recipe: first.recipe },
    nowIso
  });

  assert(next.recipe.tags.some((tag) => first.recipe.tags.includes(tag)), 'explicit feedback should keep stronger style continuity');
});

test('hard restrictions are always enforced in generated recipes', () => {
  const result = suggestRecipeFromPromptWithContext({
    prompt: 'quick dinner',
    context: createRecipeSuggestionContext('quick dinner'),
    foodRules: savedFoodRules,
    nowIso
  });

  const ingredientKeys = result.recipe.ingredients.map((ingredient) => normalizeIngredientAlias(ingredient.itemKey));
  assert(!ingredientKeys.includes('asparagus'), 'allergy ingredient should never appear in generated ingredients');
  assert(!ingredientKeys.includes('orzo') && !ingredientKeys.includes('farro'), 'gluten defaults/restrictions should avoid gluten bases');
});

test('standing orders bias suggestions while keeping flexibility', () => {
  const withStandingOrders = suggestRecipeFromPromptWithContext({
    prompt: 'quick dinner',
    context: createRecipeSuggestionContext('quick dinner'),
    foodRules: savedFoodRules,
    nowIso
  });

  assert(
    withStandingOrders.recipe.tags[2] === 'one pot' || withStandingOrders.recipe.tags[1] === 'quick',
    'standing orders should softly bias method/format'
  );
});

test('shopping output respects hard restrictions and exclusions', () => {
  const service = new InMemoryMealPlanningService();
  const generated = service.saveRecipe(suggestRecipeFromPromptWithContext({
    prompt: 'quick dinner',
    context: createRecipeSuggestionContext('quick dinner'),
    foodRules: savedFoodRules,
    nowIso
  }).recipe);

  service.addToPlan({
    id: 'meal-rules-1',
    recipeId: generated.id,
    date: '2026-03-26',
    mealType: 'dinner',
    nowIso
  });

  const shopping = service.recalculateShopping({
    shoppingListId: 'shop-rules-1',
    scope: { type: 'week', startDate: '2026-03-26', endDate: '2026-04-01' },
    foodRules: savedFoodRules,
    nowIso
  });

  assert(shopping.items.every((item) => item.itemKey !== 'asparagus'), 'shopping should not include allergy items');
});

test('feedback loops continue honoring saved food rules', () => {
  let context = createRecipeSuggestionContext('quick dinner');
  const first = suggestRecipeFromPromptWithContext({
    prompt: 'quick dinner',
    context,
    foodRules: savedFoodRules,
    nowIso
  });
  context = first.context;

  const next = suggestRecipeFromPromptWithContext({
    prompt: 'quick dinner',
    context,
    feedback: { type: 'more_like_this', recipe: first.recipe },
    foodRules: savedFoodRules,
    nowIso
  });

  const ingredientKeys = next.recipe.ingredients.map((ingredient) => normalizeIngredientAlias(ingredient.itemKey));
  assert(!ingredientKeys.includes('asparagus'), 'follow-up suggestions should still enforce hard restrictions');
});

test('too_heavy rejection reasons steer toward lighter style in the next draft', () => {
  let context = createRecipeSuggestionContext('comforting quick dinner');
  const first = suggestRecipeFromPromptWithContext({
    prompt: 'comforting quick dinner',
    context,
    nowIso
  });
  context = first.context;

  const next = suggestRecipeFromPromptWithContext({
    prompt: 'comforting quick dinner',
    context,
    feedback: { type: 'not_for_me', recipe: first.recipe, reasons: ['too_heavy'] },
    nowIso
  });

  assert(next.recipe.tags[1] === 'quick', 'too_heavy should push toward lighter/faster options');
});

test('wrong_cuisine and wrong_protein reasons are reflected in steering explanations', () => {
  const context = createRecipeSuggestionContext('quick dinner');
  const first = suggestRecipeFromPromptWithContext({
    prompt: 'quick dinner',
    context,
    nowIso
  });

  const next = suggestRecipeFromPromptWithContext({
    prompt: 'quick dinner',
    context: first.context,
    feedback: { type: 'not_for_me', recipe: first.recipe, reasons: ['wrong_cuisine', 'wrong_protein'] },
    nowIso
  });

  assert(
    (next.context.lastSteeringSignals ?? []).some((signal) => signal.includes('avoiding: this cuisine')),
    'wrong_cuisine should produce explainable avoidance signal'
  );
  assert(
    (next.context.lastSteeringSignals ?? []).some((signal) => signal.includes('avoiding: this protein')),
    'wrong_protein should produce explainable avoidance signal'
  );
});

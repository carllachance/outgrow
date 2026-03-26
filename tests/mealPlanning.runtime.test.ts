import {
  createMealPlanEntry,
  deriveShoppingList,
  explainShoppingItem,
  generateRecipeCard,
  normalizeIngredientAlias,
  scaleRecipeIngredients
} from '../src/domain/meal-planning/derivations.js';
import { InMemoryMealPlanningService } from '../src/domain/meal-planning/service.js';
import type { PantryItem, Recipe } from '../src/domain/meal-planning/types.js';

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

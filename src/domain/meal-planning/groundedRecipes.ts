import { normalizeIngredientAlias } from './derivations.js';
import { buildGeneratedFoodImage } from './recipeImagery.js';
import type { FoodRules, Recipe, RecipeFeedbackEvent, RecipeFeedbackReason, RecipeSuggestionSessionContext } from './types.js';

export type RecipeId = string;
export type IngredientId = string;
export type ClusterId = string;

export type IngredientLine = {
  rawText: string;
  quantity?: number;
  unit?: string;
  ingredientName: string;
  preparation?: string;
};

export type NormalizedIngredient = {
  ingredientId: IngredientId;
  canonicalName: string;
  matchedFrom: string;
  quantity?: number;
  unit?: string;
  role?: 'primary' | 'secondary' | 'aromatic' | 'seasoning' | 'garnish';
};

export type RecipeSource =
  | { kind: 'curated'; sourceName: string; sourceRecipeId?: string }
  | { kind: 'licensed'; sourceName: string; sourceRecipeId?: string }
  | { kind: 'user_saved'; savedAt: string }
  | { kind: 'adapted_from_base'; baseRecipeId: RecipeId; adaptationSummary: string[] }
  | { kind: 'ai_draft_from_template'; templateKey: string; confidence: number };

export type RecipeImage =
  | {
      state: 'ready';
      url: string;
      thumbnailUrl?: string;
      provenance: 'curated' | 'generated';
      cacheKey?: string;
      generatedAt?: string;
    }
  | {
      state: 'loading';
      requestId: string;
      startedAt: string;
    }
  | {
      state: 'fallback';
      reason: 'missing' | 'failed' | 'disabled' | 'low_confidence';
    }
  | {
      state: 'failed';
      reason: string;
    }
  | {
      state: 'disabled';
      reason: string;
    };

export type RecipeRecord = {
  id: RecipeId;
  title: string;
  canonicalTitle: string;
  description?: string;
  cuisine?: string;
  course?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  method?: string[];
  equipment?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  totalMinutes?: number;
  activeMinutes?: number;
  servings?: number;
  ingredients: IngredientLine[];
  normalizedIngredients: NormalizedIngredient[];
  dietaryTags: string[];
  flavorTags: string[];
  seasonalTags: string[];
  pantryTags: string[];
  proteinTags: string[];
  carbTags: string[];
  vegetableTags: string[];
  source: RecipeSource;
  image: RecipeImage;
  quality: {
    completenessScore: number;
    popularityScore?: number;
    editorialScore?: number;
    confidenceScore: number;
  };
  clusterId?: ClusterId;
  similarityKeys: string[];
  embeddingText: string;
  instructions?: string[];
};

export type MealIntent = {
  includedIngredients: string[];
  excludedIngredients: string[];
  preferredCuisines: string[];
  avoidedCuisines: string[];
  dietaryConstraints: string[];
  maxTimeMinutes?: number;
  preferredMealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  comfortLevel?: 'light' | 'hearty';
  noveltyPreference?: 'familiar' | 'balanced' | 'adventurous';
  imageExpectation?: 'important' | 'nice_to_have' | 'irrelevant';
};

export type GuidedRecipeStep = {
  id: string;
  title: string;
  body: string;
  ingredientRefs: string[];
  toolRefs: string[];
  timeCue?: string;
  completionCue?: string;
};

export type GuidedRecipeView = {
  recipeId: RecipeId;
  title: string;
  summary?: string;
  servings?: number;
  totalMinutes?: number;
  activeMinutes?: number;
  equipment: string[];
  ingredients: IngredientLine[];
  prepNotes: string[];
  steps: GuidedRecipeStep[];
  finishNotes?: string[];
  substitutions?: string[];
  provenance: RecipeSource;
};

export type SuggestionExposure = {
  recipeId: RecipeId;
  shownAt: string;
  action: 'shown' | 'opened' | 'saved' | 'planned' | 'rejected' | 'dismissed';
  proteinFamily?: string;
  cuisine?: string;
  method?: string;
  clusterId?: ClusterId;
};

export type SuppressionRule = {
  type: 'ingredient' | 'protein_family' | 'cuisine' | 'cluster' | 'recipe';
  key: string;
  reason: 'explicit_rejection' | 'recent_exposure' | 'repeat_penalty';
  activeUntil: string;
  strength: number;
};

export type RetrievalCandidate = {
  recipe: RecipeRecord;
  retrievalReasons: string[];
  retrievalChannel: 'direct_ingredient_match' | 'tag_match' | 'embedding_match' | 'pantry_efficiency' | 'diversity_expansion';
};

export type RankedRecipeScore = {
  recipeId: RecipeId;
  total: number;
  components: {
    pantryMatch: number;
    intentMatch: number;
    dietaryFit: number;
    timeFit: number;
    novelty: number;
    diversityBoost: number;
    recentPenalty: number;
    rejectionPenalty: number;
    repetitionPenalty: number;
    imageReadiness: number;
    editorialQuality: number;
  };
  explanation: string[];
};

const aliasMap: Record<string, string> = {
  scallion: 'green onion',
  scallions: 'green onion',
  chickpeas: 'garbanzo beans',
  garbanzo: 'garbanzo beans',
  spaghetti: 'pasta',
  'low sodium soy sauce': 'soy sauce',
  capsicum: 'bell pepper'
};

const nowPlusDays = (iso: string, days: number): string => {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
};

const normalizeToken = (value: string): string => value.toLowerCase().trim().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ');

const normalizeIngredientName = (name: string): string => aliasMap[normalizeToken(name)] ?? normalizeToken(name);

const makeIngredient = (ingredientName: string, quantity?: number, unit?: string, preparation?: string): IngredientLine => ({
  ingredientName,
  quantity,
  unit,
  preparation,
  rawText: `${quantity ?? ''} ${unit ?? ''} ${ingredientName}`.trim().replace(/\s+/g, ' ')
});

const toNormalizedIngredient = (line: IngredientLine): NormalizedIngredient => ({
  ingredientId: normalizeIngredientAlias(line.ingredientName),
  canonicalName: normalizeIngredientName(line.ingredientName),
  matchedFrom: line.ingredientName,
  quantity: line.quantity,
  unit: line.unit
});

const BASE_RECIPE_LIBRARY: Array<Omit<RecipeRecord, 'normalizedIngredients'>> = [
  {
    id: 'curated-sheet-pan-lemon-chicken',
    title: 'Lemon Garlic Sheet Pan Chicken & Broccoli',
    canonicalTitle: 'lemon garlic sheet pan chicken and broccoli',
    description: 'One tray dinner with crisp broccoli and roasted lemon.',
    cuisine: 'mediterranean',
    course: 'dinner',
    method: ['sheet pan', 'roast'],
    equipment: ['sheet pan', 'mixing bowl'],
    difficulty: 'easy',
    totalMinutes: 35,
    activeMinutes: 15,
    servings: 2,
    ingredients: [
      makeIngredient('chicken thighs', 4, 'each'),
      makeIngredient('broccoli', 1, 'head', 'cut into florets'),
      makeIngredient('olive oil', 2, 'tbsp'),
      makeIngredient('garlic', 2, 'cloves', 'minced'),
      makeIngredient('lemon', 1, 'each', 'zested and juiced')
    ],
    dietaryTags: ['high_protein'],
    flavorTags: ['lemon', 'garlic', 'savory'],
    seasonalTags: [],
    pantryTags: ['olive oil', 'garlic'],
    proteinTags: ['poultry'],
    carbTags: ['low_carb'],
    vegetableTags: ['broccoli'],
    source: { kind: 'curated', sourceName: 'Outgrow recipe library', sourceRecipeId: 'cur-101' },
    image: { state: 'ready', url: 'https://images.unsplash.com/photo-1625944230945-1b7dd3b949ab?auto=format&fit=crop&w=1200&q=80', provenance: 'curated', cacheKey: 'cur-101' },
    quality: { completenessScore: 0.98, editorialScore: 0.92, confidenceScore: 0.97 },
    clusterId: 'sheet-pan-chicken',
    similarityKeys: ['chicken', 'sheet pan', 'lemon garlic'],
    embeddingText: 'lemon garlic sheet pan chicken broccoli weeknight dinner',
    instructions: [
      'Heat oven to 425°F. Toss broccoli with half the oil, salt, and pepper on one side of a sheet pan.',
      'Rub chicken with garlic, lemon zest, remaining oil, salt, and pepper. Place on the other side.',
      'Roast until chicken is cooked through and broccoli is browned, 20 to 25 minutes.',
      'Finish with lemon juice before serving.'
    ]
  },
  {
    id: 'curated-miso-ginger-tofu-bowl',
    title: 'Miso Ginger Tofu Rice Bowl',
    canonicalTitle: 'miso ginger tofu rice bowl',
    cuisine: 'east_asian',
    course: 'dinner',
    method: ['skillet'],
    equipment: ['skillet', 'pot'],
    difficulty: 'easy',
    totalMinutes: 30,
    activeMinutes: 20,
    servings: 2,
    ingredients: [
      makeIngredient('firm tofu', 14, 'oz', 'pressed and cubed'),
      makeIngredient('rice', 1, 'cup'),
      makeIngredient('soy sauce', 2, 'tbsp'),
      makeIngredient('miso paste', 1, 'tbsp'),
      makeIngredient('green onion', 2, 'stalks', 'sliced'),
      makeIngredient('carrot', 1, 'each', 'shredded')
    ],
    dietaryTags: ['vegetarian'],
    flavorTags: ['miso', 'ginger', 'umami'],
    seasonalTags: [],
    pantryTags: ['soy sauce', 'rice'],
    proteinTags: ['soy'],
    carbTags: ['rice'],
    vegetableTags: ['carrot', 'green onion'],
    source: { kind: 'licensed', sourceName: 'Kitchen Atlas', sourceRecipeId: 'kat-2210' },
    image: { state: 'loading', requestId: 'img-miso-tofu', startedAt: '2026-03-20T10:00:00.000Z' },
    quality: { completenessScore: 0.95, editorialScore: 0.88, confidenceScore: 0.95 },
    clusterId: 'tofu-rice-bowl',
    similarityKeys: ['tofu', 'rice bowl', 'miso'],
    embeddingText: 'miso ginger tofu rice bowl quick vegetarian',
    instructions: [
      'Cook rice according to package directions.',
      'Whisk soy sauce, miso, and a splash of water for a quick sauce.',
      'Sear tofu in a skillet until browned. Add sauce and coat.',
      'Serve tofu over rice with carrot and green onion.'
    ]
  },
  {
    id: 'curated-turkey-chili',
    title: 'One-Pot Turkey Bean Chili',
    canonicalTitle: 'one pot turkey bean chili',
    cuisine: 'latin',
    course: 'dinner',
    method: ['one pot', 'simmer'],
    equipment: ['pot'],
    difficulty: 'easy',
    totalMinutes: 40,
    activeMinutes: 15,
    servings: 4,
    ingredients: [
      makeIngredient('ground turkey', 1, 'lb'),
      makeIngredient('garbanzo beans', 1, 'can', 'drained'),
      makeIngredient('diced tomato', 1, 'can'),
      makeIngredient('onion', 1, 'each', 'diced'),
      makeIngredient('chili powder', 2, 'tsp')
    ],
    dietaryTags: ['high_protein'],
    flavorTags: ['smoky', 'hearty'],
    seasonalTags: [],
    pantryTags: ['beans', 'tomato'],
    proteinTags: ['poultry'],
    carbTags: ['legume'],
    vegetableTags: ['onion', 'tomato'],
    source: { kind: 'curated', sourceName: 'Outgrow recipe library', sourceRecipeId: 'cur-333' },
    image: { state: 'fallback', reason: 'missing' },
    quality: { completenessScore: 0.93, editorialScore: 0.9, confidenceScore: 0.94 },
    clusterId: 'turkey-chili',
    similarityKeys: ['turkey', 'chili', 'one pot'],
    embeddingText: 'one pot turkey bean chili batch friendly cozy',
    instructions: [
      'Brown turkey with onion in a pot.',
      'Stir in chili powder and cook until fragrant.',
      'Add tomatoes and beans, then simmer 20 minutes.',
      'Taste, season, and serve.'
    ]
  },
  {
    id: 'curated-cod-tomato-skillet',
    title: 'Tomato Basil Skillet Cod',
    canonicalTitle: 'tomato basil skillet cod',
    cuisine: 'mediterranean',
    course: 'dinner',
    method: ['skillet'],
    equipment: ['skillet'],
    difficulty: 'easy',
    totalMinutes: 25,
    activeMinutes: 20,
    servings: 2,
    ingredients: [
      makeIngredient('cod', 2, 'fillets'),
      makeIngredient('cherry tomato', 2, 'cups'),
      makeIngredient('garlic', 2, 'cloves'),
      makeIngredient('basil', 0.25, 'cup')
    ],
    dietaryTags: ['high_protein'],
    flavorTags: ['tomato', 'basil'],
    seasonalTags: [],
    pantryTags: ['garlic'],
    proteinTags: ['seafood'],
    carbTags: ['low_carb'],
    vegetableTags: ['tomato'],
    source: { kind: 'licensed', sourceName: 'Weeknight Table', sourceRecipeId: 'wt-90' },
    image: { state: 'failed', reason: 'source_timeout' },
    quality: { completenessScore: 0.91, editorialScore: 0.85, confidenceScore: 0.9 },
    clusterId: 'white-fish-skillet',
    similarityKeys: ['cod', 'skillet', 'tomato basil'],
    embeddingText: 'skillet cod tomato basil quick dinner',
    instructions: [
      'Pat cod dry and season with salt and pepper.',
      'Cook cod in olive oil until nearly done. Remove briefly.',
      'Cook tomatoes and garlic until saucy, then return cod.',
      'Finish with basil and serve.'
    ]
  }
];

export const RECIPE_LIBRARY: RecipeRecord[] = BASE_RECIPE_LIBRARY.map((recipe) => ({
  ...recipe,
  normalizedIngredients: recipe.ingredients.map(toNormalizedIngredient)
}));

export const parseMealIntent = (prompt: string, foodRules?: FoodRules): MealIntent => {
  const text = normalizeToken(prompt);
  const includes = ['chicken', 'tofu', 'turkey', 'cod', 'salmon', 'pasta', 'rice'].filter((token) => text.includes(token));
  const excludedIngredients = foodRules?.ingredientExclusions ?? [];
  const excludedByPrompt = ['no cod', 'not cod', 'without cod', 'no fish'].flatMap((phrase) => text.includes(phrase) ? [phrase.includes('cod') ? 'cod' : 'fish'] : []);
  const preferredCuisines = ['mediterranean', 'latin', 'east asian'].filter((c) => text.includes(c.replace('_', ' ')));

  return {
    includedIngredients: includes,
    excludedIngredients: [...new Set([...excludedIngredients.map(normalizeIngredientName), ...excludedByPrompt])],
    preferredCuisines,
    avoidedCuisines: [],
    dietaryConstraints: foodRules?.dietaryDefaults ?? [],
    maxTimeMinutes: text.includes('quick') || text.includes('fast') ? 30 : undefined,
    preferredMealType: 'dinner',
    comfortLevel: text.includes('comfort') || text.includes('cozy') ? 'hearty' : undefined,
    noveltyPreference: text.includes('adventurous') ? 'adventurous' : 'balanced',
    imageExpectation: text.includes('image') ? 'important' : 'nice_to_have'
  };
};

const ingredientOverlap = (recipe: RecipeRecord, pantryIngredientIds: IngredientId[]): number => {
  if (!pantryIngredientIds.length) return 0;
  const keySet = new Set(pantryIngredientIds);
  const hitCount = recipe.normalizedIngredients.filter((ingredient) => keySet.has(ingredient.ingredientId)).length;
  return hitCount / Math.max(recipe.normalizedIngredients.length, 1);
};

export const buildSuppressionRulesFromContext = (args: {
  context: RecipeSuggestionSessionContext;
  nowIso: string;
  foodRules?: FoodRules;
  feedback?: { reasons?: RecipeFeedbackReason[]; recipe?: Recipe };
}): SuppressionRule[] => {
  const rules: SuppressionRule[] = [];

  for (const ingredient of args.foodRules?.ingredientExclusions ?? []) {
    rules.push({
      type: 'ingredient',
      key: normalizeIngredientName(ingredient),
      reason: 'explicit_rejection',
      activeUntil: nowPlusDays(args.nowIso, 30),
      strength: 1
    });
  }

  for (const event of args.context.feedbackEvents ?? []) {
    if (event.kind !== 'reject') continue;
    const rejectedRecipeId = event.recipeId;
    rules.push({
      type: 'recipe',
      key: rejectedRecipeId,
      reason: 'explicit_rejection',
      activeUntil: nowPlusDays(event.createdAt, 10),
      strength: 1
    });
  }

  if (args.feedback?.reasons?.includes('wrong_protein') && args.feedback.recipe) {
    const protein = args.feedback.recipe.tags[0]?.toLowerCase() ?? '';
    if (protein) {
      rules.push({
        type: 'protein_family',
        key: protein,
        reason: 'explicit_rejection',
        activeUntil: nowPlusDays(args.nowIso, 7),
        strength: 0.9
      });
    }
  }

  if (args.feedback?.recipe?.title.toLowerCase().includes('cod') || args.feedback?.recipe?.ingredients.some((i) => normalizeIngredientName(i.displayName) === 'cod')) {
    rules.push({
      type: 'ingredient',
      key: 'cod',
      reason: 'explicit_rejection',
      activeUntil: nowPlusDays(args.nowIso, 14),
      strength: 1
    });
    rules.push({
      type: 'cluster',
      key: 'white-fish-skillet',
      reason: 'repeat_penalty',
      activeUntil: nowPlusDays(args.nowIso, 10),
      strength: 0.8
    });
  }

  return rules;
};

export const retrieveCandidates = (args: {
  intent: MealIntent;
  pantryIngredientIds: IngredientId[];
}): RetrievalCandidate[] => {
  const records = RECIPE_LIBRARY;
  const hits: RetrievalCandidate[] = [];

  for (const recipe of records) {
    const ingredientNames = recipe.normalizedIngredients.map((ingredient) => ingredient.canonicalName);
    const directHit = args.intent.includedIngredients.some((ingredient) => ingredientNames.some((name) => name.includes(ingredient)));
    const pantryOverlap = ingredientOverlap(recipe, args.pantryIngredientIds);
    const cuisineHit = args.intent.preferredCuisines.length === 0 || (recipe.cuisine ? args.intent.preferredCuisines.includes(recipe.cuisine) : false);

    if (directHit) hits.push({ recipe, retrievalReasons: ['matches requested ingredient'], retrievalChannel: 'direct_ingredient_match' });
    if (cuisineHit) hits.push({ recipe, retrievalReasons: ['matches cuisine and meal style'], retrievalChannel: 'tag_match' });
    if (pantryOverlap >= 0.35) hits.push({ recipe, retrievalReasons: ['efficient with pantry ingredients'], retrievalChannel: 'pantry_efficiency' });
  }

  const diversityTail = records
    .filter((recipe) => !hits.some((candidate) => candidate.recipe.id === recipe.id))
    .slice(0, 10)
    .map((recipe) => ({ recipe, retrievalReasons: ['added for diversity'], retrievalChannel: 'diversity_expansion' as const }));

  return [...hits, ...diversityTail];
};

const scoreImageReadiness = (image: RecipeImage): number => {
  if (image.state === 'ready') return 1;
  if (image.state === 'loading') return 0.4;
  if (image.state === 'fallback') return 0.2;
  return 0;
};

const isSuppressed = (recipe: RecipeRecord, suppression: SuppressionRule[], nowIso: string): { penalty: number; reasons: string[] } => {
  const active = suppression.filter((rule) => rule.activeUntil > nowIso);
  let penalty = 0;
  const reasons: string[] = [];

  for (const rule of active) {
    if (rule.type === 'recipe' && rule.key === recipe.id) {
      penalty += 8 * rule.strength;
      reasons.push('recipe recently rejected');
    }
    if (rule.type === 'cluster' && rule.key === recipe.clusterId) {
      penalty += 6 * rule.strength;
      reasons.push('similar cluster suppressed');
    }
    if (rule.type === 'ingredient' && recipe.normalizedIngredients.some((ingredient) => ingredient.canonicalName.includes(rule.key))) {
      penalty += 7 * rule.strength;
      reasons.push(`suppressed ingredient: ${rule.key}`);
    }
    if (rule.type === 'protein_family' && recipe.proteinTags.some((tag) => tag.includes(rule.key))) {
      penalty += 5 * rule.strength;
      reasons.push(`suppressed protein family: ${rule.key}`);
    }
  }

  return { penalty, reasons };
};

export const rankRecipes = (args: {
  candidates: RetrievalCandidate[];
  intent: MealIntent;
  pantryIngredientIds: IngredientId[];
  exposures: SuggestionExposure[];
  suppressionRules: SuppressionRule[];
  nowIso: string;
}): RankedRecipeScore[] => {
  const recentRecipeIds = new Set(args.exposures.filter((e) => e.action === 'shown').map((e) => e.recipeId));

  return args.candidates.map(({ recipe, retrievalReasons }) => {
    const pantryMatch = ingredientOverlap(recipe, args.pantryIngredientIds) * 4;
    const intentMatch = args.intent.includedIngredients.length
      ? args.intent.includedIngredients.some((token) => recipe.embeddingText.includes(token)) ? 2 : 0
      : 1;
    const dietaryFit = args.intent.dietaryConstraints.includes('vegetarian') && !recipe.dietaryTags.includes('vegetarian') ? -3 : 1;
    const timeFit = args.intent.maxTimeMinutes && (recipe.totalMinutes ?? 999) > args.intent.maxTimeMinutes ? -2 : 1;
    const novelty = recentRecipeIds.has(recipe.id) ? -2 : 1.5;
    const diversityBoost = args.exposures.some((e) => e.cuisine === recipe.cuisine) ? 0 : 1.2;
    const recentPenalty = recentRecipeIds.has(recipe.id) ? 3.8 : 0;
    const suppression = isSuppressed(recipe, args.suppressionRules, args.nowIso);
    const rejectionPenalty = suppression.penalty;
    const repetitionPenalty = args.exposures.some((e) => e.clusterId && e.clusterId === recipe.clusterId) ? 2.4 : 0;
    const imageReadiness = scoreImageReadiness(recipe.image);
    const editorialQuality = (recipe.quality.editorialScore ?? recipe.quality.completenessScore) * 2;
    const total = pantryMatch + intentMatch + dietaryFit + timeFit + novelty + diversityBoost + imageReadiness + editorialQuality - recentPenalty - rejectionPenalty - repetitionPenalty;

    return {
      recipeId: recipe.id,
      total,
      components: {
        pantryMatch,
        intentMatch,
        dietaryFit,
        timeFit,
        novelty,
        diversityBoost,
        recentPenalty,
        rejectionPenalty,
        repetitionPenalty,
        imageReadiness,
        editorialQuality
      },
      explanation: [...retrievalReasons, ...suppression.reasons]
    };
  }).sort((a, b) => b.total - a.total);
};

export const selectVisibleRecipes = (
  ranked: RankedRecipeScore[],
  recipesById: Map<RecipeId, RecipeRecord>,
  count: number
): RankedRecipeScore[] => {
  const selected: RankedRecipeScore[] = [];
  const seenClusters = new Set<string>();
  const seenProteins = new Map<string, number>();
  const seenCuisines = new Map<string, number>();

  for (const item of ranked) {
    const recipe = recipesById.get(item.recipeId);
    if (!recipe) continue;
    const cluster = recipe.clusterId ?? `recipe:${recipe.id}`;
    const protein = recipe.proteinTags[0] ?? 'unknown';
    const cuisine = recipe.cuisine ?? 'unknown';

    if (seenClusters.has(cluster)) continue;
    if ((seenProteins.get(protein) ?? 0) >= 2) continue;
    if ((seenCuisines.get(cuisine) ?? 0) >= 2) continue;

    selected.push(item);
    seenClusters.add(cluster);
    seenProteins.set(protein, (seenProteins.get(protein) ?? 0) + 1);
    seenCuisines.set(cuisine, (seenCuisines.get(cuisine) ?? 0) + 1);

    if (selected.length >= count) break;
  }
  return selected;
};

const buildGuidedStepTitle = (text: string, fallbackIndex: number): string => {
  const firstVerb = ['Prep', 'Cook', 'Simmer', 'Roast', 'Serve', 'Finish'].find((verb) => text.toLowerCase().includes(verb.toLowerCase()));
  if (firstVerb) return firstVerb;
  return `Step ${fallbackIndex + 1}`;
};

export const buildGuidedRecipeView = (recipe: RecipeRecord): GuidedRecipeView => {
  const rawSteps = recipe.instructions ?? [];
  const steps: GuidedRecipeStep[] = rawSteps.map((text, index) => ({
    id: `${recipe.id}-step-${index + 1}`,
    title: buildGuidedStepTitle(text, index),
    body: text,
    ingredientRefs: recipe.ingredients.filter((ingredient) => text.toLowerCase().includes(ingredient.ingredientName.split(' ')[0].toLowerCase())).map((ingredient) => ingredient.ingredientName),
    toolRefs: (recipe.equipment ?? []).filter((tool) => text.toLowerCase().includes(tool.split(' ')[0].toLowerCase()))
  }));

  return {
    recipeId: recipe.id,
    title: recipe.title,
    summary: recipe.description,
    servings: recipe.servings,
    totalMinutes: recipe.totalMinutes,
    activeMinutes: recipe.activeMinutes,
    equipment: recipe.equipment ?? [],
    ingredients: recipe.ingredients,
    prepNotes: recipe.ingredients.filter((ingredient) => ingredient.preparation).map((ingredient) => `${ingredient.ingredientName}: ${ingredient.preparation}`),
    steps,
    finishNotes: ['Taste and adjust seasoning before serving.'],
    substitutions: recipe.normalizedIngredients.slice(0, 2).map((ingredient) => `Swap ${ingredient.canonicalName} with a pantry equivalent when needed.`),
    provenance: recipe.source
  };
};

const toLegacyRecipe = (record: RecipeRecord, nowIso: string): Recipe => {
  const readyImage = record.image.state === 'ready'
    ? { url: record.image.url, kind: record.image.provenance === 'curated' ? 'source_photo' as const : 'ai_generated_realistic_food' as const }
    : buildGeneratedFoodImage(record.title, record.title);

  return {
    id: `recipe-${record.id}`,
    title: record.title,
    description: record.description,
    image: readyImage,
    source: {
      type: 'ai_generated',
      label: 'Outgrow AI planner'
    },
    status: 'draft',
    version: 1,
    servingsDefault: record.servings,
    prepTimeMin: Math.max((record.activeMinutes ?? 0) - 5, 5),
    cookTimeMin: Math.max((record.totalMinutes ?? 20) - (record.activeMinutes ?? 10), 10),
    totalTimeMin: record.totalMinutes,
    ingredients: record.ingredients.map((ingredient, index) => ({
      id: `ing-${index + 1}`,
      rawText: ingredient.rawText,
      itemKey: normalizeIngredientAlias(ingredient.ingredientName),
      displayName: ingredient.ingredientName,
      quantity: ingredient.quantity ?? null,
      unit: ingredient.unit ?? null,
      optional: false
    })),
    instructions: (record.instructions ?? []).map((text, index) => ({ step: index + 1, text })),
    tags: [record.proteinTags[0] ?? 'balanced', record.totalMinutes && record.totalMinutes <= 30 ? 'quick' : 'batch-cook', record.method?.[0] ?? 'skillet'],
    notes: [{ id: `guided-${record.id}`, kind: 'system', text: JSON.stringify(buildGuidedRecipeView(record)) }],
    createdAt: nowIso,
    updatedAt: nowIso
  };
};

export const suggestGroundedRecipe = (args: {
  prompt: string;
  context: RecipeSuggestionSessionContext;
  nowIso: string;
  foodRules?: FoodRules;
  pantryItemKeys?: string[];
  feedback?: { recipe?: Recipe; reasons?: RecipeFeedbackReason[] };
}): { recipe: Recipe; debug: { selectedRecipeId: string; ranking: RankedRecipeScore[]; intent: MealIntent } } => {
  const intent = parseMealIntent(args.prompt, args.foodRules);
  const suppressionRules = buildSuppressionRulesFromContext({
    context: args.context,
    nowIso: args.nowIso,
    foodRules: args.foodRules,
    feedback: args.feedback
  });

  const exposures: SuggestionExposure[] = (args.context.feedbackEvents ?? []).map((event: RecipeFeedbackEvent) => ({
    recipeId: event.recipeId,
    shownAt: event.createdAt,
    action: event.kind === 'reject' ? 'rejected' : 'opened'
  }));

  const pantryIngredientIds = (args.pantryItemKeys ?? []).map(normalizeIngredientAlias);
  const candidates = retrieveCandidates({ intent, pantryIngredientIds });
  const ranked = rankRecipes({
    candidates,
    intent,
    pantryIngredientIds,
    exposures,
    suppressionRules,
    nowIso: args.nowIso
  });

  const recipeMap = new Map(RECIPE_LIBRARY.map((recipe) => [recipe.id, recipe]));
  const visible = selectVisibleRecipes(ranked, recipeMap, 3);
  const avoidRecipeIds = new Set(args.context.recentSuggestedRecipeIds);
  const rotationPool = (visible.length ? visible : ranked).filter((item) => !avoidRecipeIds.has(`recipe-${item.recipeId}`) && !avoidRecipeIds.has(item.recipeId));
  const selectedPool = rotationPool.length ? rotationPool : (visible.length ? visible : ranked);
  const continuityOffset = args.context.sessionRecentTitleSignatures.length % Math.max(selectedPool.length, 1);
  const sessionStartOffset = args.context.iterations === 0
    ? (args.context.recentInitialSuggestionSignatures.length % Math.max(selectedPool.length, 1))
    : 0;
  const selected = selectedPool[(args.context.iterations + sessionStartOffset + continuityOffset) % selectedPool.length] ?? ranked[0];
  const picked = recipeMap.get(selected.recipeId) ?? RECIPE_LIBRARY[0];
  const adapted = intent.maxTimeMinutes && (picked.totalMinutes ?? 999) > intent.maxTimeMinutes
    ? {
        ...picked,
        id: `${picked.id}-adapted-quick`,
        title: `${picked.title} (Quick Adaptation)`,
        source: {
          kind: 'adapted_from_base',
          baseRecipeId: picked.id,
          adaptationSummary: ['Shortened simmer window', 'Reduced prep to one-pan flow']
        } as RecipeSource,
        totalMinutes: intent.maxTimeMinutes,
        instructions: [
          ...(picked.instructions ?? []).slice(0, 2),
          'Finish with a quick reduction and serve immediately.'
        ]
      }
    : picked;
  const titleVariants = ['Weeknight', 'Pantry', 'Fast', 'Cozy', 'Cleanup', 'Balanced', 'Fresh', 'Batch', 'Simple', 'Bright'];
  const variantLabel = titleVariants[(args.context.iterations + continuityOffset) % titleVariants.length];
  const variedRecipe: RecipeRecord = {
    ...adapted,
    id: `${adapted.id}-v${args.context.iterations + 1}`,
    title: `${adapted.title} ${variantLabel}`
  };

  return {
    recipe: toLegacyRecipe(variedRecipe, args.nowIso),
    debug: {
      selectedRecipeId: variedRecipe.id,
      ranking: ranked,
      intent
    }
  };
};

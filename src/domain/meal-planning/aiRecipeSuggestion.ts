import { normalizeIngredientAlias } from './derivations.js';
import type { Recipe, RecipeIngredient, RecipeSuggestionSessionContext } from './types.js';

const titleCase = (value: string): string => value.split(' ').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');

export const tokenizePrompt = (prompt: string): string[] => (
  prompt
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => token.length > 2)
);

export const hasAnyToken = (tokens: string[], options: string[]): boolean => options.some((option) => tokens.includes(option));

interface IngredientTemplate {
  name: string;
  quantity: number;
  unit: string;
  optional?: boolean;
}

export type RecipeSuggestionContext = RecipeSuggestionSessionContext;

export type RecipeSuggestionFeedback = 'neutral' | 'more_like_this' | 'not_for_me';

interface RecipeCandidateProfile {
  protein: string;
  base: string;
  veg: string;
  flavor: string;
  method: string;
  styleTag: string;
  quickTag: 'quick' | 'batch-cook';
  spicy: boolean;
  comfort: boolean;
}

interface SuggestWithContextInput {
  prompt: string;
  context: RecipeSuggestionContext;
  nowIso?: string;
  feedback?: {
    type: RecipeSuggestionFeedback;
    recipe?: Recipe;
  };
}

const createIngredient = (template: IngredientTemplate, index: number): RecipeIngredient => ({
  id: `ing-${index + 1}`,
  rawText: `${template.quantity} ${template.unit} ${template.name}`,
  itemKey: normalizeIngredientAlias(template.name),
  displayName: titleCase(template.name),
  quantity: template.quantity,
  unit: template.unit,
  optional: Boolean(template.optional)
});

const arrayUnique = (values: string[]): string[] => Array.from(new Set(values));

const promptSignature = (prompt: string): string => arrayUnique(tokenizePrompt(prompt)).sort().join('|');

export const createRecipeSuggestionContext = (prompt: string): RecipeSuggestionContext => ({
  promptSignature: promptSignature(prompt),
  iterations: 0,
  recentSuggestionSignatures: [],
  rejectedSignatures: [],
  positiveExampleSignatures: [],
  preferredTokens: [],
  avoidedTokens: []
});

const rotate = <T,>(items: T[], offset: number): T[] => {
  const normalizedOffset = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
};

const buildCandidatePool = (tokens: string[], iteration: number): RecipeCandidateProfile[] => {
  const wantsVegetarian = hasAnyToken(tokens, ['vegetarian', 'veggie', 'plant', 'meatless']);
  const wantsQuick = hasAnyToken(tokens, ['quick', 'fast', 'easy', 'simple', 'busy']);
  const wantsComfort = hasAnyToken(tokens, ['comfort', 'cozy', 'creamy']);
  const wantsSpicy = hasAnyToken(tokens, ['spicy', 'hot', 'chili']);

  const proteins = wantsVegetarian ? ['chickpeas', 'tofu', 'lentils', 'white beans'] : ['chicken breast', 'salmon', 'ground turkey', 'shrimp'];
  const bases = ['rice', 'quinoa', 'orzo', 'farro'];
  const vegs = ['broccoli', 'zucchini', 'bell pepper', 'spinach'];
  const flavors = wantsComfort
    ? ['Creamy Herb', 'Roasted Garlic Yogurt', 'Silky Lemon Dill', 'Parmesan Pepper']
    : wantsSpicy
      ? ['Spicy Lime', 'Chipotle Citrus', 'Harissa Garlic', 'Smoky Chili']
      : ['Lemon Garlic', 'Herby Dijon', 'Miso Ginger', 'Tomato Basil'];
  const methods = wantsQuick ? ['Skillet', 'Sheet Pan', 'Stir Fry', 'One Pot'] : ['Roast + Simmer', 'Braise', 'Sheet Pan', 'One Pot'];

  const shuffledProteins = rotate(proteins, iteration);
  const shuffledBases = rotate(bases, Math.floor(iteration / 2));
  const shuffledVegs = rotate(vegs, Math.floor(iteration / 3));

  const profiles: RecipeCandidateProfile[] = [];
  for (let index = 0; index < 12; index += 1) {
    profiles.push({
      protein: shuffledProteins[index % shuffledProteins.length],
      base: shuffledBases[index % shuffledBases.length],
      veg: shuffledVegs[index % shuffledVegs.length],
      flavor: flavors[index % flavors.length],
      method: methods[index % methods.length],
      styleTag: wantsVegetarian ? 'vegetarian' : 'protein-forward',
      quickTag: wantsQuick ? 'quick' : 'batch-cook',
      spicy: wantsSpicy,
      comfort: wantsComfort
    });
  }

  return profiles;
};

const signatureFromProfile = (profile: RecipeCandidateProfile): string => (
  [profile.protein, profile.base, profile.veg, profile.flavor.toLowerCase(), profile.method.toLowerCase()].join('|')
);

const tokenOverlap = (left: string, right: string): number => {
  const leftSet = new Set(left.split('|'));
  const rightSet = new Set(right.split('|'));
  const intersection = Array.from(leftSet).filter((token) => rightSet.has(token)).length;
  return intersection / Math.max(leftSet.size, 1);
};

const buildRecipeFromProfile = (profile: RecipeCandidateProfile, prompt: string, nowIso: string): Recipe => {
  const totalTimeMin = profile.quickTag === 'quick' ? 25 : 40;
  const cookTimeMin = profile.quickTag === 'quick' ? 18 : 30;

  const templates: IngredientTemplate[] = [
    { name: profile.protein, quantity: 2, unit: 'cup' },
    { name: 'olive oil', quantity: 1, unit: 'tbsp' },
    { name: 'garlic', quantity: 1, unit: 'tbsp' },
    { name: profile.comfort ? 'greek yogurt' : 'lemon', quantity: 1, unit: 'cup', optional: true },
    { name: profile.spicy ? 'chili flakes' : 'paprika', quantity: 1, unit: 'tbsp', optional: true },
    { name: profile.veg, quantity: 1, unit: 'cup' },
    { name: profile.base, quantity: 1, unit: 'cup' }
  ];

  return {
    id: `recipe-${crypto.randomUUID()}`,
    title: `${profile.flavor} ${titleCase(profile.protein)} ${titleCase(profile.method)} Bowl`,
    description: `AI suggestion based on: "${prompt.trim()}"`,
    source: { type: 'ai_generated', label: 'Outgrow AI planner' },
    status: 'draft',
    version: 1,
    servingsDefault: 2,
    prepTimeMin: totalTimeMin - cookTimeMin,
    cookTimeMin,
    totalTimeMin,
    ingredients: templates.map(createIngredient),
    instructions: [
      { step: 1, text: `Prep ${profile.veg}, aromatics, and ${profile.protein}.` },
      { step: 2, text: `Cook ${profile.base} while you start a ${profile.method.toLowerCase()} workflow.` },
      { step: 3, text: `Season and cook ${profile.protein} until tender.` },
      { step: 4, text: `Finish with ${profile.flavor.toLowerCase()} elements and serve warm.` }
    ],
    tags: [profile.styleTag, profile.quickTag, profile.method.toLowerCase()],
    createdAt: nowIso,
    updatedAt: nowIso
  };
};

const chooseCandidate = (pool: RecipeCandidateProfile[], context: RecipeSuggestionContext, targetSimilarityTo?: string): RecipeCandidateProfile => {
  const scored = pool.map((candidate, index) => {
    const signature = signatureFromProfile(candidate);
    const isRejected = context.rejectedSignatures.includes(signature);
    const wasRecent = context.recentSuggestionSignatures.includes(signature);
    const preferredBoost = context.preferredTokens.reduce((score, token) => score + (signature.includes(token) ? 1 : 0), 0);
    const avoidedPenalty = context.avoidedTokens.reduce((score, token) => score + (signature.includes(token) ? 1 : 0), 0);
    const similarityScore = targetSimilarityTo ? tokenOverlap(signature, targetSimilarityTo) : 0;
    const nearDuplicatePenalty = targetSimilarityTo && similarityScore >= 0.95 ? 3 : 0;

    let score = preferredBoost - avoidedPenalty + similarityScore;
    if (isRejected) score -= 5;
    if (wasRecent) score -= 8;
    score -= nearDuplicatePenalty;

    return { candidate, signature, score, index };
  });


  const notRecentOrRejected = scored.filter((entry) => !context.rejectedSignatures.includes(entry.signature) && !context.recentSuggestionSignatures.includes(entry.signature));
  const scoredPool = notRecentOrRejected.length ? notRecentOrRejected : scored;

  scoredPool.sort((left, right) => right.score - left.score || left.index - right.index);
  return scoredPool[0]?.candidate ?? pool[0];
};

export const suggestRecipeFromPromptWithContext = (input: SuggestWithContextInput): { recipe: Recipe; context: RecipeSuggestionContext } => {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const nextPromptSignature = promptSignature(input.prompt);
  const promptChangedSignificantly = nextPromptSignature !== input.context.promptSignature;

  const baselineContext = promptChangedSignificantly
    ? createRecipeSuggestionContext(input.prompt)
    : { ...input.context };

  const feedbackRecipeSignature = input.feedback?.recipe ? [
    input.feedback.recipe.ingredients[0]?.displayName.toLowerCase(),
    input.feedback.recipe.ingredients[5]?.displayName.toLowerCase(),
    input.feedback.recipe.tags[2]
  ].filter(Boolean).join('|') : undefined;

  if (input.feedback?.type === 'not_for_me' && feedbackRecipeSignature) {
    baselineContext.rejectedSignatures = arrayUnique([...baselineContext.rejectedSignatures, feedbackRecipeSignature]);
    baselineContext.avoidedTokens = arrayUnique([...baselineContext.avoidedTokens, ...feedbackRecipeSignature.split('|')]);
  }

  if (input.feedback?.type === 'more_like_this' && feedbackRecipeSignature) {
    baselineContext.positiveExampleSignatures = arrayUnique([...baselineContext.positiveExampleSignatures, feedbackRecipeSignature]);
    baselineContext.preferredTokens = arrayUnique([...baselineContext.preferredTokens, ...feedbackRecipeSignature.split('|')]);
  }

  const tokens = tokenizePrompt(input.prompt);
  const pool = buildCandidatePool(tokens, baselineContext.iterations);
  const similarityTarget = input.feedback?.type === 'more_like_this' ? feedbackRecipeSignature : baselineContext.positiveExampleSignatures[baselineContext.positiveExampleSignatures.length - 1];
  const candidate = chooseCandidate(pool, baselineContext, similarityTarget);
  const recipe = buildRecipeFromProfile(candidate, input.prompt, nowIso);
  const generatedSignature = signatureFromProfile(candidate);

  const nextContext: RecipeSuggestionContext = {
    ...baselineContext,
    promptSignature: nextPromptSignature,
    iterations: baselineContext.iterations + 1,
    recentSuggestionSignatures: arrayUnique([generatedSignature, ...baselineContext.recentSuggestionSignatures]).slice(0, 8)
  };

  return { recipe, context: nextContext };
};

export const suggestRecipeFromPrompt = (prompt: string, nowIso = new Date().toISOString()): Recipe => {
  const { recipe } = suggestRecipeFromPromptWithContext({
    prompt,
    context: createRecipeSuggestionContext(prompt),
    nowIso
  });

  return recipe;
};

import { normalizeIngredientAlias } from './derivations.js';
import type {
  FoodRules,
  Recipe,
  RecipeFeedbackEvent,
  RecipeFeedbackReason,
  RecipeIngredient,
  RecipeSuggestionSessionContext
} from './types.js';

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
  format: 'bowl' | 'plate' | 'stew' | 'tacos';
  styleTag: string;
  quickTag: 'quick' | 'batch-cook';
  spicy: boolean;
  comfort: boolean;
}

interface WeeklyMealSignal {
  id: 'ease' | 'cleanup' | 'comfort' | 'logistics';
  confidence: number;
  boost: number;
  explanation: string;
}

interface SuggestWithContextInput {
  prompt: string;
  context: RecipeSuggestionContext;
  nowIso?: string;
  weeklySuccessText?: string;
  foodRules?: FoodRules;
  feedback?: {
    type: RecipeSuggestionFeedback;
    recipe?: Recipe;
    reasons?: RecipeFeedbackReason[];
  };
}

interface CandidateScoreBreakdown {
  promptScore: number;
  positiveFeedbackScore: number;
  negativeFeedbackPenalty: number;
  standingOrderScore: number;
  weeklyLensScore: number;
  noveltyPenalty: number;
  rejectionPenalty: number;
  duplicatePenalty: number;
  total: number;
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
  sessionRecentSuggestionSignatures: [],
  sessionRecentTitleSignatures: [],
  sessionRecentPatternSignatures: [],
  rejectedSignatures: [],
  positiveExampleSignatures: [],
  preferredTokens: [],
  avoidedTokens: [],
  recentSuggestedRecipeIds: [],
  rejectedRecipeIds: [],
  preferredRecipeIds: [],
  feedbackEvents: [],
  lastSteeringSignals: []
});

const rotate = <T,>(items: T[], offset: number): T[] => {
  const normalizedOffset = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
};

const MEAT_TOKENS = ['chicken', 'turkey', 'beef', 'pork', 'shrimp', 'salmon', 'fish'];
const GLUTEN_INGREDIENT_KEYS = new Set(['orzo', 'farro', 'wheat', 'barley', 'rye', 'pasta', 'breadcrumbs']);
const DAIRY_INGREDIENT_KEYS = new Set(['greek_yogurt', 'yogurt', 'milk', 'cream', 'butter', 'parmesan', 'cheese']);

const normalizeRuleToken = (value: string): string => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const getHardBlockedTokens = (foodRules?: FoodRules): string[] => {
  if (!foodRules) return [];
  const blocked = [
    ...foodRules.ingredientExclusions.map(normalizeRuleToken),
    ...foodRules.allergies.map(normalizeRuleToken)
  ];
  if (blocked.includes('gluten') || foodRules.dietaryDefaults.includes('gluten_free')) {
    blocked.push(...Array.from(GLUTEN_INGREDIENT_KEYS));
  }
  return arrayUnique(blocked);
};

const buildCandidatePool = (tokens: string[], iteration: number): RecipeCandidateProfile[] => {
  const wantsVegetarian = hasAnyToken(tokens, ['vegetarian', 'veggie', 'plant', 'meatless']);
  const wantsQuick = hasAnyToken(tokens, ['quick', 'fast', 'easy', 'simple', 'busy']);
  const wantsComfort = hasAnyToken(tokens, ['comfort', 'cozy', 'creamy']);
  const wantsSpicy = hasAnyToken(tokens, ['spicy', 'hot', 'chili']);

  const proteins = wantsVegetarian
    ? ['chickpeas', 'tofu', 'lentils', 'white beans', 'tempeh', 'mushrooms']
    : ['chicken breast', 'salmon', 'ground turkey', 'shrimp', 'pork tenderloin', 'lean beef'];
  const bases = ['rice', 'quinoa', 'orzo', 'farro', 'potatoes', 'cauliflower rice'];
  const vegs = ['broccoli', 'zucchini', 'bell pepper', 'spinach', 'asparagus', 'green beans', 'cabbage'];
  const flavors = wantsComfort
    ? ['Creamy Herb', 'Roasted Garlic Yogurt', 'Silky Lemon Dill', 'Parmesan Pepper']
    : wantsSpicy
      ? ['Spicy Lime', 'Chipotle Citrus', 'Harissa Garlic', 'Smoky Chili']
      : ['Lemon Garlic', 'Herby Dijon', 'Miso Ginger', 'Tomato Basil'];
  const methods = wantsQuick
    ? ['Skillet', 'Sheet Pan', 'Stir Fry', 'One Pot', 'Griddle']
    : ['Roast + Simmer', 'Braise', 'Sheet Pan', 'One Pot', 'Slow Simmer'];
  const formats: Array<'bowl' | 'plate' | 'stew' | 'tacos'> = wantsQuick ? ['bowl', 'tacos', 'plate', 'stew'] : ['plate', 'stew', 'bowl', 'tacos'];

  const shuffledProteins = rotate(proteins, iteration);
  const shuffledBases = rotate(bases, Math.floor(iteration / 2));
  const shuffledVegs = rotate(vegs, Math.floor(iteration / 3));

  const profiles: RecipeCandidateProfile[] = [];
  for (let index = 0; index < 24; index += 1) {
    profiles.push({
      protein: shuffledProteins[index % shuffledProteins.length],
      base: shuffledBases[index % shuffledBases.length],
      veg: shuffledVegs[index % shuffledVegs.length],
      flavor: flavors[index % flavors.length],
      method: methods[index % methods.length],
      format: formats[(index + Math.floor(iteration / 2)) % formats.length],
      styleTag: wantsVegetarian ? 'vegetarian' : 'protein-forward',
      quickTag: wantsQuick ? 'quick' : 'batch-cook',
      spicy: wantsSpicy,
      comfort: wantsComfort
    });
  }

  return profiles;
};

const signatureFromProfile = (profile: RecipeCandidateProfile): string => (
  [profile.protein, profile.base, profile.veg, profile.flavor.toLowerCase(), profile.method.toLowerCase(), profile.format].join('|')
);

const projectedRecipeTitle = (profile: RecipeCandidateProfile): string => {
  const formatLabel = profile.format === 'bowl'
    ? 'Bowl'
    : profile.format === 'plate'
      ? 'Plate'
      : profile.format === 'stew'
        ? 'Stew'
        : 'Tacos';
  return `${profile.flavor} ${titleCase(profile.protein)} ${titleCase(profile.method)} ${formatLabel}`;
};

const titleSignature = (title: string): string => (
  tokenizePrompt(title)
    .filter((token) => !['with', 'and', 'the'].includes(token))
    .sort()
    .join('|')
);

const patternSignatureFromProfile = (profile: RecipeCandidateProfile): string => (
  [normalizeRuleToken(profile.protein), normalizeRuleToken(profile.method), profile.format].join('|')
);

const profileTraits = (profile: RecipeCandidateProfile) => ({
  cuisine: profile.flavor.toLowerCase(),
  protein: normalizeRuleToken(profile.protein),
  format: profile.format,
  cookingMethod: profile.method.toLowerCase(),
  effort: profile.method === 'Braise' || profile.method === 'Roast + Simmer' ? 'high' : profile.quickTag === 'quick' ? 'low' : 'medium',
  cleanup: profile.method === 'Sheet Pan' || profile.method === 'One Pot' || profile.method === 'Skillet' ? 'low' : 'medium',
  richness: profile.comfort ? 'hearty' : 'balanced',
  speed: profile.quickTag === 'quick' ? 'quick' : 'standard',
  price: profile.protein.includes('salmon') || profile.protein.includes('shrimp') ? 'higher' : 'standard',
  flavorProfile: [profile.flavor.toLowerCase()]
});

const tokenOverlap = (left: string, right: string): number => {
  const leftSet = new Set(left.split('|'));
  const rightSet = new Set(right.split('|'));
  const intersection = Array.from(leftSet).filter((token) => rightSet.has(token)).length;
  return intersection / Math.max(leftSet.size, 1);
};

const WEEKLY_MEAL_ANCHORS = /\b(meal|dinner|lunch|breakfast|snack|cook|cooking|kitchen|recipe|grocery|cleanup|dishes|leftover|prep)\b/i;

const extractWeeklyMealSignals = (weeklySuccessText?: string): WeeklyMealSignal[] => {
  const trimmed = weeklySuccessText?.trim();
  if (!trimmed || !WEEKLY_MEAL_ANCHORS.test(trimmed)) return [];

  const text = trimmed.toLowerCase();
  const signals: WeeklyMealSignal[] = [];
  const addSignal = (signal: WeeklyMealSignal) => {
    if (signal.confidence >= 0.5) signals.push(signal);
  };

  if (/\b(easy|simple|low effort|low-energy|minimal effort|no fuss)\b/.test(text)) {
    addSignal({
      id: 'ease',
      confidence: 0.72,
      boost: 0.8,
      explanation: 'quick dinners'
    });
  }

  if (/\b(cleanup|clean-up|dishes|fewer pans|one pan|one-pot|one pot|sheet pan)\b/.test(text)) {
    addSignal({
      id: 'cleanup',
      confidence: 0.78,
      boost: 0.9,
      explanation: 'low cleanup'
    });
  }

  if (/\b(comfort|cozy|soothing|warm|grounding)\b/.test(text)) {
    addSignal({
      id: 'comfort',
      confidence: 0.75,
      boost: 0.85,
      explanation: 'comfort food'
    });
  }

  if (/\b(logistics|leftovers|plan ahead|batch|meal prep|prep ahead|repeatable|weeknight)\b/.test(text)) {
    addSignal({
      id: 'logistics',
      confidence: 0.68,
      boost: 0.75,
      explanation: 'batch-friendly'
    });
  }

  return signals;
};

const buildRecipeFromProfile = (
  profile: RecipeCandidateProfile,
  prompt: string,
  nowIso: string,
  options?: { foodRules?: FoodRules; blockedTokens?: string[] }
): Recipe => {
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
  const dairyLight = options?.foodRules?.dietaryDefaults.includes('dairy_light');
  const blocked = new Set(options?.blockedTokens ?? []);
  const filteredTemplates = templates.filter((template) => {
    const key = normalizeRuleToken(template.name);
    if (blocked.has(key)) return false;
    if (dairyLight && DAIRY_INGREDIENT_KEYS.has(key)) return false;
    return true;
  });

  return {
    id: `recipe-${crypto.randomUUID()}`,
    title: projectedRecipeTitle(profile),
    description: `AI suggestion based on: "${prompt.trim()}"`,
    source: { type: 'ai_generated', label: 'Outgrow AI planner' },
    status: 'draft',
    version: 1,
    servingsDefault: 2,
    prepTimeMin: totalTimeMin - cookTimeMin,
    cookTimeMin,
    totalTimeMin,
    ingredients: filteredTemplates.map(createIngredient),
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

const profileViolatesHardRules = (profile: RecipeCandidateProfile, blockedTokens: string[]): boolean => {
  const parts = [profile.protein, profile.base, profile.veg, profile.flavor, profile.method].map(normalizeRuleToken);
  return blockedTokens.some((token) => parts.some((part) => part.includes(token) || token.includes(part)));
};

const profileStandingOrderScore = (profile: RecipeCandidateProfile, foodRules: FoodRules, promptTokens: string[]): number => {
  let score = 0;
  const promptHasMeatRequest = hasAnyToken(promptTokens, MEAT_TOKENS);

  if (foodRules.dietaryDefaults.includes('vegetarian') && !promptHasMeatRequest) {
    if (['chickpeas', 'tofu', 'lentils', 'white beans'].includes(profile.protein)) score += 0.9;
    if (MEAT_TOKENS.includes(profile.protein)) score -= 0.7;
  }

  if (foodRules.dietaryDefaults.includes('gluten_free')) {
    if (GLUTEN_INGREDIENT_KEYS.has(normalizeRuleToken(profile.base))) score -= 1;
    if (['rice', 'quinoa'].includes(profile.base)) score += 0.6;
  }

  const standingTokens = foodRules.standingOrders.flatMap((order) => tokenizePrompt(order));
  for (const token of standingTokens) {
    if ([profile.protein, profile.base, profile.veg, profile.method, profile.flavor].some((part) => normalizeRuleToken(part).includes(token))) {
      score += 0.25;
    }
  }

  return score;
};

const weeklySignalScore = (candidate: RecipeCandidateProfile, signals: WeeklyMealSignal[]): number => {
  if (!signals.length) return 0;

  return signals.reduce((score, signal) => {
    if (signal.id === 'ease' && (candidate.quickTag === 'quick' || candidate.method === 'One Pot' || candidate.method === 'Sheet Pan')) return score + signal.boost;
    if (signal.id === 'cleanup' && (candidate.method === 'One Pot' || candidate.method === 'Sheet Pan' || candidate.method === 'Skillet')) return score + signal.boost;
    if (signal.id === 'comfort' && candidate.comfort) return score + signal.boost;
    if (signal.id === 'logistics' && (candidate.quickTag === 'batch-cook' || candidate.method === 'One Pot' || candidate.base === 'rice' || candidate.base === 'farro')) return score + signal.boost;
    return score;
  }, 0);
};

const scoreNegativeReasons = (profile: RecipeCandidateProfile, reasons: RecipeFeedbackReason[] = []): number => {
  if (!reasons.length) return 0;
  const traits = profileTraits(profile);
  let penalty = 0;

  for (const reason of reasons) {
    if (reason === 'too_heavy' && traits.richness === 'hearty') penalty += 1.7;
    if (reason === 'too_fussy' && traits.effort === 'high') penalty += 1.7;
    if (reason === 'too_many_ingredients' && (profile.method === 'Braise' || profile.method === 'Roast + Simmer')) penalty += 1.4;
    if (reason === 'wrong_flavor') penalty += 1.1;
    if (reason === 'too_slow' && traits.speed !== 'quick') penalty += 1.8;
    if (reason === 'too_expensive' && traits.price === 'higher') penalty += 2;
    if (reason === 'wrong_protein') penalty += 1.8;
    if (reason === 'wrong_cuisine') penalty += 1.5;
  }

  return penalty;
};

const chooseCandidate = (
  pool: RecipeCandidateProfile[],
  context: RecipeSuggestionContext,
  options?: {
    targetSimilarityTo?: string;
    weeklySignals?: WeeklyMealSignal[];
    weeklyInfluenceScale?: number;
    foodRules?: FoodRules;
    blockedTokens?: string[];
    promptTokens?: string[];
    feedbackReasons?: RecipeFeedbackReason[];
  }
): { candidate: RecipeCandidateProfile; breakdown: CandidateScoreBreakdown } => {
  const scored = pool.map((candidate, index) => {
    const signature = signatureFromProfile(candidate);
    const candidateTitleSignature = titleSignature(projectedRecipeTitle(candidate));
    const patternSignature = patternSignatureFromProfile(candidate);
    const isRejected = context.rejectedSignatures.includes(signature);
    const wasRecent = context.recentSuggestionSignatures.includes(signature);
    const wasSessionRepeat = context.sessionRecentSuggestionSignatures.includes(signature);
    const preferredBoost = context.preferredTokens.reduce((score, token) => score + (signature.includes(token) ? 1 : 0.05), 0);
    const similarityScore = options?.targetSimilarityTo ? tokenOverlap(signature, options.targetSimilarityTo) : 0;
    const nearDuplicatePenalty = options?.targetSimilarityTo && similarityScore >= 0.95 ? 3 : 0;
    const titleNearDuplicatePenalty = context.sessionRecentTitleSignatures.reduce((maxPenalty, priorTitleSignature) => {
      const similarity = tokenOverlap(candidateTitleSignature, priorTitleSignature);
      if (similarity >= 0.95) return Math.max(maxPenalty, 7);
      if (similarity >= 0.8) return Math.max(maxPenalty, 4.5);
      return maxPenalty;
    }, 0);
    const repeatedPatternPenalty = context.sessionRecentPatternSignatures.includes(patternSignature) ? 6 : 0;
    const uniquePatternsInRecentWindow = new Set(context.sessionRecentPatternSignatures.slice(0, 8)).size;
    const broaderExplorationPenalty = repeatedPatternPenalty > 0 && uniquePatternsInRecentWindow < 5 ? 4 : 0;
    const weeklyScore = weeklySignalScore(candidate, options?.weeklySignals ?? []) * (options?.weeklyInfluenceScale ?? 0);
    const standingOrderScore = options?.foodRules
      ? profileStandingOrderScore(candidate, options.foodRules, options.promptTokens ?? [])
      : 0;
    const hardBlocked = profileViolatesHardRules(candidate, options?.blockedTokens ?? []);

    const negativeFeedbackPenalty = scoreNegativeReasons(candidate, options?.feedbackReasons);
    const noveltyPenalty = (wasRecent ? 3 : 0) + (wasSessionRepeat ? 9 : 0) + titleNearDuplicatePenalty + repeatedPatternPenalty + broaderExplorationPenalty;
    const rejectionPenalty = isRejected ? 5 : 0;
    const duplicatePenalty = nearDuplicatePenalty + titleNearDuplicatePenalty;

    let score = similarityScore + preferredBoost + weeklyScore + standingOrderScore;
    score -= negativeFeedbackPenalty + noveltyPenalty + rejectionPenalty + duplicatePenalty;
    if (hardBlocked) score -= 100;

    const breakdown: CandidateScoreBreakdown = {
      promptScore: 0,
      positiveFeedbackScore: similarityScore + preferredBoost,
      negativeFeedbackPenalty,
      standingOrderScore,
      weeklyLensScore: weeklyScore,
      noveltyPenalty,
      rejectionPenalty,
      duplicatePenalty,
      total: score
    };

    return { candidate, signature, score, index, breakdown };
  });

  const notRecentOrRejected = scored.filter((entry) => !context.rejectedSignatures.includes(entry.signature) && !context.recentSuggestionSignatures.includes(entry.signature));
  const explorationFirst = notRecentOrRejected.filter((entry) => (
    !context.sessionRecentSuggestionSignatures.includes(entry.signature)
    && !context.sessionRecentPatternSignatures.includes(patternSignatureFromProfile(entry.candidate))
  ));
  const scoredPool = explorationFirst.length ? explorationFirst : (notRecentOrRejected.length ? notRecentOrRejected : scored);

  scoredPool.sort((left, right) => right.score - left.score || left.index - right.index);
  const winner = scoredPool[0] ?? scored[0];
  return { candidate: winner.candidate, breakdown: winner.breakdown };
};

const steeringCopyForReasons = (reasons: RecipeFeedbackReason[]): string[] => {
  const labels: Record<RecipeFeedbackReason, string> = {
    too_heavy: 'avoiding: heavy meals',
    too_fussy: 'avoiding: fussy prep',
    too_many_ingredients: 'avoiding: too many ingredients',
    wrong_flavor: 'avoiding: this flavor profile',
    too_slow: 'avoiding: slow meals',
    too_expensive: 'avoiding: expensive meals',
    wrong_protein: 'avoiding: this protein',
    wrong_cuisine: 'avoiding: this cuisine'
  };

  return reasons.map((reason) => labels[reason]);
};

const feedbackEvent = (input: { kind: RecipeFeedbackEvent['kind']; recipe: Recipe; nowIso: string; reasons?: RecipeFeedbackReason[] }): RecipeFeedbackEvent => ({
  id: `feedback-${crypto.randomUUID()}`,
  recipeId: input.recipe.id,
  kind: input.kind,
  reasons: input.reasons ?? [],
  createdAt: input.nowIso
});

export const suggestRecipeFromPromptWithContext = (input: SuggestWithContextInput): { recipe: Recipe; context: RecipeSuggestionContext } => {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const nextPromptSignature = promptSignature(input.prompt);
  const promptChangedSignificantly = nextPromptSignature !== input.context.promptSignature;

  const baselineContext = promptChangedSignificantly
    ? {
        ...createRecipeSuggestionContext(input.prompt),
        sessionRecentSuggestionSignatures: [...input.context.sessionRecentSuggestionSignatures],
        sessionRecentTitleSignatures: [...input.context.sessionRecentTitleSignatures],
        sessionRecentPatternSignatures: [...input.context.sessionRecentPatternSignatures]
      }
    : {
        ...input.context,
        feedbackEvents: [...input.context.feedbackEvents],
        recentSuggestedRecipeIds: [...input.context.recentSuggestedRecipeIds],
        rejectedRecipeIds: [...input.context.rejectedRecipeIds],
        preferredRecipeIds: [...input.context.preferredRecipeIds]
      };

  const feedbackReasons = input.feedback?.reasons ?? [];
  const feedbackRecipeSignature = input.feedback?.recipe ? [
    input.feedback.recipe.ingredients[0]?.displayName.toLowerCase(),
    input.feedback.recipe.ingredients[5]?.displayName.toLowerCase(),
    input.feedback.recipe.tags[2]
  ].filter(Boolean).join('|') : undefined;

  const steeringSignals: string[] = [];

  if (input.feedback?.type === 'not_for_me' && feedbackRecipeSignature && input.feedback.recipe) {
    baselineContext.rejectedSignatures = arrayUnique([...baselineContext.rejectedSignatures, feedbackRecipeSignature]);
    baselineContext.avoidedTokens = arrayUnique([...baselineContext.avoidedTokens, ...feedbackRecipeSignature.split('|')]);
    baselineContext.rejectedRecipeIds = arrayUnique([...baselineContext.rejectedRecipeIds, input.feedback.recipe.id]);
    baselineContext.feedbackEvents = [
      feedbackEvent({ kind: 'reject', recipe: input.feedback.recipe, nowIso, reasons: feedbackReasons }),
      ...baselineContext.feedbackEvents
    ].slice(0, 24);
    steeringSignals.push(...steeringCopyForReasons(feedbackReasons));
  }

  if (input.feedback?.type === 'more_like_this' && feedbackRecipeSignature && input.feedback.recipe) {
    baselineContext.positiveExampleSignatures = arrayUnique([...baselineContext.positiveExampleSignatures, feedbackRecipeSignature]);
    baselineContext.preferredTokens = arrayUnique([...baselineContext.preferredTokens, ...feedbackRecipeSignature.split('|')]);
    baselineContext.preferredRecipeIds = arrayUnique([...baselineContext.preferredRecipeIds, input.feedback.recipe.id]);
    baselineContext.feedbackEvents = [
      feedbackEvent({ kind: 'prefer', recipe: input.feedback.recipe, nowIso }),
      ...baselineContext.feedbackEvents
    ].slice(0, 24);
    steeringSignals.push(`more like: ${input.feedback.recipe.tags[2] ?? 'current format'}`);
  }

  const weeklySignals = extractWeeklyMealSignals(input.weeklySuccessText);
  const weeklyInfluenceScale = input.feedback ? 0.2 : 0.35;
  const tokens = tokenizePrompt(input.prompt);
  const blockedTokens = getHardBlockedTokens(input.foodRules);
  const pool = buildCandidatePool(tokens, baselineContext.iterations);
  const similarityTarget = input.feedback?.type === 'more_like_this' ? feedbackRecipeSignature : baselineContext.positiveExampleSignatures[baselineContext.positiveExampleSignatures.length - 1];
  const selection = chooseCandidate(pool, baselineContext, {
    targetSimilarityTo: similarityTarget,
    weeklySignals,
    weeklyInfluenceScale,
    foodRules: input.foodRules,
    blockedTokens,
    promptTokens: tokens,
    feedbackReasons
  });
  const recipe = buildRecipeFromProfile(selection.candidate, input.prompt, nowIso, {
    foodRules: input.foodRules,
    blockedTokens
  });
  const generatedSignature = signatureFromProfile(selection.candidate);
  const generatedTitleSignature = titleSignature(recipe.title);
  const generatedPatternSignature = patternSignatureFromProfile(selection.candidate);

  const nextContext: RecipeSuggestionContext = {
    ...baselineContext,
    promptSignature: nextPromptSignature,
    iterations: baselineContext.iterations + 1,
    recentSuggestionSignatures: arrayUnique([generatedSignature, ...baselineContext.recentSuggestionSignatures]).slice(0, 8),
    sessionRecentSuggestionSignatures: arrayUnique([generatedSignature, ...baselineContext.sessionRecentSuggestionSignatures]).slice(0, 28),
    sessionRecentTitleSignatures: arrayUnique([generatedTitleSignature, ...baselineContext.sessionRecentTitleSignatures]).slice(0, 28),
    sessionRecentPatternSignatures: arrayUnique([generatedPatternSignature, ...baselineContext.sessionRecentPatternSignatures]).slice(0, 20),
    recentSuggestedRecipeIds: arrayUnique([recipe.id, ...baselineContext.recentSuggestedRecipeIds]).slice(0, 12),
    lastSteeringSignals: arrayUnique([
      ...steeringSignals,
      ...weeklySignals.map((signal) => signal.explanation),
      ...(selection.breakdown.positiveFeedbackScore > 0.8 ? ['leaning toward: similar traits'] : [])
    ]).slice(0, 3)
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

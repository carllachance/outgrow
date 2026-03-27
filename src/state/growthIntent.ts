import type { SupportTier } from '../types';

const stopWords = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'into', 'your', 'you', 'when', 'what', 'have',
  'will', 'just', 'about', 'they', 'them', 'then', 'than', 'want', 'need', 'been', 'without', 'while',
  'should', 'could', 'would', 'over', 'under', 'through', 'where', 'after', 'before', 'around', 'right'
]);

const normalizeTokens = (value: string) => value
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .map((token) => token.trim())
  .filter((token) => token.length > 2 && !stopWords.has(token));

const uniqueTokens = (value: string) => Array.from(new Set(normalizeTokens(value)));

export interface GrowthIntentInput {
  goalText: string;
  planHighlights: string[];
  optionalNarrative: string;
  supportTier: SupportTier;
}

interface LegacyOnboardingLike {
  longHorizon?: string;
  weeklyLens?: string;
  currentFocus?: string;
  optionalNarrative?: string;
  supportTier?: SupportTier;
}

const normalizeInput = (input: GrowthIntentInput | LegacyOnboardingLike): GrowthIntentInput => ({
  goalText: 'goalText' in input ? input.goalText ?? '' : input.longHorizon ?? '',
  planHighlights: 'planHighlights' in input
    ? input.planHighlights ?? []
    : [input.currentFocus ?? '', input.weeklyLens ?? ''].filter(Boolean),
  optionalNarrative: input.optionalNarrative ?? '',
  supportTier: input.supportTier ?? 'Maintenance'
});

export const buildGrowthIntentNarrative = (input: GrowthIntentInput | LegacyOnboardingLike): string => {
  const normalizedInput = normalizeInput(input);
  return (
  [
    normalizedInput.goalText,
    normalizedInput.optionalNarrative,
    ...normalizedInput.planHighlights
  ]
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join('. ')
  );
};

export const growthIntentAnchor = (input: GrowthIntentInput | LegacyOnboardingLike): string => {
  const normalizedInput = normalizeInput(input);
  return normalizedInput.goalText.trim() || 'I know I’ve outgrown this app when I can make steady choices and keep going.';
};

export const scoreGrowthIntentAlignment = (candidate: string, input: GrowthIntentInput | LegacyOnboardingLike): number => {
  const intentTokens = uniqueTokens(buildGrowthIntentNarrative(input));
  if (!intentTokens.length) return 0;
  const candidateTokens = new Set(uniqueTokens(candidate));
  const overlap = intentTokens.reduce((count, token) => count + (candidateTokens.has(token) ? 1 : 0), 0);
  return overlap / intentTokens.length;
};

export const growthIntentSupportLine = (input: GrowthIntentInput | LegacyOnboardingLike): string => {
  const anchor = growthIntentAnchor(input);
  return `Goal: ${anchor}`;
};

type SupportTone = 'gentle' | 'stretch' | 'teach' | 'simple';

const supportToneByTier: Record<SupportTier, SupportTone> = {
  Active: 'teach',
  Maintenance: 'gentle',
  'Just in Case': 'simple'
};

export const supportTone = (supportTier: SupportTier | LegacyOnboardingLike): SupportTone => {
  const resolvedTier = typeof supportTier === 'string' ? supportTier : supportTier.supportTier ?? 'Maintenance';
  return supportToneByTier[resolvedTier];
};

const hasAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

export const todayNextStepFromStatedIntent = (input: GrowthIntentInput | LegacyOnboardingLike): string | null => {
  const normalizedInput = normalizeInput(input);
  const narrative = buildGrowthIntentNarrative(normalizedInput).toLowerCase();
  if (!narrative.trim()) return null;

  if (hasAny(narrative, ['snack', 'graz', 'late night'])) {
    return 'Try this: plan one steady meal before late-night hunger hits.';
  }
  if (hasAny(narrative, ['picky', 'variety', 'expand', 'less picky'])) {
    return 'Try this: pair one familiar food with one small stretch.';
  }
  if (hasAny(narrative, ['halal', 'cultural', 'meaningful'])) {
    return 'Try this: choose a grounded meal that still fits your style.';
  }
  if (hasAny(narrative, ['independ', 'own', 'less help', 'confidence'])) {
    return 'Try this: make one meal decision you can fully own today.';
  }
  if (normalizedInput.planHighlights[0]) {
    return 'Try this: choose one doable action tied to your current plan.';
  }
  return 'One small step: pick one realistic action for today.';
};

export const buildRecommendationPrompt = (userPrompt: string, input: GrowthIntentInput | LegacyOnboardingLike): string => {
  const normalizedInput = normalizeInput(input);
  return [
    userPrompt.trim(),
    normalizedInput.goalText ? `Keep this aligned with: ${normalizedInput.goalText}` : '',
    normalizedInput.optionalNarrative ? `Make it easier when: ${normalizedInput.optionalNarrative}` : '',
    normalizedInput.planHighlights[0] ? `Keep it practical for: ${normalizedInput.planHighlights[0]}` : ''
  ].filter(Boolean).join('\n');
};

export const todayMode = (input: { hasUsageHistory: boolean; hasExplicitGoal: boolean; needsImmediateHelp: boolean }): 'utility_first' | 'growth_aligned' | 'reflection_aware' => {
  if (input.needsImmediateHelp) return 'utility_first';
  if (input.hasUsageHistory) return 'reflection_aware';
  if (input.hasExplicitGoal) return 'growth_aligned';
  return 'utility_first';
};

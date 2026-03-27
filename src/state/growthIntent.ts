import type { OnboardingState } from '../types';

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

export const buildGrowthIntentNarrative = (onboarding: OnboardingState): string => (
  [
    onboarding.longHorizon,
    onboarding.optionalNarrative,
    onboarding.currentFocus,
    onboarding.weeklyLens
  ]
    .filter((entry) => entry && entry.trim().length > 0)
    .join('. ')
);

export interface GrowthRecommendationContext {
  longHorizon: string;
  optionalNarrative: string;
  supportTier: OnboardingState['supportTier'];
  currentFocus: string;
  weeklyLens: string;
}

export const buildGrowthRecommendationContext = (onboarding: OnboardingState): GrowthRecommendationContext => ({
  longHorizon: onboarding.longHorizon.trim(),
  optionalNarrative: onboarding.optionalNarrative.trim(),
  supportTier: onboarding.supportTier,
  currentFocus: onboarding.currentFocus.trim(),
  weeklyLens: onboarding.weeklyLens.trim()
});

export const growthIntentAnchor = (onboarding: OnboardingState): string => (
  onboarding.longHorizon.trim() || 'I know I’ve Outgrown this app when… I make one values-aligned choice and keep returning.'
);

export const scoreGrowthIntentAlignment = (candidate: string, onboarding: OnboardingState): number => {
  const intentTokens = uniqueTokens(buildGrowthIntentNarrative(onboarding));
  if (!intentTokens.length) return 0;
  const candidateTokens = new Set(uniqueTokens(candidate));
  const overlap = intentTokens.reduce((count, token) => count + (candidateTokens.has(token) ? 1 : 0), 0);
  return overlap / intentTokens.length;
};

export const growthIntentSupportLine = (onboarding: OnboardingState): string => {
  const anchor = growthIntentAnchor(onboarding);
  return `Anchor: ${anchor}`;
};

type SupportTone = 'gentle' | 'stretch' | 'teach' | 'simple';

const supportToneByTier: Record<OnboardingState['supportTier'], SupportTone> = {
  Active: 'teach',
  Maintenance: 'gentle',
  'Just in Case': 'simple'
};

export const supportTone = (onboarding: OnboardingState): SupportTone => supportToneByTier[onboarding.supportTier];

export const todayNextStepFromStatedIntent = (onboarding: OnboardingState): string | null => {
  const narrative = buildGrowthIntentNarrative(onboarding).toLowerCase();
  const focus = onboarding.currentFocus.trim();
  const weeklyLens = onboarding.weeklyLens.trim();
  const longHorizon = onboarding.longHorizon.trim();

  if (!narrative && !focus && !weeklyLens && !longHorizon) {
    return null;
  }

  if (hasAny(narrative, ['snack', 'graz', 'late night'])) {
    return 'One small step: plan one steady meal before late-night hunger hits.';
  }
  if (hasAny(narrative, ['picky', 'variety', 'expand', 'less picky'])) {
    return 'Maybe start here: pair one familiar food with one small stretch.';
  }
  if (hasAny(narrative, ['halal', 'cultural', 'meaningful'])) {
    return 'A good next step: choose a grounded meal that still feels true to your style.';
  }
  if (hasAny(narrative, ['independ', 'own', 'less help', 'confidence'])) {
    return 'A good next step: make one meal decision you can fully own today.';
  }
  if (focus) {
    return 'Maybe start here: choose one doable action connected to your current focus.';
  }
  if (weeklyLens) {
    return 'One small step: make one choice today that supports your week.';
  }
  return 'One small step: pick one realistic action that fits what matters to you right now.';
};

export const buildRecommendationPrompt = (userPrompt: string, onboarding: OnboardingState): string => {
  const context = buildGrowthRecommendationContext(onboarding);
  return [
    userPrompt.trim(),
    context.longHorizon ? `Growth direction: ${context.longHorizon}` : '',
    context.optionalNarrative ? `Current friction: ${context.optionalNarrative}` : '',
    `Support style: ${context.supportTier}`,
    context.currentFocus ? `Practical focus: ${context.currentFocus}` : '',
    context.weeklyLens ? `This week: ${context.weeklyLens}` : ''
  ].filter(Boolean).join('\n');
};

const hasAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

const longHorizonPriority = (onboarding: OnboardingState): string => {
  const narrative = buildGrowthIntentNarrative(onboarding).toLowerCase();
  if (hasAny(narrative, ['snack', 'graz', 'late night'])) return 'A steadier meal structure may help more than snacky fallback tonight.';
  if (hasAny(narrative, ['picky', 'variety', 'expand', 'less picky'])) return 'This stays familiar while adding a small bridge toward a wider food range.';
  if (hasAny(narrative, ['halal', 'cultural', 'meaningful'])) return 'This keeps the meal grounded and repeatable in your cooking style.';
  if (hasAny(narrative, ['independ', 'own', 'less help', 'confidence'])) return 'This builds a repeatable pattern you can reuse without daily prompting.';
  return 'Simple, grounding, and aligned with how you want to eat.';
};

export const explainGrowthAlignedSuggestion = (onboarding: OnboardingState): string => {
  const friction = onboarding.optionalNarrative.trim();
  const focus = onboarding.currentFocus.trim() || onboarding.weeklyLens.trim();
  const tone = supportTone(onboarding);

  const frictionLine = friction
    ? `Built for the hard part right now: ${friction.slice(0, 78)}${friction.length > 78 ? '…' : ''}`
    : 'Built for low-friction follow-through today.';
  const longHorizonLine = longHorizonPriority(onboarding);
  const practicalLine = focus
    ? `Practical fit: ${focus.slice(0, 66)}${focus.length > 66 ? '…' : ''}`
    : 'Practical fit: low-effort and realistic for tonight.';
  const toneLine = tone === 'teach'
    ? 'Tone: short why + repeatable steps.'
    : tone === 'stretch'
      ? 'Tone: one nearby stretch, not a leap.'
      : tone === 'simple'
        ? 'Tone: predictable defaults with low cognitive load.'
        : 'Tone: reassuring and low-pressure.';

  return [frictionLine, longHorizonLine, practicalLine, toneLine].join(' ');
};

export const todayMode = (input: { hasUsageHistory: boolean; onboarding: OnboardingState; needsImmediateHelp: boolean }): 'utility_first' | 'growth_aligned' | 'reflection_aware' => {
  if (input.needsImmediateHelp) return 'utility_first';
  if (input.hasUsageHistory) return 'reflection_aware';
  if (input.onboarding.longHorizon.trim()) return 'growth_aligned';
  return 'utility_first';
};

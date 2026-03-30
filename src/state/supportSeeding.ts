import type { StoredFocusArea, StoredSupportItem } from '../types';
import type { SupportItemType } from '../domain/growth/types';

type SupportSeedTemplate = {
  matchLabels: string[];
  text: string;
  type: SupportItemType;
  whyThisExists: string;
};

export type SeededSupportItemInput = {
  focusAreaId: string;
  text: string;
  type: SupportItemType;
  whyThisExists: string;
};

const SUPPORT_SEED_TEMPLATES: SupportSeedTemplate[] = [
  {
    matchLabels: ['meals'],
    text: 'Plan one meal ahead today.',
    type: 'planning',
    whyThisExists: 'This is here to support steadier meals.'
  },
  {
    matchLabels: ['lunch'],
    text: 'Decide lunch before your busiest stretch.',
    type: 'planning',
    whyThisExists: 'You added this to make lunch easier on workdays.'
  },
  {
    matchLabels: ['sleep'],
    text: 'Choose a rough bedtime target tonight.',
    type: 'reminder',
    whyThisExists: 'This is here to support better sleep consistency.'
  },
  {
    matchLabels: ['after work'],
    text: 'Take one minute before switching gears.',
    type: 'environment_cue',
    whyThisExists: 'You added this for the after-work transition.'
  },
  {
    matchLabels: ['routine'],
    text: 'Pick one tiny step you can repeat today.',
    type: 'check_in',
    whyThisExists: 'This is here to help your routine feel doable.'
  }
];

const normalize = (value: string) => value.trim().toLowerCase();

const matchesTemplate = (label: string, template: SupportSeedTemplate) => {
  const normalizedLabel = normalize(label);
  return template.matchLabels.some((candidate) => normalizedLabel.includes(candidate));
};

export const buildDeterministicSupportSeeds = (focusAreas: StoredFocusArea[]): SeededSupportItemInput[] => {
  const seeds: SeededSupportItemInput[] = [];
  const usedTexts = new Set<string>();

  for (const focusArea of focusAreas) {
    const matchedTemplate = SUPPORT_SEED_TEMPLATES.find((template) => matchesTemplate(focusArea.label, template));
    if (!matchedTemplate || usedTexts.has(matchedTemplate.text)) {
      continue;
    }

    seeds.push({
      focusAreaId: focusArea.id,
      text: matchedTemplate.text,
      type: matchedTemplate.type,
      whyThisExists: matchedTemplate.whyThisExists
    });
    usedTexts.add(matchedTemplate.text);

    if (seeds.length >= 2) {
      break;
    }
  }

  return seeds;
};

export const removeExistingSeedDuplicates = (
  seeds: SeededSupportItemInput[],
  existingSupportItems: StoredSupportItem[]
): SeededSupportItemInput[] => {
  const existingTexts = new Set(existingSupportItems.map((item) => normalize(item.text)));
  return seeds.filter((seed) => !existingTexts.has(normalize(seed.text)));
};

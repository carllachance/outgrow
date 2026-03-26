import type { FoodComponent, FoodComponentKind, InterpretationConfidence, MealKind, MealLogEntry, TimeMode } from '../types';

interface SoftTimeMapping {
  softTimeLabel: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface MealInterpretation {
  timeMode: TimeMode;
  softTimeLabel?: string;
  timeRangeStart?: string;
  timeRangeEnd?: string;
  exactTime?: string;
  mealKind: MealKind;
  interpretedSummary?: string;
  components: FoodComponent[];
  interpretationConfidence: InterpretationConfidence;
}

const SOFT_TIME_PATTERNS: Array<{ pattern: RegExp; mapping: SoftTimeMapping; confidence: InterpretationConfidence }> = [
  { pattern: /\bearly morning\b/i, mapping: { softTimeLabel: 'Early morning', startHour: 5, startMinute: 0, endHour: 6, endMinute: 59 }, confidence: 'high' },
  { pattern: /\bthis morning\b|\bmorning\b/i, mapping: { softTimeLabel: 'Morning', startHour: 6, startMinute: 0, endHour: 10, endMinute: 59 }, confidence: 'high' },
  { pattern: /\blate morning\b/i, mapping: { softTimeLabel: 'Late morning', startHour: 10, startMinute: 30, endHour: 11, endMinute: 29 }, confidence: 'high' },
  { pattern: /\baround lunch\b|\bat lunch\b|\bbefore lunch\b|\bafter lunch\b/i, mapping: { softTimeLabel: 'Around lunch', startHour: 11, startMinute: 30, endHour: 13, endMinute: 30 }, confidence: 'high' },
  { pattern: /\bthis afternoon\b|\bafternoon\b/i, mapping: { softTimeLabel: 'Afternoon', startHour: 13, startMinute: 0, endHour: 16, endMinute: 29 }, confidence: 'high' },
  { pattern: /\blate afternoon\b/i, mapping: { softTimeLabel: 'Late afternoon', startHour: 16, startMinute: 30, endHour: 17, endMinute: 59 }, confidence: 'high' },
  { pattern: /\baround dinner\b|\bbefore dinner\b/i, mapping: { softTimeLabel: 'Around dinner', startHour: 18, startMinute: 0, endHour: 19, endMinute: 30 }, confidence: 'high' },
  { pattern: /\bafter dinner\b/i, mapping: { softTimeLabel: 'After dinner', startHour: 19, startMinute: 0, endHour: 21, endMinute: 0 }, confidence: 'high' },
  { pattern: /\btonight\b|\bevening\b/i, mapping: { softTimeLabel: 'Evening', startHour: 18, startMinute: 30, endHour: 21, endMinute: 29 }, confidence: 'high' },
  { pattern: /\blate night\b|\bnight\b|\bchips late\b|\blate\b/i, mapping: { softTimeLabel: 'Late night', startHour: 21, startMinute: 30, endHour: 0, endMinute: 30 }, confidence: 'medium' }
];

const MEAL_KIND_PATTERNS: Array<{ pattern: RegExp; mealKind: MealKind; confidence: InterpretationConfidence }> = [
  { pattern: /\bbreakfast\b/i, mealKind: 'breakfast', confidence: 'high' },
  { pattern: /\blunch\b/i, mealKind: 'lunch', confidence: 'high' },
  { pattern: /\bdinner\b/i, mealKind: 'dinner', confidence: 'high' },
  { pattern: /\bsnack\b|\bbar\b|\bchips\b/i, mealKind: 'snack', confidence: 'medium' },
  { pattern: /\bcoffee\b|\btea\b|\bdrink\b|\bwater\b/i, mealKind: 'drink', confidence: 'medium' }
];

const CONDIMENT_HINTS = ['mayo', 'mustard', 'ketchup', 'sauce', 'dressing'];
const DRINK_HINTS = ['coffee', 'tea', 'water', 'juice', 'soda'];

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const toIsoForDay = (day: string, hour: number, minute: number) => {
  const date = new Date(`${day}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const extractExactTime = (rawText: string, entryDate: string): string | undefined => {
  const match = rawText.match(/\b(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s?(am|pm)\b/i);
  if (!match) return undefined;
  const hour12 = Number.parseInt(match[1], 10);
  const minute = match[2] ? Number.parseInt(match[2], 10) : 0;
  const ampm = match[3].toLowerCase();
  let hour24 = hour12 % 12;
  if (ampm === 'pm') hour24 += 12;
  return toIsoForDay(entryDate, hour24, minute);
};

const splitComponents = (rawText: string): FoodComponent[] => {
  return rawText
    .replace(/\b(this morning|this afternoon|tonight|around lunch|after dinner|before breakfast|around dinner|around \d{1,2}(?::\d{2})?\s?(am|pm)?|about \d{1,2}(?::\d{2})?\s?(am|pm)?|late night|late)\b/gi, '')
    .split(/,|\band\b|\bthen\b/gi)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((label) => {
      const lower = label.toLowerCase();
      let kind: FoodComponentKind = 'unknown';
      if (CONDIMENT_HINTS.some((hint) => lower.includes(hint))) kind = 'condiment';
      else if (DRINK_HINTS.some((hint) => lower.includes(hint))) kind = 'drink';
      else if (lower.includes('sandwich') || lower.includes('salad') || lower.includes('pizza')) kind = 'main';
      else kind = 'ingredient';

      const quantityMatch = label.match(/^([0-9/]+\s?[a-zA-Z]*)\s+(.*)$/);
      if (quantityMatch) {
        return {
          label: quantityMatch[2].trim(),
          kind,
          quantityText: quantityMatch[1].trim()
        };
      }

      return { label, kind };
    });
};

const buildSummary = (components: FoodComponent[], rawText: string, confidence: InterpretationConfidence): string | undefined => {
  if (!components.length || confidence === 'low') return undefined;
  if (components.length === 1) return titleCase(components[0].label);
  if (rawText.toLowerCase().includes('sandwich') && components.length >= 3) {
    const [main, ...rest] = components;
    return `${titleCase(main.label)} with ${rest.map((item) => item.label).join(' and ')}`;
  }
  return components.map((item) => item.label).join(', ');
};

export const interpretMealEntry = ({ rawText, entryDate }: { rawText: string; entryDate: string }): MealInterpretation => {
  const trimmed = rawText.trim();
  const exactTime = extractExactTime(trimmed, entryDate);

  let timeMode: TimeMode = 'unknown';
  let softTimeLabel: string | undefined;
  let timeRangeStart: string | undefined;
  let timeRangeEnd: string | undefined;
  let timeConfidence: InterpretationConfidence = 'low';

  if (exactTime) {
    timeMode = 'exact';
    timeConfidence = 'high';
  } else {
    const softTimeMatch = SOFT_TIME_PATTERNS.find(({ pattern }) => pattern.test(trimmed));
    if (softTimeMatch) {
      timeMode = 'soft';
      timeConfidence = softTimeMatch.confidence;
      softTimeLabel = softTimeMatch.mapping.softTimeLabel;
      timeRangeStart = toIsoForDay(entryDate, softTimeMatch.mapping.startHour, softTimeMatch.mapping.startMinute) || undefined;
      const endDay = softTimeMatch.mapping.endHour < softTimeMatch.mapping.startHour
        ? new Date(`${entryDate}T00:00:00.000Z`)
        : null;
      if (endDay) {
        endDay.setUTCDate(endDay.getUTCDate() + 1);
        const nextDay = endDay.toISOString().slice(0, 10);
        timeRangeEnd = toIsoForDay(nextDay, softTimeMatch.mapping.endHour, softTimeMatch.mapping.endMinute) || undefined;
      } else {
        timeRangeEnd = toIsoForDay(entryDate, softTimeMatch.mapping.endHour, softTimeMatch.mapping.endMinute) || undefined;
      }
    }

    const roughClock = trimmed.match(/\b(?:around|about)\s+(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s?(am|pm)?\b/i);
    if (roughClock) {
      const hour = Number.parseInt(roughClock[1], 10);
      const minute = roughClock[2] ? Number.parseInt(roughClock[2], 10) : 0;
      const ampm = roughClock[3]?.toLowerCase();
      let normalizedHour = hour;
      if (ampm) {
        normalizedHour = hour % 12;
        if (ampm === 'pm') normalizedHour += 12;
      }
      timeMode = 'soft';
      softTimeLabel = `Around ${hour}${roughClock[2] ? `:${roughClock[2]}` : ''}${ampm ? ampm.toUpperCase() : ''}`;
      timeRangeStart = toIsoForDay(entryDate, Math.max(normalizedHour - 1, 0), minute) || undefined;
      timeRangeEnd = toIsoForDay(entryDate, Math.min(normalizedHour + 1, 23), minute) || undefined;
      timeConfidence = 'medium';
    }
  }

  const mealKindMatch = MEAL_KIND_PATTERNS.find(({ pattern }) => pattern.test(trimmed));
  const mealKind = mealKindMatch?.mealKind ?? 'unknown';

  const components = splitComponents(trimmed);

  const confidenceScore = [timeConfidence, mealKindMatch?.confidence ?? 'low', components.length >= 2 ? 'high' : components.length === 1 ? 'medium' : 'low'];
  const highCount = confidenceScore.filter((value) => value === 'high').length;
  const mediumCount = confidenceScore.filter((value) => value === 'medium').length;
  const interpretationConfidence: InterpretationConfidence = highCount >= 2 ? 'high' : highCount >= 1 || mediumCount >= 2 ? 'medium' : 'low';

  const interpretedSummary = buildSummary(components, trimmed, interpretationConfidence);

  return {
    timeMode,
    softTimeLabel,
    timeRangeStart,
    timeRangeEnd,
    exactTime,
    mealKind,
    interpretedSummary,
    components,
    interpretationConfidence
  };
};

export const buildMealLogEntry = ({
  rawText,
  entryDate,
  interpretation,
  edited
}: {
  rawText: string;
  entryDate: string;
  interpretation: MealInterpretation;
  edited?: Partial<Pick<MealLogEntry, 'mealKind' | 'interpretedSummary' | 'softTimeLabel' | 'timeMode' | 'exactTime' | 'components'>>;
}): Omit<MealLogEntry, 'id' | 'createdAt'> => {
  return {
    entryDate,
    timeMode: edited?.timeMode ?? interpretation.timeMode,
    softTimeLabel: edited?.softTimeLabel ?? interpretation.softTimeLabel,
    timeRangeStart: interpretation.timeRangeStart,
    timeRangeEnd: interpretation.timeRangeEnd,
    exactTime: edited?.exactTime ?? interpretation.exactTime,
    mealKind: edited?.mealKind ?? interpretation.mealKind,
    rawText,
    interpretedSummary: edited?.interpretedSummary ?? interpretation.interpretedSummary,
    components: edited?.components ?? interpretation.components,
    interpretationConfidence: interpretation.interpretationConfidence,
    source: 'manual',
    wasEditedAfterInterpretation: Boolean(edited && Object.keys(edited).length > 0)
  };
};

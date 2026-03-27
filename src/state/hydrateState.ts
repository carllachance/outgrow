import { defaultState } from './defaultState';
import type { AppState, FoodComponent, MealKind, MealLogEntry, TimeMode } from '../types';

const VALID_MEAL_KINDS: MealKind[] = ['breakfast', 'lunch', 'dinner', 'snack', 'drink', 'unknown'];
const VALID_TIME_MODES: TimeMode[] = ['soft', 'exact', 'unknown'];

const sanitizeComponents = (value: unknown): FoodComponent[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((component) => {
      if (!component || typeof component !== 'object') return null;
      const candidate = component as Partial<FoodComponent>;
      if (!candidate.label) return null;
      return {
        label: String(candidate.label),
        kind: candidate.kind,
        quantityText: candidate.quantityText
      } as FoodComponent;
    })
    .filter(Boolean) as FoodComponent[];
};

const sanitizeMealLog = (value: unknown): MealLogEntry | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<MealLogEntry> & Record<string, unknown>;

  // v1 migration (legacy structured form)
  if (!candidate.rawText && typeof candidate.note === 'string') {
    return {
      id: String(candidate.id ?? crypto.randomUUID()),
      createdAt: String(candidate.createdAt ?? candidate.timestamp ?? new Date().toISOString()),
      entryDate: String((candidate.timestamp as string | undefined)?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)),
      timeMode: 'exact',
      exactTime: String(candidate.timestamp ?? new Date().toISOString()),
      mealKind: 'unknown',
      rawText: candidate.note.trim(),
      interpretedSummary: candidate.note.trim(),
      components: [],
      interpretationConfidence: 'low',
      source: 'manual',
      wasEditedAfterInterpretation: false
    };
  }

  if (!candidate.id || !candidate.createdAt || !candidate.entryDate || !candidate.rawText) return null;

  return {
    id: String(candidate.id),
    createdAt: String(candidate.createdAt),
    entryDate: String(candidate.entryDate),
    timeMode: VALID_TIME_MODES.includes(candidate.timeMode as TimeMode) ? candidate.timeMode as TimeMode : 'unknown',
    softTimeLabel: typeof candidate.softTimeLabel === 'string' ? candidate.softTimeLabel : undefined,
    timeRangeStart: typeof candidate.timeRangeStart === 'string' ? candidate.timeRangeStart : undefined,
    timeRangeEnd: typeof candidate.timeRangeEnd === 'string' ? candidate.timeRangeEnd : undefined,
    exactTime: typeof candidate.exactTime === 'string' ? candidate.exactTime : undefined,
    mealKind: VALID_MEAL_KINDS.includes(candidate.mealKind as MealKind) ? candidate.mealKind as MealKind : 'unknown',
    rawText: String(candidate.rawText),
    interpretedSummary: typeof candidate.interpretedSummary === 'string' ? candidate.interpretedSummary : undefined,
    components: sanitizeComponents(candidate.components),
    interpretationConfidence: candidate.interpretationConfidence === 'high' || candidate.interpretationConfidence === 'medium' || candidate.interpretationConfidence === 'low'
      ? candidate.interpretationConfidence
      : 'low',
    source: 'manual',
    wasEditedAfterInterpretation: Boolean(candidate.wasEditedAfterInterpretation)
  };
};

export const hydrateAppState = (raw: string | null): AppState => {
  if (!raw) return defaultState;

  try {
    const parsed = { ...defaultState, ...JSON.parse(raw) } as AppState;
    const onboardingStep = parsed.onboarding?.activeStep;
    const sanitizedOnboardingStep: 1 | 2 | 3 | 4 = onboardingStep === 2 || onboardingStep === 3 || onboardingStep === 4 ? onboardingStep : 1;
    return {
      ...parsed,
      onboarding: {
        ...defaultState.onboarding,
        ...parsed.onboarding,
        activeStep: sanitizedOnboardingStep,
        hasCompleted: Boolean(parsed.onboarding?.hasCompleted)
      },
      todaySuccessByDate:
        parsed.todaySuccessByDate && typeof parsed.todaySuccessByDate === 'object'
          ? parsed.todaySuccessByDate
          : {},
      mealLogs: Array.isArray(parsed.mealLogs) ? parsed.mealLogs.map(sanitizeMealLog).filter(Boolean) as MealLogEntry[] : [],
      safety: {
        ...defaultState.safety,
        ...parsed.safety,
        eventLog: parsed.safety?.eventLog ?? []
      },
      foodRules: {
        dietaryDefaults: Array.isArray(parsed.foodRules?.dietaryDefaults)
          ? parsed.foodRules.dietaryDefaults.filter((rule): rule is 'gluten_free' | 'vegetarian' | 'dairy_light' => rule === 'gluten_free' || rule === 'vegetarian' || rule === 'dairy_light')
          : [],
        standingOrders: Array.isArray(parsed.foodRules?.standingOrders)
          ? parsed.foodRules.standingOrders.map((entry) => String(entry).trim()).filter(Boolean)
          : [],
        ingredientExclusions: Array.isArray(parsed.foodRules?.ingredientExclusions)
          ? parsed.foodRules.ingredientExclusions.map((entry) => String(entry).trim()).filter(Boolean)
          : [],
        allergies: Array.isArray(parsed.foodRules?.allergies)
          ? parsed.foodRules.allergies.map((entry) => String(entry).trim()).filter(Boolean)
          : []
      }
    };
  } catch {
    return defaultState;
  }
};

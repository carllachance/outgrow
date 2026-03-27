import { defaultState } from './defaultState';
import type {
  AppState,
  FoodComponent,
  Goal,
  GoalRefinementSuggestion,
  GoalRevisionHistory,
  MealKind,
  MealLogEntry,
  PlanItem,
  PlanItemType,
  TimeMode
} from '../types';

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

const sanitizeGoal = (value: unknown): Goal | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Goal>;
  if (!candidate.id || !candidate.original_text || !candidate.active_display_text) return null;

  return {
    id: String(candidate.id),
    user_id: String(candidate.user_id ?? 'local-user'),
    original_text: String(candidate.original_text),
    active_display_text: String(candidate.active_display_text),
    created_at: String(candidate.created_at ?? new Date().toISOString()),
    updated_at: String(candidate.updated_at ?? new Date().toISOString()),
    status: candidate.status === 'archived' || candidate.status === 'superseded' ? candidate.status : 'active'
  };
};

const sanitizeGoalRevisionHistory = (value: unknown): GoalRevisionHistory[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Partial<GoalRevisionHistory>;
      if (!candidate.id || !candidate.goal_id || !candidate.prior_text || !candidate.new_text) return null;
      return {
        id: String(candidate.id),
        goal_id: String(candidate.goal_id),
        prior_text: String(candidate.prior_text),
        new_text: String(candidate.new_text),
        revision_source: candidate.revision_source === 'suggestion_accept' || candidate.revision_source === 'migration'
          ? candidate.revision_source
          : 'user_edit',
        created_at: String(candidate.created_at ?? new Date().toISOString())
      } satisfies GoalRevisionHistory;
    })
    .filter(Boolean) as GoalRevisionHistory[];
};

const VALID_PLAN_ITEM_TYPES: PlanItemType[] = ['reminder', 'meal', 'snack', 'movement', 'sleep', 'routine', 'reflection', 'other'];

const sanitizeGoalRefinementSuggestions = (value: unknown): GoalRefinementSuggestion[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Partial<GoalRefinementSuggestion>;
      if (!candidate.id || !candidate.goal_id || !candidate.suggested_text) return null;
      return {
        id: String(candidate.id),
        goal_id: String(candidate.goal_id),
        suggested_text: String(candidate.suggested_text),
        rationale_short: String(candidate.rationale_short ?? ''),
        created_at: String(candidate.created_at ?? new Date().toISOString()),
        accepted_at: typeof candidate.accepted_at === 'string' ? candidate.accepted_at : undefined,
        dismissed_at: typeof candidate.dismissed_at === 'string' ? candidate.dismissed_at : undefined
      } satisfies GoalRefinementSuggestion;
    })
    .filter(Boolean) as GoalRefinementSuggestion[];
};

const sanitizePlanItems = (value: unknown): PlanItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Partial<PlanItem>;
      if (!candidate.id || !candidate.title) return null;
      return {
        id: String(candidate.id),
        item_type: VALID_PLAN_ITEM_TYPES.includes(candidate.item_type as PlanItemType) ? candidate.item_type as PlanItemType : 'other',
        title: String(candidate.title),
        description: typeof candidate.description === 'string' ? candidate.description : undefined,
        cadence: typeof candidate.cadence === 'string' ? candidate.cadence : undefined,
        status: candidate.status === 'done' || candidate.status === 'archived' ? candidate.status : 'active',
        source_type: candidate.source_type === 'system_suggested' || candidate.source_type === 'system_confirmed' || candidate.source_type === 'onboarding_seeded'
          ? candidate.source_type
          : 'user_added',
        created_at: String(candidate.created_at ?? new Date().toISOString()),
        updated_at: String(candidate.updated_at ?? new Date().toISOString())
      } satisfies PlanItem;
    })
    .filter(Boolean) as PlanItem[];
};

export const hydrateAppState = (raw: string | null): AppState => {
  if (!raw) return defaultState;

  try {
    const parsed = { ...defaultState, ...JSON.parse(raw) } as AppState;
    const onboardingStep = parsed.onboarding?.activeStep;
    const sanitizedOnboardingStep: 1 | 2 | 3 = onboardingStep === 2 || onboardingStep === 3 ? onboardingStep : 1;
    return {
      ...parsed,
      onboarding: {
        ...defaultState.onboarding,
        ...parsed.onboarding,
        activeStep: sanitizedOnboardingStep,
        hasCompleted: Boolean(parsed.onboarding?.hasCompleted)
      },
      goal: sanitizeGoal(parsed.goal),
      goalRevisionHistory: sanitizeGoalRevisionHistory(parsed.goalRevisionHistory),
      goalRefinementSuggestions: sanitizeGoalRefinementSuggestions(parsed.goalRefinementSuggestions),
      planItems: sanitizePlanItems(parsed.planItems),
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

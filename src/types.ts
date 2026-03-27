export type SupportTier = 'Active' | 'Maintenance' | 'Just in Case';

export interface UserProfile {
  name: string;
  pronouns?: string;
}

export type GoalStatus = 'active' | 'archived' | 'superseded';
export type GoalRevisionSource = 'user_edit' | 'suggestion_accept' | 'migration';

export interface Goal {
  id: string;
  user_id: string;
  original_text: string;
  active_display_text: string;
  created_at: string;
  updated_at: string;
  status: GoalStatus;
}

export interface GoalRevisionHistory {
  id: string;
  goal_id: string;
  prior_text: string;
  new_text: string;
  revision_source: GoalRevisionSource;
  created_at: string;
}

export interface GoalRefinementSuggestion {
  id: string;
  goal_id: string;
  suggested_text: string;
  rationale_short: string;
  created_at: string;
  accepted_at?: string;
  dismissed_at?: string;
}

export interface OnboardingState {
  optionalNarrative: string;
  expectedTimeline: string;
  supportTier: SupportTier;
  activeStep: 1 | 2 | 3;
  hasCompleted: boolean;
}

export interface FoodRulesState {
  dietaryDefaults: Array<'gluten_free' | 'vegetarian' | 'dairy_light'>;
  standingOrders: string[];
  ingredientExclusions: string[];
  allergies: string[];
}

export interface JournalEntry {
  id: string;
  date: string;
  type: 'freeform' | 'daily' | 'weekly';
  content: string;
}

export interface Reflection {
  weekOf: string;
  worked: string;
  didntHold: string;
  change: string;
  adapt: string;
}

export interface ReturnMoment {
  id: string;
  date: string;
  note: string;
}

export type TimeMode = 'soft' | 'exact' | 'unknown';
export type MealKind = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink' | 'unknown';
export type InterpretationConfidence = 'high' | 'medium' | 'low';
export type FoodComponentKind = 'main' | 'ingredient' | 'side' | 'drink' | 'condiment' | 'unknown';

export interface FoodComponent {
  label: string;
  kind?: FoodComponentKind;
  quantityText?: string;
}

export interface MealLogEntry {
  id: string;
  createdAt: string;
  entryDate: string;
  timeMode: TimeMode;
  softTimeLabel?: string;
  timeRangeStart?: string;
  timeRangeEnd?: string;
  exactTime?: string;
  mealKind?: MealKind;
  rawText: string;
  interpretedSummary?: string;
  components?: FoodComponent[];
  interpretationConfidence?: InterpretationConfidence;
  source: 'manual';
  wasEditedAfterInterpretation: boolean;
}

export interface PrivacySettings {
  localOnly: boolean;
  anonymousNods: boolean;
  biometricLock: boolean;
}

export interface KindWordEntry {
  id: string;
  date: string;
  request: string;
  response: string;
}

export type CommunityCategory =
  | 'small win'
  | 'kind reminder'
  | 'what helped today'
  | 'gentle encouragement';

export interface CommunityShare {
  id: string;
  date: string;
  category: CommunityCategory;
  content: string;
  authorLabel: string;
  isFlagged: boolean;
}

export interface SafetyState {
  isPaused: boolean;
  reason: string;
  mode: 'normal' | 'softened' | 'restricted' | 'safety_mode' | 'prolonged_safe_mode';
  riskTier: 0 | 1 | 2 | 3;
  resetRequests: number;
  hiddenProgress: boolean;
  lastEventAt: string;
  restrictionEndsAt: string;
  flags: {
    tracking_enabled: boolean;
    progress_visible: boolean;
    optimization_enabled: boolean;
    adaptive_coaching_enabled: boolean;
    community_posting_enabled: boolean;
    wearable_interpretation_enabled: boolean;
  };
  eventLog: Array<{
    at: string;
    tier: 0 | 1 | 2 | 3;
    type: 'tier_transition' | 'reset_request' | 'manual_pause';
    note: string;
  }>;
}

export type InsightSupportStrength = 'high' | 'medium' | 'low';
export type InsightSupportFactor =
  | 'low_sleep'
  | 'late_snack'
  | 'high_activity'
  | 'positive_entry_tone'
  | 'early_lunch'
  | 'high_stress';

export interface InsightSupportLink {
  id: string;
  insightId: string;
  dayId: string;
  supportStrength: InsightSupportStrength;
  factors: InsightSupportFactor[];
  explanation?: string;
  createdAt: string;
}

export type PlanItemType = 'reminder' | 'meal' | 'snack' | 'movement' | 'sleep' | 'routine' | 'reflection' | 'other';

export interface PlanItem {
  id: string;
  item_type: PlanItemType;
  title: string;
  description?: string;
  cadence?: string;
  status: 'active' | 'done' | 'archived';
  source_type: 'user_added' | 'system_suggested' | 'system_confirmed' | 'onboarding_seeded';
  created_at: string;
  updated_at: string;
}

export interface AppState {
  profile: UserProfile;
  goal: Goal | null;
  goalRevisionHistory: GoalRevisionHistory[];
  goalRefinementSuggestions: GoalRefinementSuggestion[];
  planItems: PlanItem[];
  onboarding: OnboardingState;
  todaySuccessByDate: Record<string, string>;
  journalEntries: JournalEntry[];
  mealLogs: MealLogEntry[];
  weeklyReflections: Reflection[];
  returnMoments: ReturnMoment[];
  privacy: PrivacySettings;
  kindWords: KindWordEntry[];
  communityShares: CommunityShare[];
  insightSupportLinks: InsightSupportLink[];
  safety: SafetyState;
  foodRules: FoodRulesState;
}

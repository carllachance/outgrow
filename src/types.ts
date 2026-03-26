export type SupportTier = 'Active' | 'Maintenance' | 'Just in Case';

export interface UserProfile {
  name: string;
  pronouns?: string;
}

export interface OnboardingState {
  longHorizon: string;
  weeklyLens: string;
  currentFocus: string;
  optionalNarrative: string;
  expectedTimeline: string;
  supportTier: SupportTier;
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

export type MealEventType = 'meal' | 'snack' | 'treat' | 'drink';
export type CompositionTag =
  | 'protein'
  | 'produce'
  | 'fiber'
  | 'starch'
  | 'sweets'
  | 'fried_heavy'
  | 'ultra_processed'
  | 'alcohol'
  | 'caffeine';
export type PortionFeel = 'light' | 'sensible' | 'heavy';
export type MealContext = 'hungry' | 'convenience' | 'stress' | 'social' | 'celebration' | 'bored' | 'routine';

export interface MealLogEntry {
  id: string;
  timestamp: string;
  eventType: MealEventType;
  compositionTags: CompositionTag[];
  portionFeel: PortionFeel;
  context?: MealContext;
  note?: string;
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

export interface AppState {
  profile: UserProfile;
  onboarding: OnboardingState;
  journalEntries: JournalEntry[];
  mealLogs: MealLogEntry[];
  weeklyReflections: Reflection[];
  returnMoments: ReturnMoment[];
  privacy: PrivacySettings;
  kindWords: KindWordEntry[];
  communityShares: CommunityShare[];
  safety: SafetyState;
}

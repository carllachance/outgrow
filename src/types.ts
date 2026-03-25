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

export interface SafetyState {
  isPaused: boolean;
  reason: string;
}

export interface AppState {
  profile: UserProfile;
  onboarding: OnboardingState;
  journalEntries: JournalEntry[];
  weeklyReflections: Reflection[];
  returnMoments: ReturnMoment[];
  privacy: PrivacySettings;
  kindWords: KindWordEntry[];
  anonymousNodCount: number;
  safety: SafetyState;
}

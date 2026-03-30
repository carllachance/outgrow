export type GrowthIntent = {
  id: string;
  rawText: string;
  refinedText?: string;
  importanceReason?: string;
  successDefinition?: string;
  confidenceLevel?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FocusArea = {
  id: string;
  intentId: string;
  label: string;
  userDefined: boolean;
  priority: number;
  active: boolean;
  notes?: string;
};

export type SupportItemType =
  | 'planning'
  | 'reminder'
  | 'fallback'
  | 'check_in'
  | 'reflection'
  | 'environment_cue'
  | 'recovery'
  | 'encouragement';

export type SupportItemFrequency = 'daily' | 'weekday' | 'weekly' | 'custom' | 'as_needed';

export type SupportItemSource = 'user' | 'suggested' | 'system' | 'imported';

export type SupportItem = {
  id: string;
  focusAreaId: string;
  type: SupportItemType;
  text: string;
  frequency?: SupportItemFrequency;
  active: boolean;
  whyThisExists?: string;
  source: SupportItemSource;
  effectivenessSignal?: number;
};

export type DailyMomentType =
  | 'meal'
  | 'movement'
  | 'sleep'
  | 'presence'
  | 'stress'
  | 'check_in'
  | 'freeform';

export type DailyMoment = {
  id: string;
  timestamp: string;
  focusAreaId?: string;
  type: DailyMomentType;
  text?: string;
  frictionLevel?: 1 | 2 | 3 | 4 | 5;
  helpfulnessSignal?: -1 | 0 | 1;
  source: 'user' | 'system';
};

export type ReflectionSource = 'user' | 'suggested' | 'inferred';

export type Reflection = {
  id: string;
  text: string;
  source: ReflectionSource;
  confirmedByUser: boolean;
  relatedFocusAreaIds: string[];
  confidence?: number;
};

export type Pattern = {
  id: string;
  label: string;
  description: string;
  confidence: number;
  confirmedByUser: boolean;
  supportingMomentIds: string[];
  supportingReflectionIds: string[];
  actionability?: number;
};

export type ExperimentOutcome = 'helped' | 'mixed' | 'did_not_help';

export type Experiment = {
  id: string;
  focusAreaId: string;
  text: string;
  startDate: string;
  endDate?: string;
  linkedPatternId?: string;
  outcome?: ExperimentOutcome;
  userRating?: number;
  notes?: string;
};

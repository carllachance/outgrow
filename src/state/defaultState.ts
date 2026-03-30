import type { AppState } from '../types';

export const defaultState: AppState = {
  profile: {
    name: '',
    pronouns: ''
  },
  goal: null,
  goalRevisionHistory: [],
  goalRefinementSuggestions: [],
  planItems: [],
  onboarding: {
    optionalNarrative: '',
    expectedTimeline: '',
    frameworkChoice: 'startSimple',
    supportTier: 'Active',
    activeStep: 1,
    hasCompleted: false
  },
  todaySuccessByDate: {},
  journalEntries: [],
  mealLogs: [],
  weeklyReflections: [],
  returnMoments: [],
  privacy: {
    localOnly: true,
    anonymousNods: false,
    biometricLock: false
  },
  kindWords: [],
  communityShares: [],
  insightSupportLinks: [],
  safety: {
    isPaused: false,
    reason: '',
    mode: 'normal',
    riskTier: 0,
    resetRequests: 0,
    hiddenProgress: false,
    lastEventAt: '',
    restrictionEndsAt: '',
    flags: {
      tracking_enabled: true,
      progress_visible: true,
      optimization_enabled: true,
      adaptive_coaching_enabled: true,
      community_posting_enabled: true,
      wearable_interpretation_enabled: true
    },
    eventLog: []
  },
  foodRules: {
    dietaryDefaults: [],
    standingOrders: [],
    ingredientExclusions: [],
    allergies: []
  },
  growthIntents: [],
  focusAreas: [],
  supportItems: [],
  dailyMoments: [],
  growthReflections: [],
  patterns: [],
  experiments: []
};

import type { AppState } from '../types';

export const defaultState: AppState = {
  profile: {
    name: '',
    pronouns: ''
  },
  onboarding: {
    longHorizon: '',
    weeklyLens: '',
    currentFocus: '',
    optionalNarrative: '',
    expectedTimeline: '',
    supportTier: 'Active'
  },
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
  }
};

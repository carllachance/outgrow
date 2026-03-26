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
  weeklyReflections: [],
  returnMoments: [],
  privacy: {
    localOnly: true,
    anonymousNods: false,
    biometricLock: false
  },
  kindWords: [],
  communityShares: [],
  safety: {
    isPaused: false,
    reason: ''
  }
};

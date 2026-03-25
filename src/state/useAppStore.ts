import { useMemo, useState } from 'react';
import { defaultState } from './defaultState';
import type { AppState, JournalEntry, KindWordEntry, Reflection } from '../types';

const STORAGE_KEY = 'outgrow-mvp-state-v1';

const readStorage = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) } as AppState;
  } catch {
    return defaultState;
  }
};

export const useAppStore = () => {
  const [state, setState] = useState<AppState>(() => readStorage());

  const persist = (next: AppState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return useMemo(
    () => ({
      state,
      updateOnboarding: (partial: Partial<AppState['onboarding']>) => {
        persist({ ...state, onboarding: { ...state.onboarding, ...partial } });
      },
      updateProfile: (name: string, pronouns: string) => {
        persist({ ...state, profile: { name, pronouns } });
      },
      updatePrivacy: (partial: Partial<AppState['privacy']>) => {
        persist({ ...state, privacy: { ...state.privacy, ...partial } });
      },
      setSafetyPause: (isPaused: boolean, reason: string) => {
        persist({ ...state, safety: { isPaused, reason } });
      },
      addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'date'>) => {
        const full: JournalEntry = {
          ...entry,
          id: crypto.randomUUID(),
          date: new Date().toISOString()
        };
        persist({ ...state, journalEntries: [full, ...state.journalEntries] });
      },
      addReflection: (reflection: Reflection) => {
        persist({ ...state, weeklyReflections: [reflection, ...state.weeklyReflections] });
      },
      addReturnMoment: (note: string) => {
        const full = { id: crypto.randomUUID(), note, date: new Date().toISOString() };
        persist({ ...state, returnMoments: [full, ...state.returnMoments] });
      },
      addKindWord: (request: string, response: string) => {
        const full: KindWordEntry = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          request,
          response
        };
        persist({ ...state, kindWords: [full, ...state.kindWords] });
      },
      addAnonymousNod: () => {
        persist({ ...state, anonymousNodCount: state.anonymousNodCount + 1 });
      },
      clearAllData: () => {
        persist(defaultState);
      }
    }),
    [state]
  );
};

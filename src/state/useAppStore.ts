import { useMemo, useState } from 'react';
import { defaultState } from './defaultState';
import type { AppState, CommunityCategory, JournalEntry, KindWordEntry, Reflection } from '../types';
import { evaluatePurposeIntegrity, sanitizeForShare } from '../data/purposeIntegrity';

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
        const screenedContent = sanitizeForShare(entry.content);
        const integrity = evaluatePurposeIntegrity(screenedContent);
        if (integrity.status === 'block') {
          return integrity.message;
        }

        const full: JournalEntry = {
          ...entry,
          content: screenedContent,
          id: crypto.randomUUID(),
          date: new Date().toISOString()
        };
        persist({ ...state, journalEntries: [full, ...state.journalEntries] });
        return integrity.status === 'review' ? integrity.message : '';
      },
      addReflection: (reflection: Reflection) => {
        persist({ ...state, weeklyReflections: [reflection, ...state.weeklyReflections] });
      },
      addReturnMoment: (note: string) => {
        const full = { id: crypto.randomUUID(), note, date: new Date().toISOString() };
        persist({ ...state, returnMoments: [full, ...state.returnMoments] });
      },
      addKindWord: (request: string, response: string) => {
        const screenedRequest = sanitizeForShare(request);
        const screenedResponse = sanitizeForShare(response);
        const requestResult = evaluatePurposeIntegrity(screenedRequest);
        const responseResult = evaluatePurposeIntegrity(screenedResponse);
        if (requestResult.status === 'block' || responseResult.status === 'block') {
          return requestResult.message || responseResult.message;
        }

        const full: KindWordEntry = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          request: screenedRequest,
          response: screenedResponse
        };
        persist({ ...state, kindWords: [full, ...state.kindWords] });
        return '';
      },
      addCommunityShare: (content: string, category: CommunityCategory) => {
        const screened = sanitizeForShare(content);
        const integrity = evaluatePurposeIntegrity(screened);
        if (integrity.status === 'block') {
          return integrity.message;
        }

        const full = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          category,
          content: screened,
          authorLabel: 'Anonymous',
          isFlagged: integrity.status === 'review'
        };
        persist({ ...state, communityShares: [full, ...state.communityShares] });
        return integrity.message;
      },
      flagCommunityShare: (id: string) => {
        persist({
          ...state,
          communityShares: state.communityShares.map((share) =>
            share.id === id ? { ...share, isFlagged: true } : share
          )
        });
      },
      clearAllData: () => {
        persist(defaultState);
      }
    }),
    [state]
  );
};

import { useMemo, useState } from 'react';
import { defaultState } from './defaultState';
import type { AppState, CommunityCategory, JournalEntry, KindWordEntry, Reflection, SafetyState } from '../types';
import { detectSafetyTier, evaluatePurposeIntegrity, sanitizeForShare, type SafetyTier } from '../data/purposeIntegrity';
import { outgrowSafetyRuntimePolicy, resolveTierRule } from '../data/safetyRuntimePolicy';

const STORAGE_KEY = 'outgrow-mvp-state-v1';
const PROLONGED_SAFE_BASE_HOURS = outgrowSafetyRuntimePolicy.prolonged_safe_mode.base_duration_hours;

const readStorage = (): AppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = { ...defaultState, ...JSON.parse(raw) } as AppState;
    return {
      ...parsed,
      safety: {
        ...defaultState.safety,
        ...parsed.safety,
        eventLog: parsed.safety?.eventLog ?? []
      }
    };
  } catch {
    return defaultState;
  }
};

const nowIso = () => new Date().toISOString();

const appendSafetyEvent = (safety: SafetyState, event: SafetyState['eventLog'][number]): SafetyState => ({
  ...safety,
  lastEventAt: event.at,
  eventLog: [event, ...safety.eventLog].slice(0, 30)
});

const isRestrictionActive = (safety: SafetyState) => {
  if (!safety.restrictionEndsAt) return false;
  return new Date(safety.restrictionEndsAt).getTime() > Date.now();
};

const applyTier = (state: AppState, tier: SafetyTier, reason: string): AppState => {
  const at = nowIso();

  if (tier === 0) {
    if (state.safety.mode === 'normal') return state;
    if (isRestrictionActive(state.safety)) {
      return {
        ...state,
        safety: appendSafetyEvent(
          {
            ...state.safety,
            riskTier: 0,
            mode: 'softened',
            reason: 'Risk lowered, but bounded safety mode remains active until the current restriction window ends.'
          },
          { at, tier, type: 'tier_transition', note: 'Tier 0 detected while restriction window is active.' }
        )
      };
    }

    return {
      ...state,
      safety: appendSafetyEvent(
        {
          ...state.safety,
          isPaused: false,
          mode: resolveTierRule(0).mode,
          riskTier: 0,
          hiddenProgress: false,
          flags: resolveTierRule(0).flags,
          reason: '',
          restrictionEndsAt: ''
        },
        { at, tier, type: 'tier_transition', note: 'Returned to tier 0 and restored normal bounded support.' }
      )
    };
  }

  if (tier === 1) {
    return {
      ...state,
      safety: appendSafetyEvent(
        {
          ...state.safety,
          isPaused: false,
          mode: resolveTierRule(1).mode,
          riskTier: 1,
          hiddenProgress: false,
          flags: resolveTierRule(1).flags,
          reason
        },
        { at, tier, type: 'tier_transition', note: 'Tier 1 caution state: softened support and reduced intensity.' }
      )
    };
  }

  if (tier === 2) {
    return {
      ...state,
      safety: appendSafetyEvent(
        {
          ...state.safety,
          isPaused: true,
          mode: resolveTierRule(2).mode,
          riskTier: 2,
          hiddenProgress: false,
          flags: resolveTierRule(2).flags,
          reason,
          restrictionEndsAt: state.safety.restrictionEndsAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        { at, tier, type: 'tier_transition', note: 'Tier 2 elevated concern: optimization/community disabled.' }
      )
    };
  }

  const redFlagCount = state.safety.eventLog.filter((event) => event.tier === 3).length + 1;
  const isProlonged = redFlagCount >= 2 || state.safety.resetRequests >= 2;
  const restrictionHours = PROLONGED_SAFE_BASE_HOURS * Math.max(1, redFlagCount);

  return {
    ...state,
    safety: appendSafetyEvent(
      {
        ...state.safety,
        isPaused: true,
        mode: isProlonged ? 'prolonged_safe_mode' : resolveTierRule(3).mode,
        riskTier: 3,
        hiddenProgress: true,
        flags: resolveTierRule(3).flags,
        reason,
        restrictionEndsAt: new Date(Date.now() + restrictionHours * 60 * 60 * 1000).toISOString()
      },
      {
        at,
        tier,
        type: 'tier_transition',
        note: isProlonged
          ? 'Tier 3 repeated: entered prolonged safe mode with escalating restriction window.'
          : 'Tier 3 detected: entered constrained safety mode.'
      }
    )
  };
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
      requestSafetyReset: () => {
        const at = nowIso();
        const nextResetRequests = state.safety.resetRequests + 1;
        const shouldEscalate = nextResetRequests >= 2 || state.safety.mode === 'prolonged_safe_mode';
        const restrictionHours = PROLONGED_SAFE_BASE_HOURS * Math.max(1, nextResetRequests);
        persist({
          ...state,
          safety: appendSafetyEvent(
            {
              ...state.safety,
              isPaused: true,
              mode: shouldEscalate ? 'prolonged_safe_mode' : resolveTierRule(2).mode,
              riskTier: Math.max(state.safety.riskTier, 2) as SafetyTier,
              reason: shouldEscalate
                ? 'Reset logged. Outgrow remains in prolonged safe mode to prevent unsafe cycling.'
                : 'Reset logged. Safety mode remains active and will restore features gradually.',
              hiddenProgress: true,
              flags: resolveTierRule(3).flags,
              resetRequests: nextResetRequests,
              restrictionEndsAt: new Date(Date.now() + restrictionHours * 60 * 60 * 1000).toISOString()
            },
            {
              at,
              tier: state.safety.riskTier,
              type: 'reset_request',
              note: `Reset request ${nextResetRequests} captured in profile.`
            }
          )
        });
      },
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
        const at = nowIso();
        if (!isPaused && isRestrictionActive(state.safety)) {
          const blocked = appendSafetyEvent(
            {
              ...state.safety,
              isPaused: true,
              reason: 'Safety restriction window is active. You can continue with low-risk support and try reset later.'
            },
            { at, tier: state.safety.riskTier, type: 'manual_pause', note: 'Manual unpause blocked by active restriction window.' }
          );
          persist({ ...state, safety: blocked });
          return;
        }

        const nextSafety = appendSafetyEvent(
          {
            ...state.safety,
            isPaused,
            reason,
            mode: isPaused ? (state.safety.mode === 'normal' ? 'restricted' : state.safety.mode) : 'normal',
            hiddenProgress: isPaused ? state.safety.hiddenProgress : false,
            riskTier: isPaused ? Math.max(state.safety.riskTier, 1) as SafetyTier : 0,
            flags: isPaused ? state.safety.flags : resolveTierRule(0).flags,
            restrictionEndsAt: isPaused ? state.safety.restrictionEndsAt : ''
          },
          { at, tier: isPaused ? state.safety.riskTier : 0, type: 'manual_pause', note: 'Manual safety pause toggled from profile.' }
        );
        persist({ ...state, safety: nextSafety });
      },
      addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'date'>) => {
        const screenedContent = sanitizeForShare(entry.content);
        const tier = detectSafetyTier(screenedContent);
        const riskAdjusted = applyTier(state, tier, tier >= 3
          ? 'Strong risk signals detected. Tracking and progress views are paused for safety.'
          : tier === 2
            ? 'Elevated concern detected. Outgrow is simplifying support and disabling optimization surfaces.'
            : tier === 1
              ? 'Caution detected. Outgrow is softening language and keeping support low-pressure.'
              : '');

        if (riskAdjusted !== state) {
          persist(riskAdjusted);
        }

        if (tier >= 3) {
          return 'I’m pausing tracking for safety right now. You can use calm support and profile settings while this is active.';
        }

        const integrity = evaluatePurposeIntegrity(screenedContent);
        if (integrity.status === 'block') {
          return integrity.message;
        }

        const full: JournalEntry = {
          ...entry,
          content: screenedContent,
          id: crypto.randomUUID(),
          date: nowIso()
        };
        const nextState = { ...riskAdjusted, journalEntries: [full, ...riskAdjusted.journalEntries] };
        persist(nextState);
        return integrity.status === 'review' ? integrity.message : '';
      },
      addReflection: (reflection: Reflection) => {
        if (!state.safety.flags.optimization_enabled) {
          return 'Weekly optimization reflections are paused while safety mode is active.';
        }
        persist({ ...state, weeklyReflections: [reflection, ...state.weeklyReflections] });
        return '';
      },
      addReturnMoment: (note: string) => {
        if (!state.safety.flags.tracking_enabled) {
          return 'Return logging is unavailable while safety mode is active.';
        }
        const full = { id: crypto.randomUUID(), note, date: nowIso() };
        persist({ ...state, returnMoments: [full, ...state.returnMoments] });
        return '';
      },
      addKindWord: (request: string, response: string) => {
        const screenedRequest = sanitizeForShare(request);
        const tier = detectSafetyTier(screenedRequest);
        const riskAdjusted = applyTier(state, tier, tier >= 3
          ? 'Strong risk signals detected. Outgrow moved into constrained safety mode.'
          : tier === 2
            ? 'Elevated concern detected. Kind support is now bounded and less generative.'
            : tier === 1
              ? 'Caution detected. Kind support is softened and less precise.'
              : '');
        if (riskAdjusted !== state) {
          persist(riskAdjusted);
        }

        if (tier >= 3) {
          return 'I can’t continue normal coaching right now. Let’s keep this to calm support and trusted human help.';
        }

        const screenedResponse = sanitizeForShare(response);
        const requestResult = evaluatePurposeIntegrity(screenedRequest);
        const responseResult = evaluatePurposeIntegrity(screenedResponse);
        if (requestResult.status === 'block' || responseResult.status === 'block') {
          return requestResult.message || responseResult.message;
        }

        const full: KindWordEntry = {
          id: crypto.randomUUID(),
          date: nowIso(),
          request: screenedRequest,
          response: screenedResponse
        };
        persist({ ...riskAdjusted, kindWords: [full, ...riskAdjusted.kindWords] });
        return '';
      },
      addCommunityShare: (content: string, category: CommunityCategory) => {
        if (!state.safety.flags.community_posting_enabled) {
          return 'Community posting is unavailable while safety restrictions are active.';
        }
        const screened = sanitizeForShare(content);
        const integrity = evaluatePurposeIntegrity(screened);
        if (integrity.status === 'block') {
          return integrity.message;
        }

        const full = {
          id: crypto.randomUUID(),
          date: nowIso(),
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

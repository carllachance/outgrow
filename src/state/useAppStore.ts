import { useMemo, useState } from 'react';
import { defaultState } from './defaultState';
import type { AppState, CommunityCategory, JournalEntry, KindWordEntry, MealLogEntry, Reflection } from '../types';
import { detectSafetyTier, evaluatePurposeIntegrity, sanitizeForShare, type SafetyTier } from '../data/purposeIntegrity';
import { outgrowSafetyRuntimePolicy, resolveTierRule } from '../data/safetyRuntimePolicy';
import { applyTier, appendSafetyEvent, isRestrictionActive } from './safetyState';
import { hydrateAppState } from './hydrateState';
import { canUseMealLogging } from './mealLogSummary';
import { buildInsightSupportLinks } from './insightProvenance';

const STORAGE_KEY = 'outgrow-mvp-state-v1';
const PROLONGED_SAFE_BASE_HOURS = outgrowSafetyRuntimePolicy.prolonged_safe_mode.base_duration_hours;

const readStorage = (): AppState => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return hydrateAppState(raw);
};

const nowIso = () => new Date().toISOString();

export const useAppStore = () => {
  const [state, setState] = useState<AppState>(() => readStorage());

  const persist = (next: AppState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const withProvenance = (next: AppState): AppState => ({
    ...next,
    insightSupportLinks: buildInsightSupportLinks(next)
  });

  return useMemo(
    () => ({
      state,
      requestSafetyReset: () => {
        const at = nowIso();
        const nowMs = Date.now();
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
                ? 'Reset logged. Outgrow remains in prolonged safe mode with safety restrictions still active.'
                : 'Reset logged. Outgrow remains in restricted safety mode with posting/coaching limits still active.',
              hiddenProgress: true,
              flags: resolveTierRule(3).flags,
              resetRequests: nextResetRequests,
              restrictionEndsAt: new Date(nowMs + restrictionHours * 60 * 60 * 1000).toISOString()
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
        if (!screenedContent) return '';
        const tier = detectSafetyTier(screenedContent);
        const at = nowIso();
        const riskAdjusted = applyTier(state, tier, tier >= 3
          ? 'Strong risk signals detected. Tracking and progress views are paused for safety.'
          : tier === 2
            ? 'Elevated concern detected. Outgrow is simplifying support and disabling optimization surfaces.'
            : tier === 1
              ? 'Caution detected. Outgrow is softening language and keeping support low-pressure.'
              : '', at);

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
        persist(withProvenance(nextState));
        return integrity.status === 'review' ? integrity.message : '';
      },
      addReflection: (reflection: Reflection) => {
        const screened = sanitizeForShare([reflection.worked, reflection.didntHold, reflection.change, reflection.adapt].join(' '));
        if (!screened) return '';
        const at = nowIso();
        const tier = detectSafetyTier(screened);
        const riskAdjusted = applyTier(state, tier, tier >= 2
          ? 'Elevated concern detected in reflection content. Outgrow is reducing optimization intensity.'
          : tier === 1
            ? 'Caution detected in reflection content. Outgrow is softening support.'
            : '', at);
        if (riskAdjusted !== state) {
          persist(riskAdjusted);
        }
        if (!riskAdjusted.safety.flags.optimization_enabled) {
          return 'Weekly optimization reflections are paused while safety mode is active.';
        }
        persist({ ...riskAdjusted, weeklyReflections: [reflection, ...riskAdjusted.weeklyReflections] });
        return '';
      },
      addReturnMoment: (note: string) => {
        const screened = sanitizeForShare(note);
        if (!screened) return '';
        const at = nowIso();
        const tier = detectSafetyTier(screened);
        const riskAdjusted = applyTier(state, tier, tier >= 2
          ? 'Elevated concern detected in return note. Outgrow is limiting tracking surfaces for safety.'
          : tier === 1
            ? 'Caution detected in return note. Outgrow is softening support.'
            : '', at);
        if (riskAdjusted !== state) {
          persist(riskAdjusted);
        }
        if (!riskAdjusted.safety.flags.tracking_enabled) {
          return 'Return logging is unavailable while safety mode is active.';
        }
        const full = { id: crypto.randomUUID(), note: screened, date: nowIso() };
        persist(withProvenance({ ...riskAdjusted, returnMoments: [full, ...riskAdjusted.returnMoments] }));
        return '';
      },
      addKindWord: (request: string, response: string) => {
        const screenedRequest = sanitizeForShare(request);
        if (!screenedRequest) return '';
        const tier = detectSafetyTier(screenedRequest);
        const at = nowIso();
        const riskAdjusted = applyTier(state, tier, tier >= 3
          ? 'Strong risk signals detected. Outgrow moved into constrained safety mode.'
          : tier === 2
            ? 'Elevated concern detected. Kind support is now bounded and less generative.'
            : tier === 1
              ? 'Caution detected. Kind support is softened and less precise.'
              : '', at);
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
        const screened = sanitizeForShare(content);
        if (!screened) return '';
        const at = nowIso();
        const tier = detectSafetyTier(screened);
        const riskAdjusted = applyTier(state, tier, tier >= 2
          ? 'Elevated concern detected in community draft. Posting is being limited for safety.'
          : tier === 1
            ? 'Caution detected in community draft. Outgrow is softening support tone.'
            : '', at);
        if (riskAdjusted !== state) {
          persist(riskAdjusted);
        }
        if (!riskAdjusted.safety.flags.community_posting_enabled) {
          return 'Community posting is unavailable while safety restrictions are active.';
        }
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
        persist({ ...riskAdjusted, communityShares: [full, ...riskAdjusted.communityShares] });
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
      },
      addMealLog: (entry: Omit<MealLogEntry, 'id' | 'createdAt'>) => {
        if (!canUseMealLogging(state.safety)) {
          return 'Meal logging is paused while safety mode is active.';
        }

        const nextEntry: MealLogEntry = {
          id: crypto.randomUUID(),
          createdAt: nowIso(),
          entryDate: entry.entryDate,
          timeMode: entry.timeMode,
          softTimeLabel: entry.softTimeLabel,
          timeRangeStart: entry.timeRangeStart,
          timeRangeEnd: entry.timeRangeEnd,
          exactTime: entry.exactTime,
          mealKind: entry.mealKind,
          rawText: entry.rawText.trim(),
          interpretedSummary: entry.interpretedSummary?.trim() || undefined,
          components: entry.components ?? [],
          interpretationConfidence: entry.interpretationConfidence,
          source: 'manual',
          wasEditedAfterInterpretation: entry.wasEditedAfterInterpretation
        };

        persist(withProvenance({ ...state, mealLogs: [nextEntry, ...state.mealLogs] }));
        return '';
      },
      removeMealLog: (id: string) => {
        persist(withProvenance({ ...state, mealLogs: state.mealLogs.filter((entry) => entry.id !== id) }));
      },
      clearMealLogs: () => {
        persist(withProvenance({ ...state, mealLogs: [] }));
      }
    }),
    [state]
  );
};

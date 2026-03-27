import { useMemo, useState } from 'react';
import { defaultState } from './defaultState';
import type { AppMode, AppState, CommunityCategory, GoalRevisionSource, JournalEntry, KindWordEntry, MealLogEntry, Reflection, RootAppState } from '../types';
import { detectSafetyTier, evaluatePurposeIntegrity, sanitizeForShare, type SafetyTier } from '../data/purposeIntegrity';
import { outgrowSafetyRuntimePolicy, resolveTierRule } from '../data/safetyRuntimePolicy';
import { applyTier, appendSafetyEvent, isRestrictionActive } from './safetyState';
import { hydrateAppState } from './hydrateState';
import { canUseMealLogging } from './mealLogSummary';
import { buildInsightSupportLinks } from './insightProvenance';
import { buildGoalRefinementSuggestions } from './goalRefinement';

const ACTIVE_MODE_STORAGE_KEY = 'outgrow.activeMode';
const LIVE_PROFILE_STORAGE_KEY = 'outgrow.profile.live';
const DEMO_PROFILE_STORAGE_KEY = 'outgrow.profile.demo';
const LEGACY_STORAGE_KEY = 'outgrow-mvp-state-v1';
const PROLONGED_SAFE_BASE_HOURS = outgrowSafetyRuntimePolicy.prolonged_safe_mode.base_duration_hours;

const isAppMode = (value: unknown): value is AppMode => value === 'live' || value === 'demo';

const readStorage = (): RootAppState => {
  const activeModeRaw = localStorage.getItem(ACTIVE_MODE_STORAGE_KEY);
  const liveRaw = localStorage.getItem(LIVE_PROFILE_STORAGE_KEY);
  const demoRaw = localStorage.getItem(DEMO_PROFILE_STORAGE_KEY);

  if (!liveRaw && !demoRaw) {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      return {
        activeMode: 'live',
        profiles: {
          live: hydrateAppState(legacyRaw),
          demo: defaultState
        }
      };
    }
  }

  return {
    activeMode: isAppMode(activeModeRaw) ? activeModeRaw : 'live',
    profiles: {
      live: hydrateAppState(liveRaw),
      demo: hydrateAppState(demoRaw)
    }
  };
};

const nowIso = () => new Date().toISOString();

export const useAppStore = () => {
  const [rootState, setRootState] = useState<RootAppState>(() => readStorage());
  const state = rootState.profiles[rootState.activeMode];

  const persistRoot = (next: RootAppState) => {
    setRootState(next);
    localStorage.setItem(ACTIVE_MODE_STORAGE_KEY, next.activeMode);
    localStorage.setItem(LIVE_PROFILE_STORAGE_KEY, JSON.stringify(next.profiles.live));
    localStorage.setItem(DEMO_PROFILE_STORAGE_KEY, JSON.stringify(next.profiles.demo));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  };

  const persist = (next: AppState) => {
    persistRoot({
      ...rootState,
      profiles: {
        ...rootState.profiles,
        [rootState.activeMode]: next
      }
    });
  };

  const withProvenance = (next: AppState): AppState => ({
    ...next,
    insightSupportLinks: buildInsightSupportLinks(next)
  });

  return useMemo(
    () => ({
      state,
      activeMode: rootState.activeMode,
      setProfileMode: (mode: AppMode) => {
        persistRoot({
          ...rootState,
          activeMode: mode
        });
      },
      resetDemoProfile: () => {
        persistRoot({
          ...rootState,
          activeMode: 'demo',
          profiles: {
            ...rootState.profiles,
            demo: defaultState
          }
        });
      },
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
                ? 'Reset logged. Safety mode stays on for now.'
                : 'Reset logged. Safety limits stay on for now.',
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
      setGoalText: (goalText: string, revisionSource: GoalRevisionSource = 'user_edit') => {
        const trimmedGoalText = goalText.trim();
        if (!trimmedGoalText) return 'Write what you are working toward before saving.';
        const at = nowIso();
        const existingGoal = state.goal;

        if (!existingGoal) {
          const createdGoalId = crypto.randomUUID();
          persist({
            ...state,
            goal: {
              id: createdGoalId,
              user_id: 'local-user',
              original_text: trimmedGoalText,
              active_display_text: trimmedGoalText,
              created_at: at,
              updated_at: at,
              status: 'active'
            },
            goalRefinementSuggestions: buildGoalRefinementSuggestions(trimmedGoalText).map((suggestion) => ({
              id: crypto.randomUUID(),
              goal_id: createdGoalId,
              suggested_text: suggestion.suggestedText,
              rationale_short: suggestion.rationaleShort,
              created_at: at
            }))
          });
          return '';
        }

        if (existingGoal.active_display_text === trimmedGoalText) return '';

        persist({
          ...state,
          goal: {
            ...existingGoal,
            active_display_text: trimmedGoalText,
            updated_at: at,
            status: 'active'
          },
          goalRevisionHistory: [
            {
              id: crypto.randomUUID(),
              goal_id: existingGoal.id,
              prior_text: existingGoal.active_display_text,
              new_text: trimmedGoalText,
              revision_source: revisionSource,
              created_at: at
            },
            ...state.goalRevisionHistory
          ],
          goalRefinementSuggestions: buildGoalRefinementSuggestions(trimmedGoalText).map((suggestion) => ({
            id: crypto.randomUUID(),
            goal_id: existingGoal.id,
            suggested_text: suggestion.suggestedText,
            rationale_short: suggestion.rationaleShort,
            created_at: at
          }))
        });
        return '';
      },
      acceptGoalSuggestion: (suggestionId: string) => {
        const suggestion = state.goalRefinementSuggestions.find((entry) => entry.id === suggestionId);
        if (!suggestion) return 'Suggestion not found.';
        const message = state.goal && state.goal.id === suggestion.goal_id
          ? ''
          : 'Start by saving your goal wording once before applying suggestions.';
        if (message) return message;

        const goalMessage = ((): string => {
          const currentGoal = state.goal;
          if (!currentGoal) return 'Goal not found.';
          const trimmedGoalText = suggestion.suggested_text.trim();
          if (!trimmedGoalText) return 'Suggestion is empty.';
          const at = nowIso();
          if (currentGoal.active_display_text !== trimmedGoalText) {
            persist({
              ...state,
              goal: {
                ...currentGoal,
                active_display_text: trimmedGoalText,
                updated_at: at
              },
              goalRevisionHistory: [
                {
                  id: crypto.randomUUID(),
                  goal_id: currentGoal.id,
                  prior_text: currentGoal.active_display_text,
                  new_text: trimmedGoalText,
                  revision_source: 'suggestion_accept',
                  created_at: at
                },
                ...state.goalRevisionHistory
              ],
              goalRefinementSuggestions: state.goalRefinementSuggestions.map((entry) =>
                entry.id === suggestionId
                  ? { ...entry, accepted_at: at, dismissed_at: undefined }
                  : entry
              )
            });
          } else {
            persist({
              ...state,
              goalRefinementSuggestions: state.goalRefinementSuggestions.map((entry) =>
                entry.id === suggestionId
                  ? { ...entry, accepted_at: at, dismissed_at: undefined }
                  : entry
              )
            });
          }
          return '';
        })();

        return goalMessage;
      },
      dismissGoalSuggestion: (suggestionId: string) => {
        const suggestionExists = state.goalRefinementSuggestions.some((entry) => entry.id === suggestionId);
        if (!suggestionExists) return;
        persist({
          ...state,
          goalRefinementSuggestions: state.goalRefinementSuggestions.map((entry) =>
            entry.id === suggestionId
              ? { ...entry, dismissed_at: nowIso(), accepted_at: undefined }
              : entry
          )
        });
      },
      addPlanItem: (
        title: string,
        itemType: AppState['planItems'][number]['item_type'] = 'other',
        sourceType: AppState['planItems'][number]['source_type'] = 'user_added'
      ) => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) return 'Write a small plan step before adding.';
        const at = nowIso();
        persist({
          ...state,
          planItems: [
            {
              id: crypto.randomUUID(),
              item_type: itemType,
              title: trimmedTitle,
              status: 'active',
              source_type: sourceType,
              created_at: at,
              updated_at: at
            },
            ...state.planItems
          ]
        });
        return '';
      },
      removePlanItem: (id: string) => {
        persist({ ...state, planItems: state.planItems.filter((item) => item.id !== id) });
      },
      updateFoodRules: (partial: Partial<AppState['foodRules']>) => {
        const normalizeList = (entries: string[] | undefined): string[] | undefined => entries
          ?.map((entry) => entry.trim())
          .filter(Boolean);
        persist({
          ...state,
          foodRules: {
            ...state.foodRules,
            ...partial,
            standingOrders: normalizeList(partial.standingOrders) ?? state.foodRules.standingOrders,
            ingredientExclusions: normalizeList(partial.ingredientExclusions) ?? state.foodRules.ingredientExclusions,
            allergies: normalizeList(partial.allergies) ?? state.foodRules.allergies
          }
        });
      },
      saveTodaySuccess: (date: string, statement: string) => {
        const trimmedStatement = statement.trim();
        if (!trimmedStatement) return 'Write your focus for today before saving.';
        persist({
          ...state,
          todaySuccessByDate: {
            ...state.todaySuccessByDate,
            [date]: trimmedStatement
          }
        });
        return '';
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
              reason: 'Safety window is still active. You can try again later.'
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
            ? 'Higher risk detected. Outgrow is simplifying support and pausing optimization.'
            : tier === 1
              ? 'Caution detected. Outgrow is softening language.'
              : '', at);

        if (riskAdjusted !== state) {
          persist(riskAdjusted);
        }

        if (tier >= 3) {
          return 'Tracking is paused for safety right now. You can still use support and profile settings.';
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
          ? 'Higher risk detected in reflection content. Outgrow is reducing planning features.'
          : tier === 1
            ? 'Caution detected in reflection content. Outgrow is softening support.'
            : '', at);
        if (riskAdjusted !== state) {
          persist(riskAdjusted);
        }
        if (!riskAdjusted.safety.flags.optimization_enabled) {
          return 'Weekly reflections are paused while safety mode is active.';
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
          ? 'Higher risk detected in return note. Outgrow is limiting tracking for safety.'
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
          ? 'Strong risk signals detected. Outgrow moved into safety mode.'
          : tier === 2
            ? 'Higher risk detected. Kind support is now more limited.'
          : tier === 1
              ? 'Caution detected. Kind support is softened.'
              : '', at);
        if (riskAdjusted !== state) {
          persist(riskAdjusted);
        }

        if (tier >= 3) {
          return 'I can’t continue normal coaching right now. Let’s keep this simple and include trusted human support.';
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
          ? 'Higher risk detected in community draft. Posting is being limited for safety.'
          : tier === 1
            ? 'Caution detected in community draft. Outgrow is softening tone.'
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
        persistRoot({
          activeMode: 'live',
          profiles: {
            live: defaultState,
            demo: defaultState
          }
        });
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
    [rootState, state]
  );
};

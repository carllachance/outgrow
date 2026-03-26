import type { AppState, SafetyState } from '../types';
import { resolveTierRule, outgrowSafetyRuntimePolicy } from '../data/safetyRuntimePolicy';
import type { SafetyTier } from '../data/purposeIntegrity';

const PROLONGED_SAFE_BASE_HOURS = outgrowSafetyRuntimePolicy.prolonged_safe_mode.base_duration_hours;

export const appendSafetyEvent = (safety: SafetyState, event: SafetyState['eventLog'][number]): SafetyState => ({
  ...safety,
  lastEventAt: event.at,
  eventLog: [event, ...safety.eventLog].slice(0, 30)
});

export const isRestrictionActive = (safety: SafetyState, nowMs = Date.now()) => {
  if (!safety.restrictionEndsAt) return false;
  return new Date(safety.restrictionEndsAt).getTime() > nowMs;
};

export const applyTier = (
  state: AppState,
  tier: SafetyTier,
  reason: string,
  at: string,
  nowMs = Date.now()
): AppState => {
  if (tier === 0) {
    if (state.safety.mode === 'normal') return state;
    if (isRestrictionActive(state.safety, nowMs)) {
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
          restrictionEndsAt: state.safety.restrictionEndsAt || new Date(nowMs + 24 * 60 * 60 * 1000).toISOString()
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
        restrictionEndsAt: new Date(nowMs + restrictionHours * 60 * 60 * 1000).toISOString()
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

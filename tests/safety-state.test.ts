import { describe, expect, it } from 'vitest';
import { detectSafetyTier } from '../src/data/purposeIntegrity';
import { applyTier, isRestrictionActive } from '../src/state/safetyState';
import { defaultState } from '../src/state/defaultState';

describe('safety-state behavior', () => {
  it('treats blank input as Tier 0 no-op', () => {
    expect(detectSafetyTier('')).toBe(0);
    expect(detectSafetyTier('   ')).toBe(0);
  });

  it('keeps restriction active in softened mode when Tier 0 is detected during active window', () => {
    const nowMs = Date.parse('2026-03-26T00:00:00.000Z');
    const restricted = {
      ...defaultState,
      safety: {
        ...defaultState.safety,
        mode: 'restricted' as const,
        riskTier: 2 as const,
        restrictionEndsAt: new Date(nowMs + 60 * 60 * 1000).toISOString()
      }
    };

    const next = applyTier(restricted, 0, '', new Date(nowMs).toISOString(), nowMs);
    expect(next.safety.mode).toBe('softened');
    expect(next.safety.riskTier).toBe(0);
    expect(next.safety.reason).toContain('restriction window');
  });

  it('restores normal mode after restriction expires and Tier 0 is detected', () => {
    const nowMs = Date.parse('2026-03-26T00:00:00.000Z');
    const prior = {
      ...defaultState,
      safety: {
        ...defaultState.safety,
        mode: 'restricted' as const,
        riskTier: 2 as const,
        flags: {
          ...defaultState.safety.flags,
          optimization_enabled: false
        },
        restrictionEndsAt: new Date(nowMs - 60 * 60 * 1000).toISOString()
      }
    };

    const next = applyTier(prior, 0, '', new Date(nowMs).toISOString(), nowMs);
    expect(next.safety.mode).toBe('normal');
    expect(next.safety.flags.optimization_enabled).toBe(true);
  });

  it('enters prolonged safe mode on repeated Tier 3 events', () => {
    const nowMs = Date.parse('2026-03-26T00:00:00.000Z');
    const prior = {
      ...defaultState,
      safety: {
        ...defaultState.safety,
        eventLog: [{ at: '2026-03-20T00:00:00.000Z', tier: 3 as const, type: 'tier_transition' as const, note: 'earlier' }]
      }
    };

    const next = applyTier(prior, 3, 'reason', new Date(nowMs).toISOString(), nowMs);
    expect(next.safety.mode).toBe('prolonged_safe_mode');
    expect(next.safety.flags.tracking_enabled).toBe(false);
  });

  it('evaluates restriction windows', () => {
    const nowMs = Date.parse('2026-03-26T00:00:00.000Z');
    expect(isRestrictionActive({ ...defaultState.safety, restrictionEndsAt: new Date(nowMs + 1000).toISOString() }, nowMs)).toBe(true);
    expect(isRestrictionActive({ ...defaultState.safety, restrictionEndsAt: new Date(nowMs - 1000).toISOString() }, nowMs)).toBe(false);
  });
});

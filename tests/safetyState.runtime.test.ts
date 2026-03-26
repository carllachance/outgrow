import { defaultState } from '../src/state/defaultState.js';
import { appendSafetyEvent, applyTier, isRestrictionActive } from '../src/state/safetyState.js';
import { outgrowSafetyRuntimePolicy } from '../src/data/safetyRuntimePolicy.js';
import type { AppState } from '../src/types.js';

const cloneState = (): AppState => JSON.parse(JSON.stringify(defaultState)) as AppState;

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const assertEqual = (actual: unknown, expected: unknown, message: string) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nReceived: ${JSON.stringify(actual)}`);
  }
};

const test = (name: string, run: () => void) => {
  run();
  console.log(`✓ ${name}`);
};

test('appendSafetyEvent updates last event and caps log length at 30', () => {
  const base = cloneState();
  const withMany = {
    ...base.safety,
    eventLog: Array.from({ length: 30 }, (_, i) => ({
      at: `2026-03-01T00:00:${String(i).padStart(2, '0')}Z`,
      tier: 1 as const,
      type: 'tier_transition' as const,
      note: `event-${i}`
    }))
  };

  const next = appendSafetyEvent(withMany, {
    at: '2026-03-26T00:00:00.000Z',
    tier: 2,
    type: 'tier_transition',
    note: 'new-event'
  });

  assert(next.lastEventAt === '2026-03-26T00:00:00.000Z', 'lastEventAt should update to new timestamp');
  assert(next.eventLog.length === 30, 'event log should remain capped at 30 entries');
  assert(next.eventLog[0].note === 'new-event', 'new event should be at front of log');
  assert(next.eventLog.at(-1)?.note === 'event-28', 'oldest entry should be truncated');
});

test('isRestrictionActive reflects restriction window', () => {
  const now = Date.parse('2026-03-26T00:00:00.000Z');
  assert(isRestrictionActive({ ...cloneState().safety, restrictionEndsAt: '' }, now) === false, 'blank restriction should be inactive');
  assert(isRestrictionActive({ ...cloneState().safety, restrictionEndsAt: '2026-03-26T01:00:00.000Z' }, now) === true, 'future restriction should be active');
  assert(isRestrictionActive({ ...cloneState().safety, restrictionEndsAt: '2026-03-25T23:59:59.000Z' }, now) === false, 'past restriction should be inactive');
});

test('applyTier tier 0 on normal state is no-op', () => {
  const state = cloneState();
  const next = applyTier(state, 0, '', '2026-03-26T00:00:00.000Z', Date.parse('2026-03-26T00:00:00.000Z'));
  assert(next === state, 'tier 0 should return same object when already normal');
});

test('applyTier keeps bounded mode active for tier 0 with active restriction', () => {
  const state = cloneState();
  state.safety.mode = 'restricted';
  state.safety.riskTier = 2;
  state.safety.restrictionEndsAt = '2026-03-26T04:00:00.000Z';

  const next = applyTier(state, 0, '', '2026-03-26T00:00:00.000Z', Date.parse('2026-03-26T00:00:00.000Z'));

  assert(next.safety.mode === 'softened', 'mode should move to softened');
  assert(next.safety.riskTier === 0, 'risk tier should drop to 0');
  assert(next.safety.restrictionEndsAt === '2026-03-26T04:00:00.000Z', 'restriction should stay until end time');
});

test('applyTier fully restores normal when restriction has expired', () => {
  const state = cloneState();
  state.safety.isPaused = true;
  state.safety.mode = 'restricted';
  state.safety.riskTier = 2;
  state.safety.hiddenProgress = true;
  state.safety.restrictionEndsAt = '2026-03-25T00:00:00.000Z';

  const next = applyTier(state, 0, '', '2026-03-26T00:00:00.000Z', Date.parse('2026-03-26T00:00:00.000Z'));

  assert(next.safety.mode === 'normal', 'mode should reset to normal');
  assert(next.safety.isPaused === false, 'pause should clear');
  assert(next.safety.hiddenProgress === false, 'hidden progress should clear');
  assert(next.safety.restrictionEndsAt === '', 'restriction window should clear');
  assertEqual(next.safety.flags, defaultState.safety.flags, 'tier 0 flags should restore defaults');
});

test('applyTier sets a 24h restriction window on tier 2 when missing', () => {
  const now = Date.parse('2026-03-26T00:00:00.000Z');
  const state = cloneState();

  const next = applyTier(state, 2, 'elevated concern', '2026-03-26T00:00:00.000Z', now);

  assert(next.safety.mode === 'restricted', 'tier 2 should set restricted mode');
  assert(next.safety.isPaused === true, 'tier 2 should pause state');
  assert(next.safety.riskTier === 2, 'tier 2 should set risk tier 2');
  assert(next.safety.restrictionEndsAt === new Date(now + 24 * 60 * 60 * 1000).toISOString(), 'tier 2 should create 24h restriction');
});

test('applyTier escalates to prolonged safe mode after repeated tier 3 events', () => {
  const now = Date.parse('2026-03-26T00:00:00.000Z');
  const state = cloneState();
  state.safety.eventLog = [{
    at: '2026-03-25T00:00:00.000Z',
    tier: 3,
    type: 'tier_transition',
    note: 'prior tier 3'
  }];

  const next = applyTier(state, 3, 'high risk', '2026-03-26T00:00:00.000Z', now);

  assert(next.safety.mode === 'prolonged_safe_mode', 'repeat tier 3 should enter prolonged mode');
  assert(next.safety.hiddenProgress === true, 'prolonged mode should keep progress hidden');
  assert(next.safety.riskTier === 3, 'risk tier should be 3');
  const expectedHours = outgrowSafetyRuntimePolicy.prolonged_safe_mode.base_duration_hours * 2;
  assert(next.safety.restrictionEndsAt === new Date(now + expectedHours * 60 * 60 * 1000).toISOString(), 'restriction should scale with red flag count');
});

console.log('All safety runtime tests passed.');

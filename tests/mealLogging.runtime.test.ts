import { hydrateAppState } from '../src/state/hydrateState.js';
import { buildWeeklyMealSummary, canUseMealLogging, canViewMealHistory } from '../src/state/mealLogSummary.js';
import { defaultState } from '../src/state/defaultState.js';
import type { MealLogEntry } from '../src/types.js';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const test = (name: string, run: () => void) => {
  run();
  console.log(`✓ ${name}`);
};

const nowIso = '2026-03-26T12:00:00.000Z';

const entries: MealLogEntry[] = [
  {
    id: '1',
    timestamp: '2026-03-25T12:00:00.000Z',
    eventType: 'meal',
    compositionTags: ['protein', 'produce'],
    portionFeel: 'sensible',
    context: 'routine'
  },
  {
    id: '2',
    timestamp: '2026-03-24T12:00:00.000Z',
    eventType: 'treat',
    compositionTags: ['sweets'],
    portionFeel: 'heavy',
    context: 'social'
  },
  {
    id: '3',
    timestamp: '2026-03-23T12:00:00.000Z',
    eventType: 'snack',
    compositionTags: ['protein', 'produce', 'fiber'],
    portionFeel: 'light',
    context: 'stress'
  }
];

test('weekly summary counts entries and keeps treat language neutral', () => {
  const summary = buildWeeklyMealSummary(entries, nowIso);
  assert(summary.totalEntries === 3, 'should count weekly entries');
  assert(summary.treatCount === 1, 'should count treats');
  assert(summary.heavyFeelCount === 1, 'should count heavy entries');
  assert(summary.stressContextCount === 1, 'should count stress context');
  assert(summary.lines.some((line) => line.includes('part of a real week')), 'treat line should stay neutral');
  assert(summary.lines.every((line) => !/cheat|bad|failure|discipline/i.test(line)), 'summary should avoid moralizing language');
});

test('weekly summary handles optional fields and old entries', () => {
  const summary = buildWeeklyMealSummary([
    {
      id: '4',
      timestamp: '2026-03-10T12:00:00.000Z',
      eventType: 'drink',
      compositionTags: [],
      portionFeel: 'light'
    }
  ], nowIso);

  assert(summary.totalEntries === 0, 'entries older than seven days should be excluded');
  assert(summary.lines[0].includes('No entries this week yet'), 'empty week line should be present');
});

test('hydration migration keeps old users safe with defaults', () => {
  const hydrated = hydrateAppState(JSON.stringify({ profile: { name: 'A', pronouns: '' } }));
  assert(Array.isArray(hydrated.mealLogs), 'meal logs should always be present');
  assert(hydrated.mealLogs.length === 0, 'meal logs should default to empty list');
  assert(hydrated.safety.flags.tracking_enabled === defaultState.safety.flags.tracking_enabled, 'safety defaults should remain intact');
});

test('safety gate helpers reflect tracking and progress visibility flags', () => {
  const disabledTracking = { ...defaultState.safety, flags: { ...defaultState.safety.flags, tracking_enabled: false } };
  const hiddenProgress = { ...defaultState.safety, flags: { ...defaultState.safety.flags, progress_visible: false } };

  assert(canUseMealLogging(disabledTracking) === false, 'tracking flag should disable meal logging');
  assert(canViewMealHistory(hiddenProgress) === false, 'progress flag should hide meal history');
});

console.log('All meal logging runtime tests passed.');

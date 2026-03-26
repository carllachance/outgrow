import { hydrateAppState } from '../src/state/hydrateState.js';
import { buildWeeklyMealSummary, canUseMealLogging, canViewMealHistory } from '../src/state/mealLogSummary.js';
import { defaultState } from '../src/state/defaultState.js';
import { interpretMealEntry } from '../src/state/mealInterpretation.js';
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
    createdAt: '2026-03-25T12:00:00.000Z',
    entryDate: '2026-03-25',
    timeMode: 'soft',
    softTimeLabel: 'Late afternoon',
    mealKind: 'snack',
    rawText: 'granola bar this afternoon',
    interpretedSummary: 'Granola bar',
    components: [{ label: 'granola bar', kind: 'main' }],
    interpretationConfidence: 'high',
    source: 'manual',
    wasEditedAfterInterpretation: false
  },
  {
    id: '2',
    createdAt: '2026-03-24T12:00:00.000Z',
    entryDate: '2026-03-24',
    timeMode: 'soft',
    softTimeLabel: 'Late night',
    mealKind: 'snack',
    rawText: 'late night chips',
    interpretedSummary: 'Late night chips',
    components: [{ label: 'chips', kind: 'ingredient' }],
    interpretationConfidence: 'medium',
    source: 'manual',
    wasEditedAfterInterpretation: false
  },
  {
    id: '3',
    createdAt: '2026-03-23T12:00:00.000Z',
    entryDate: '2026-03-23',
    timeMode: 'unknown',
    mealKind: 'unknown',
    rawText: 'coffee then sandwich later',
    interpretedSummary: 'Coffee, sandwich later',
    components: [{ label: 'coffee', kind: 'drink' }, { label: 'sandwich later', kind: 'main' }],
    interpretationConfidence: 'low',
    source: 'manual',
    wasEditedAfterInterpretation: false
  }
];

test('weekly summary keeps trends broad and approximate', () => {
  const summary = buildWeeklyMealSummary(entries, nowIso);
  assert(summary.totalEntries === 3, 'should count weekly entries');
  assert(summary.lateAfternoonSnacks === 1, 'should count late afternoon snacks');
  assert(summary.lateNightSnacks === 1, 'should count late night snacks');
  assert(summary.unknownTimeCount === 1, 'should count unknown timing entries');
  assert(summary.lines.some((line) => line.includes('Approximate logs still count')), 'summary should reinforce soft tracking');
  assert(summary.lines.every((line) => !/3:17|precise|exact minute/i.test(line)), 'summary should avoid false precision language');
});

test('hydration migration keeps old users safe with defaults', () => {
  const hydrated = hydrateAppState(JSON.stringify({ profile: { name: 'A', pronouns: '' } }));
  assert(Array.isArray(hydrated.mealLogs), 'meal logs should always be present');
  assert(hydrated.mealLogs.length === 0, 'meal logs should default to empty list');
  assert(hydrated.safety.flags.tracking_enabled === defaultState.safety.flags.tracking_enabled, 'safety defaults should remain intact');
});

test('legacy meal entries migrate to raw text preserving records', () => {
  const hydrated = hydrateAppState(JSON.stringify({
    ...defaultState,
    mealLogs: [{ id: 'legacy-1', timestamp: '2026-03-20T01:00:00.000Z', eventType: 'meal', portionFeel: 'sensible', compositionTags: [], note: 'turkey sandwich' }]
  }));

  assert(hydrated.mealLogs.length === 1, 'legacy meal log should survive migration');
  assert(hydrated.mealLogs[0].rawText === 'turkey sandwich', 'raw text should be preserved from note');
  assert(hydrated.mealLogs[0].timeMode === 'exact', 'legacy timestamp should become exact mode');
});

test('interpreter extracts soft time and components without forcing precision', () => {
  const result = interpretMealEntry({ rawText: 'turkey sandwich, white bread, mayo, tomato around lunch', entryDate: '2026-03-26' });
  assert(result.timeMode === 'soft', 'around lunch should map to soft time');
  assert(result.softTimeLabel === 'Around lunch', 'soft time label should be normalized but user-friendly');
  assert(result.components.length >= 4, 'obvious components should be extracted');
  assert(result.interpretationConfidence !== 'low', 'clear phrase should not be low confidence');
});

test('safety gate helpers reflect tracking and progress visibility flags', () => {
  const disabledTracking = { ...defaultState.safety, flags: { ...defaultState.safety.flags, tracking_enabled: false } };
  const hiddenProgress = { ...defaultState.safety, flags: { ...defaultState.safety.flags, progress_visible: false } };

  assert(canUseMealLogging(disabledTracking) === false, 'tracking flag should disable meal logging');
  assert(canViewMealHistory(hiddenProgress) === false, 'progress flag should hide meal history');
});

console.log('All meal logging runtime tests passed.');

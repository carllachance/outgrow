import { buildDeterministicSupportSeeds, removeExistingSeedDuplicates } from '../src/state/supportSeeding.js';
import type { StoredFocusArea, StoredSupportItem } from '../src/types.js';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const test = (name: string, run: () => void) => {
  run();
  console.log(`✓ ${name}`);
};

const buildFocusArea = (id: string, label: string): StoredFocusArea => ({
  id,
  intentId: 'intent-1',
  label,
  userDefined: false,
  priority: 1,
  active: true,
  createdAt: '2026-03-30T00:00:00.000Z',
  updatedAt: '2026-03-30T00:00:00.000Z'
});

test('deterministic support seeds stay grounded and capped', () => {
  const seeds = buildDeterministicSupportSeeds([
    buildFocusArea('f1', 'lunch'),
    buildFocusArea('f2', 'sleep'),
    buildFocusArea('f3', 'routine')
  ]);

  assert(seeds.length === 2, 'seeds should be capped at two');
  assert(seeds[0]?.focusAreaId === 'f1', 'first matching focus area should be used first');
  assert(seeds[0]?.text.toLowerCase().includes('lunch'), 'lunch support should be practical and specific');
  assert(Boolean(seeds[1]?.whyThisExists), 'seeded support should include a brief why');
});

test('unknown focus areas do not create filler supports', () => {
  const seeds = buildDeterministicSupportSeeds([buildFocusArea('f1', 'creative work')]);
  assert(seeds.length === 0, 'non-matching focus areas should not get placeholder support');
});

test('existing support text is deduped from future seeded supports', () => {
  const existing: StoredSupportItem[] = [{
    id: 's1',
    focusAreaId: 'f1',
    type: 'planning',
    text: 'Plan one meal ahead today.',
    active: true,
    status: 'active',
    source: 'system',
    createdAt: '2026-03-30T00:00:00.000Z',
    updatedAt: '2026-03-30T00:00:00.000Z'
  }];
  const seeded = buildDeterministicSupportSeeds([buildFocusArea('f1', 'meals'), buildFocusArea('f2', 'sleep')]);
  const unique = removeExistingSeedDuplicates(seeded, existing);
  assert(unique.length === 1, 'already-existing seeded text should not be duplicated');
  assert(unique[0]?.text.toLowerCase().includes('bedtime'), 'non-duplicate seeded item should remain');
});

console.log('All support seeding runtime tests passed.');

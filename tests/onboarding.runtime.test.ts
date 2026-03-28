import { onboardingCopy } from '../src/content/onboardingCopy.js';
import { buildGoalRefinementSuggestions } from '../src/state/goalRefinement.js';
import { defaultState } from '../src/state/defaultState.js';
import { hydrateAppState } from '../src/state/hydrateState.js';
import { inferStartingPointOptions } from '../src/state/onboardingStartingPoints.js';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const test = (name: string, run: () => void) => {
  run();
  console.log(`✓ ${name}`);
};

test('step-one framing stays broad and includes adjacent goal categories', () => {
  assert(onboardingCopy.stepOne.heading.toLowerCase().includes('outgrow'), 'step-one heading should keep broad outgrow framing');
  const helper = onboardingCopy.stepOne.helper.toLowerCase();
  assert(helper.includes('meals'), 'helper should include meals');
  assert(helper.includes('movement'), 'helper should include movement');
  assert(helper.includes('sleep'), 'helper should include sleep');
  assert(helper.includes('reminders'), 'helper should include reminders');
  assert(helper.includes('snacks'), 'helper should include snacks');
  assert(helper.includes('routines'), 'helper should include routines');
  assert(typeof onboardingCopy.stepOne.placeholder === 'string', 'step-one should use a single placeholder');
});

test('step-two offers optional support path choice', () => {
  assert(onboardingCopy.stepTwo.options.stayOnTrack.length > 0, 'stay-on-track option should exist');
  assert(onboardingCopy.stepTwo.options.buildFramework.length > 0, 'build-framework option should exist');
  assert(onboardingCopy.stepTwo.options.startSimple.length > 0, 'start-simple option should exist');
});

test('goal clarity suggestions remain optional and preserve user wording', () => {
  assert(buildGoalRefinementSuggestions('').length === 0, 'blank goals should not show placeholder suggestions');
  const goalText = 'I want to walk after work';
  const suggestions = buildGoalRefinementSuggestions(goalText);
  assert(suggestions.length > 0, 'clear goal text should produce optional suggestions');
  assert(suggestions.every((entry) => entry.suggestedText.startsWith(goalText)), 'suggestions should preserve user phrasing');
});

test('onboarding framework choice hydrates with a safe default', () => {
  const hydrated = hydrateAppState(JSON.stringify({ ...defaultState, onboarding: { ...defaultState.onboarding, frameworkChoice: 'unknown' } }));
  assert(hydrated.onboarding.frameworkChoice === 'startSimple', 'invalid stored choice should reset to startSimple');
});

test('starting-point options stay goal-aware or neutral with a deferred option', () => {
  const movementOptions = inferStartingPointOptions('I want to walk after work');
  assert(movementOptions[0].toLowerCase().includes('movement'), 'movement goals should get goal-aware options');
  assert(movementOptions.some((option) => option.toLowerCase().includes('decide after i get started')), 'options should include deferred path');

  const neutralOptions = inferStartingPointOptions('');
  assert(neutralOptions[0].toLowerCase().includes('tiny next step'), 'blank goals should use neutral options');
});

console.log('All onboarding runtime tests passed.');

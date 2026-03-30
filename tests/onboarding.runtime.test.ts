import { onboardingCopy } from '../src/content/onboardingCopy.js';
import { defaultState } from '../src/state/defaultState.js';
import { hydrateAppState } from '../src/state/hydrateState.js';
import {
  buildClarificationPrompt,
  deriveRefinedIntentText,
  seedFocusAreaLabels,
  shouldAskIntentClarification
} from '../src/state/onboardingGrow.js';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const test = (name: string, run: () => void) => {
  run();
  console.log(`✓ ${name}`);
};

test('step-one framing is grow-native and broad', () => {
  assert(onboardingCopy.stepOne.heading.toLowerCase().includes('grow'), 'step-one heading should use grow framing');
  const helper = onboardingCopy.stepOne.helper.toLowerCase();
  assert(helper.includes('food'), 'helper should include food');
  assert(helper.includes('movement'), 'helper should include movement');
  assert(helper.includes('sleep'), 'helper should include sleep');
  assert(helper.includes('routines'), 'helper should include routines');
  assert(helper.includes('presence'), 'helper should include presence');
});

test('clarification helper triggers only for broad goals', () => {
  assert(shouldAskIntentClarification('I want to feel better'), 'broad goal should request clarification');
  assert(!shouldAskIntentClarification('I want to stop skipping lunch at work'), 'concrete goal should skip clarification');
  assert(!shouldAskIntentClarification('sleep earlier'), 'short but concrete goals should skip clarification');
  assert(!shouldAskIntentClarification('eat lunch daily'), 'concise domain+action phrasing should skip clarification');
});

test('clarification prompt stays lightweight with a few options', () => {
  const prompt = buildClarificationPrompt('I need to be more present after work');
  assert(prompt.prompt.toLowerCase().includes('real life'), 'prompt should feel practical');
  assert(prompt.choices.length >= 2 && prompt.choices.length <= 4, 'clarification choices should stay lightweight');
  assert(prompt.choices.some((choice) => choice.value === 'after work'), 'choices should stay grounded in user wording');
  assert(prompt.choices[prompt.choices.length - 1]?.label === "I'd describe it differently", 'fallback choice should use stronger plain language');
});

test('focus area seeding stays pragmatic and capped', () => {
  const foodAreas = seedFocusAreaLabels('I want healthier eating habits');
  assert(foodAreas.includes('meals'), 'food intent should seed meals');

  const presentAreas = seedFocusAreaLabels('I need to be more present after work', 'presence');
  assert(presentAreas.includes('presence'), 'presence intent should preserve meaning');
  assert(presentAreas.includes('after work'), 'after-work phrasing should seed natural phrasing');
  assert(presentAreas.length <= 3, 'seeded areas should stay capped');
});

test('refined text is only generated when clarification adds value', () => {
  assert(!deriveRefinedIntentText('I want to sleep better', ''), 'empty clarification should not create refined text');
  assert(!deriveRefinedIntentText('I want better sleep', 'sleep'), 'duplicate clarification should not create refined text');
  assert(Boolean(deriveRefinedIntentText('I want to feel better', 'energy')), 'new clarification can produce refined text');
});

test('onboarding state still hydrates with safe defaults', () => {
  const hydrated = hydrateAppState(JSON.stringify({ ...defaultState, onboarding: { ...defaultState.onboarding, frameworkChoice: 'unknown' } }));
  assert(hydrated.onboarding.frameworkChoice === 'startSimple', 'invalid stored choice should reset to startSimple');
});

console.log('All onboarding runtime tests passed.');

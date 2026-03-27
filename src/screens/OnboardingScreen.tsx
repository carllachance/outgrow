import { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { WelcomeHero } from '../components/brand/WelcomeHero';
import { useStore } from '../state/AppStoreContext';

const startingPointOptions = [
  'Plan two dinners before busy days',
  'Create one reliable fallback meal',
  'Prep one repeatable breakfast'
];

const supportStyleOptions = [
  { value: 'Active', label: 'Coach me actively' },
  { value: 'Maintenance', label: 'Keep it steady and light-touch' },
  { value: 'Just in Case', label: 'Only when I ask' }
] as const;

export const OnboardingScreen = () => {
  const { state, updateOnboarding, updateProfile } = useStore();
  const navigate = useNavigate();
  const activeStep = state.onboarding.activeStep;
  const totalSteps = 3;

  const goToStep = (step: 1 | 2 | 3 | 4) => {
    updateOnboarding({ activeStep: step });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateOnboarding({ hasCompleted: true, activeStep: 3 });
    navigate('/today');
  };

  return (
    <div className="screen onboarding-screen">
      <WelcomeHero
        onPrimaryAction={() => goToStep(1)}
        onSecondaryAction={() => goToStep(3)}
      />
      {activeStep > 1 ? (
        <div className="onboarding-progress" aria-live="polite">
          Step {activeStep} of {totalSteps}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="stack">
        {activeStep === 1 ? (
          <section className="chapter" aria-labelledby="onboarding-step-one">
          <p className="panel-kicker">Step one</p>
          <h2 id="onboarding-step-one">What does a calmer food week look like for you?</h2>
          <p>One sentence is enough. We&apos;ll use this as your direction.</p>
          <textarea
            value={state.onboarding.longHorizon}
            onChange={(e) => updateOnboarding({ longHorizon: e.target.value })}
            placeholder="I trust myself to eat in a way that fits my life."
          />
          <input
            value={state.profile.name}
            onChange={(e) => updateProfile(e.target.value, state.profile.pronouns ?? '')}
            placeholder="Your name"
          />
          <button
            type="button"
            className="primary-cta"
            onClick={() => goToStep(2)}
          >
            Continue
          </button>
        </section>
        ) : null}

        {activeStep === 2 ? (
          <section className="chapter" aria-labelledby="onboarding-friction-step">
          <p className="panel-kicker">Step two</p>
          <h2 id="onboarding-friction-step">What usually makes meals harder than they need to be?</h2>
          <p>Keep it practical: schedule, energy, shopping, or prep.</p>
          <textarea
            value={state.onboarding.optionalNarrative}
            onChange={(e) => updateOnboarding({ optionalNarrative: e.target.value })}
            placeholder="I skip meals when work gets busy, then overeat at night."
          />
          <div className="inline-actions">
            <button type="button" onClick={() => goToStep(1)}>Back</button>
            <button type="button" className="primary-cta" onClick={() => goToStep(3)}>Continue</button>
          </div>
        </section>
        ) : null}

        {activeStep === 3 ? (
          <section className="chapter" aria-labelledby="onboarding-support-style-step">
          <p className="panel-kicker">Step three</p>
          <h2 id="onboarding-support-style-step">Pick your support style and this week&apos;s starting move.</h2>
          <p>Short, grounded, and built for real planning.</p>
          <div className="choices">
            {supportStyleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`choice-chip ${state.onboarding.supportTier === option.value ? 'active' : ''}`}
                onClick={() => updateOnboarding({ supportTier: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="inline-actions">
            <button type="button" onClick={() => goToStep(2)}>Back</button>
          </div>
          <h3 id="onboarding-focus-step">Practical starting point this week</h3>
          <div className="choices">
            {startingPointOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`choice-chip ${state.onboarding.currentFocus === option ? 'active' : ''}`}
                onClick={() => updateOnboarding({ currentFocus: option })}
              >
                {option}
              </button>
            ))}
          </div>
          <textarea
            value={state.onboarding.weeklyLens}
            onChange={(e) => updateOnboarding({ weeklyLens: e.target.value })}
            placeholder="This week I’ll plan two easy dinners before my busiest days and keep one fallback meal ready."
          />
          <button type="button" onClick={() => goToStep(2)}>Back</button>
          <button className="primary-cta" type="submit">
            Enter Today
          </button>
        </section>
        ) : null}
      </form>
    </div>
  );
};

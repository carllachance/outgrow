import { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { WelcomeHero } from '../components/brand/WelcomeHero';
import { useStore } from '../state/AppStoreContext';

const focusOptions = [
  'A steadier morning rhythm',
  'Less decision fatigue around meals',
  'More gentle momentum through the week'
];

export const OnboardingScreen = () => {
  const { state, updateOnboarding, updateProfile } = useStore();
  const navigate = useNavigate();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    navigate('/today');
  };

  return (
    <div className="screen onboarding-screen">
      <WelcomeHero />
      <form onSubmit={onSubmit} className="stack">
        <section className="chapter" aria-labelledby="onboarding-step-one">
          <p className="panel-kicker">Chapter one</p>
          <h2 id="onboarding-step-one">Setting the Soil.</h2>
          <p>When this season feels healthier, what will be quietly different in your daily life?</p>
          <textarea
            value={state.onboarding.longHorizon}
            onChange={(e) => updateOnboarding({ longHorizon: e.target.value })}
            placeholder="I can trust my routines without needing constant correction."
          />
          <input
            value={state.profile.name}
            onChange={(e) => updateProfile(e.target.value, state.profile.pronouns ?? '')}
            placeholder="What should we call you?"
          />
        </section>

        <section className="chapter" aria-labelledby="onboarding-focus-step">
          <p className="panel-kicker">Chapter two</p>
          <h2 id="onboarding-focus-step">Choose today&apos;s center.</h2>
          <p>Pick one anchor. We can keep everything else soft.</p>
          <div className="choices">
            {focusOptions.map((option) => (
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
            placeholder="This week, success looks like a few grounded meals and one honest check-in."
          />
          <button className="primary-cta" type="submit">
            Enter Today
          </button>
        </section>
      </form>
    </div>
  );
};

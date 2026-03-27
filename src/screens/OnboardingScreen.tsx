import { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { WelcomeHero } from '../components/brand/WelcomeHero';
import { useStore } from '../state/AppStoreContext';

const startingPointOptions = [
  'Start with one grounded breakfast',
  'Reduce dinner decision fatigue',
  'Create one reliable fallback meal'
];

const supportStyleOptions = [
  { value: 'Active', label: 'Coach me actively' },
  { value: 'Maintenance', label: 'Keep it steady and light-touch' },
  { value: 'Just in Case', label: 'Stay mostly quiet unless I ask' }
] as const;

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
          <h2 id="onboarding-step-one">I know I&apos;ve Outgrown this app when…</h2>
          <p>This is your anchor statement. We&apos;ll reuse it across planning, coaching, and reflection.</p>
          <textarea
            value={state.onboarding.longHorizon}
            onChange={(e) => updateOnboarding({ longHorizon: e.target.value })}
            placeholder="I trust myself to eat in a way that supports my life, without overthinking every decision."
          />
          <input
            value={state.profile.name}
            onChange={(e) => updateProfile(e.target.value, state.profile.pronouns ?? '')}
            placeholder="What should we call you?"
          />
        </section>

        <section className="chapter" aria-labelledby="onboarding-friction-step">
          <p className="panel-kicker">Chapter two</p>
          <h2 id="onboarding-friction-step">What&apos;s the biggest friction right now?</h2>
          <p>Name where things keep breaking down so support can meet your real life.</p>
          <textarea
            value={state.onboarding.optionalNarrative}
            onChange={(e) => updateOnboarding({ optionalNarrative: e.target.value })}
            placeholder="I skip meals when work gets intense, then over-correct at night."
          />
        </section>

        <section className="chapter" aria-labelledby="onboarding-support-style-step">
          <p className="panel-kicker">Chapter three</p>
          <h2 id="onboarding-support-style-step">What kind of support feels best?</h2>
          <p>Pick the tone you want from Outgrow right now.</p>
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
        </section>

        <section className="chapter" aria-labelledby="onboarding-focus-step">
          <p className="panel-kicker">Chapter four</p>
          <h2 id="onboarding-focus-step">What&apos;s the practical starting point this week?</h2>
          <p>Choose one concrete place to begin. We&apos;ll ladder this back to your anchor statement.</p>
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
            placeholder="This week, success looks like planning two low-effort dinners before my busiest days."
          />
          <button className="primary-cta" type="submit">
            Enter Today
          </button>
        </section>
      </form>
    </div>
  );
};

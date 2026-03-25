import { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { WelcomeHero } from '../components/brand/WelcomeHero';
import { useStore } from '../state/AppStoreContext';

export const OnboardingScreen = () => {
  const { state, updateOnboarding, updateProfile } = useStore();
  const navigate = useNavigate();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    navigate('/today');
  };

  return (
    <div className="screen">
      <WelcomeHero />
      <form onSubmit={onSubmit} className="stack">
        <Card title="Long horizon">
          <label>
            I know I&apos;ve Outgrown this when…
            <textarea
              value={state.onboarding.longHorizon}
              onChange={(e) => updateOnboarding({ longHorizon: e.target.value })}
              placeholder="I can make my routine work without daily stress."
            />
          </label>
        </Card>
        <Card title="Weekly lens">
          <label>
            This week, success looks like…
            <textarea
              value={state.onboarding.weeklyLens}
              onChange={(e) => updateOnboarding({ weeklyLens: e.target.value })}
              placeholder="Two calm dinners at home and one prepared lunch."
            />
          </label>
        </Card>
        <Card title="Current focus (optional)">
          <textarea
            value={state.onboarding.currentFocus}
            onChange={(e) => updateOnboarding({ currentFocus: e.target.value })}
            placeholder="A single area to focus on right now."
          />
        </Card>
        <Card title="Your context">
          <input
            value={state.profile.name}
            onChange={(e) => updateProfile(e.target.value, state.profile.pronouns ?? '')}
            placeholder="Name"
          />
          <input
            value={state.profile.pronouns ?? ''}
            onChange={(e) => updateProfile(state.profile.name, e.target.value)}
            placeholder="Pronouns (optional)"
          />
          <textarea
            value={state.onboarding.optionalNarrative}
            onChange={(e) => updateOnboarding({ optionalNarrative: e.target.value })}
            placeholder="Anything you want me to understand about your story."
          />
          <input
            value={state.onboarding.expectedTimeline}
            onChange={(e) => updateOnboarding({ expectedTimeline: e.target.value })}
            placeholder="Expected timeline (context, not contract)"
          />
        </Card>
        <button type="submit">Continue to Today</button>
      </form>
    </div>
  );
};

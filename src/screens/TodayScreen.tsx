import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { ReentryHero } from '../components/brand/ReentryHero';
import { WelcomeHero } from '../components/brand/WelcomeHero';
import { useStore } from '../state/AppStoreContext';

export const TodayScreen = () => {
  const { state } = useStore();
  const hasSetDirection = Boolean(state.onboarding.weeklyLens || state.onboarding.currentFocus || state.journalEntries.length);

  return (
    <div className="screen">
      {hasSetDirection ? <WelcomeHero /> : <ReentryHero />}
      <Card title="Post-intake summary">
        <p>Here&apos;s what I&apos;m hearing: you want this to be workable and steady.</p>
        <p>I&apos;ll support you with lighter nudges as confidence grows. You can adjust support any time.</p>
      </Card>
      <Card title="This week">
        <p>{state.onboarding.weeklyLens || 'Returning is the work. Start where you are today.'}</p>
      </Card>
      <Card title="Current focus">
        <p>{state.onboarding.currentFocus || 'Showing up counts. Choose one useful thing for today.'}</p>
      </Card>
      <Card title="One or two useful actions">
        <ul>
          <li>Choose one anchor meal to simplify today.</li>
          <li>Leave one note about what felt workable.</li>
        </ul>
      </Card>
      <Card title="Support level">
        <p>{state.onboarding.supportTier}</p>
      </Card>
      <div className="inline-actions">
        <Link className="button-link" to="/kind-words">
          You good?
        </Link>
        <button type="button">Chef shortcut (stub)</button>
        <button type="button">Shopping helper (stub)</button>
      </div>
    </div>
  );
};

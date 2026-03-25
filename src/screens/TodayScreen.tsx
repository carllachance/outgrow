import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { useStore } from '../state/AppStoreContext';

export const TodayScreen = () => {
  const { state } = useStore();

  return (
    <div className="screen">
      <h1>Today</h1>
      <p className="muted">Practical, calm support for right now.</p>
      <Card title="Post-intake summary">
        <p>Here&apos;s what I&apos;m hearing: you want this to be workable and steady.</p>
        <p>I&apos;ll support you with lighter nudges as confidence grows. You can adjust support any time.</p>
      </Card>
      <Card title="This week">
        <p>{state.onboarding.weeklyLens || 'Define what this week looks like in your own words.'}</p>
      </Card>
      <Card title="Current focus">
        <p>{state.onboarding.currentFocus || 'No specific focus set yet.'}</p>
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

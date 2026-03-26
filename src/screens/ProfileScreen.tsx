import { Card } from '../components/Card';
import { useStore } from '../state/AppStoreContext';
import { Link } from 'react-router-dom';

export const ProfileScreen = () => {
  const { state, updateOnboarding, setSafetyPause, requestSafetyReset } = useStore();

  return (
    <div className="screen">
      <h1>Profile</h1>
      <Card title="Support tier">
        <select value={state.onboarding.supportTier} onChange={(e) => updateOnboarding({ supportTier: e.target.value as typeof state.onboarding.supportTier })}>
          <option>Active</option>
          <option>Maintenance</option>
          <option>Just in Case</option>
        </select>
      </Card>
      <Card title="Safety pause">
        <p>When safety concerns are detected, optimization and progress framing pause by default.</p>
        <button onClick={() => setSafetyPause(!state.safety.isPaused, state.safety.isPaused ? '' : 'Manual pause for safer mode.') }>
          {state.safety.isPaused ? 'Resume (manual)' : 'Enable safety pause'}
        </button>
        {state.safety.isPaused ? <p>{state.safety.reason}</p> : null}
        <p>Mode: <strong>{state.safety.mode.replace(/_/g, ' ')}</strong> · Tier: <strong>{state.safety.riskTier}</strong></p>
        {state.safety.restrictionEndsAt ? <p>Restriction window ends: {new Date(state.safety.restrictionEndsAt).toLocaleString()}</p> : null}
        <p>Tracking: {state.safety.flags.tracking_enabled ? 'on' : 'off'} · Progress: {state.safety.flags.progress_visible ? 'visible' : 'hidden'} · Community posting: {state.safety.flags.community_posting_enabled ? 'on' : 'off'}</p>
        <p>Reset is available only here and restores features gradually.</p>
        <button type="button" onClick={requestSafetyReset}>Request safety reset</button>
        {state.safety.eventLog[0] ? <p>Last safety event: {new Date(state.safety.eventLog[0].at).toLocaleString()} — {state.safety.eventLog[0].note}</p> : null}
      </Card>
      <Card title="Privacy and lock">
        <p>Lock and privacy controls live here as account-level trust settings.</p>
        <Link className="button-link" to="/privacy">Open privacy controls</Link>
      </Card>
    </div>
  );
};

import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { useStore } from '../state/AppStoreContext';
import { Link } from 'react-router-dom';
import { inferFrameworkFromGoal } from '../state/frameworkScaffolding';

export const ProfileScreen = () => {
  const {
    state,
    updateOnboarding,
    setSafetyPause,
    requestSafetyReset,
    setGoalText,
    acceptGoalSuggestion,
    dismissGoalSuggestion,
    addPlanItem,
    removePlanItem
  } = useStore();
  const [goalDraft, setGoalDraft] = useState(state.goal?.active_display_text ?? '');
  const [goalSaveMessage, setGoalSaveMessage] = useState('');
  const [planItemDraft, setPlanItemDraft] = useState('');

  useEffect(() => {
    setGoalDraft(state.goal?.active_display_text ?? '');
  }, [state.goal?.active_display_text]);

  const framework = useMemo(() => inferFrameworkFromGoal(state.goal?.active_display_text ?? ''), [state.goal?.active_display_text]);

  const currentPlan = useMemo(() => state.planItems.filter((item) => item.status === 'active'), [state.planItems]);
  const visibleGoalSuggestions = useMemo(
    () => state.goalRefinementSuggestions.filter((suggestion) => !suggestion.dismissed_at).slice(0, 3),
    [state.goalRefinementSuggestions]
  );

  return (
    <div className="screen">
      <h1>Profile</h1>
      <Card title="What you're working toward">
        <p>Keep this in your own words. You can revise it anytime.</p>
        <textarea
          value={goalDraft}
          onChange={(event) => setGoalDraft(event.target.value)}
          placeholder="I want to stop buying random lunches at work."
        />
        <button
          type="button"
          onClick={() => {
            const responseMessage = setGoalText(goalDraft, 'user_edit');
            setGoalSaveMessage(responseMessage || 'Saved.');
          }}
        >
          Save goal wording
        </button>
        {goalSaveMessage ? <p>{goalSaveMessage}</p> : null}
        {state.goal ? <p>Original wording: “{state.goal.original_text}”</p> : null}
        {state.goalRevisionHistory[0] ? <p>Last revised: {new Date(state.goalRevisionHistory[0].created_at).toLocaleString()}</p> : null}
        {visibleGoalSuggestions.length ? (
          <div className="stack compact">
            <p>I can help tighten the wording a bit while keeping what you mean.</p>
            {visibleGoalSuggestions.map((suggestion) => (
              <div key={suggestion.id}>
                <p><strong>{suggestion.suggested_text}</strong></p>
                <div className="inline-actions">
                  <button
                    type="button"
                    onClick={() => {
                      const responseMessage = acceptGoalSuggestion(suggestion.id);
                      if (!responseMessage) {
                        setGoalDraft(suggestion.suggested_text);
                        setGoalSaveMessage('Saved.');
                      } else {
                        setGoalSaveMessage(responseMessage);
                      }
                    }}
                  >
                    Use this wording
                  </button>
                  <button type="button" onClick={() => dismissGoalSuggestion(suggestion.id)}>Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
      <Card title="Your current framework">
        <p>Here&apos;s a simple starting framework based on what you&apos;re working toward.</p>
        <ul>
          {framework.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>: {item.description}
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Current plan">
        <p>This doesn&apos;t have to be perfect. You can keep adjusting it.</p>
        {currentPlan.length ? (
          <ul>
            {currentPlan.map((item) => (
              <li key={item.id}>
                {item.title}
                <button type="button" onClick={() => removePlanItem(item.id)}>Remove</button>
              </li>
            ))}
          </ul>
        ) : <p>No plan items yet. Add one small next step when you are ready.</p>}
        <input
          value={planItemDraft}
          onChange={(event) => setPlanItemDraft(event.target.value)}
          placeholder="Add a small next step"
        />
        <button
          type="button"
          onClick={() => {
            const message = addPlanItem(planItemDraft, 'other');
            if (!message) setPlanItemDraft('');
          }}
        >
          Add plan item
        </button>
      </Card>
      <Card title="Support tier">
        <select value={state.onboarding.supportTier} onChange={(e) => updateOnboarding({ supportTier: e.target.value as typeof state.onboarding.supportTier })}>
          <option>Active</option>
          <option>Maintenance</option>
          <option>Just in Case</option>
        </select>
      </Card>
      <Card title="Safety pause">
        <p>When risk is detected, planning and progress tools pause by default.</p>
        <button onClick={() => setSafetyPause(!state.safety.isPaused, state.safety.isPaused ? '' : 'Manual pause for safer mode.') }>
          {state.safety.isPaused ? 'Resume (manual)' : 'Enable safety pause'}
        </button>
        {state.safety.isPaused ? <p>{state.safety.reason}</p> : null}
        <p>Mode: <strong>{state.safety.mode.replace(/_/g, ' ')}</strong> · Tier: <strong>{state.safety.riskTier}</strong></p>
        {state.safety.restrictionEndsAt ? <p>Restriction window ends: {new Date(state.safety.restrictionEndsAt).toLocaleString()}</p> : null}
        <p>Tracking: {state.safety.flags.tracking_enabled ? 'on' : 'off'} · Progress: {state.safety.flags.progress_visible ? 'visible' : 'hidden'} · Community posting: {state.safety.flags.community_posting_enabled ? 'on' : 'off'}</p>
        <p>Safety reset is only available here and restores features gradually.</p>
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

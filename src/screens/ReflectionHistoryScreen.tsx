import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { useStore } from '../state/AppStoreContext';
import { growthIntentAnchor } from '../state/growthIntent';

export const ReflectionHistoryScreen = () => {
  const { state } = useStore();
  const anchor = growthIntentAnchor(state.onboarding);

  return (
    <div className="screen">
      <h1>Weekly reflection history</h1>
      <p className="muted">Browse saved weekly reflections and reopen any week for full detail.</p>
      <p className="muted">Your goal: {anchor}</p>
      <Card title="Saved reflections">
        {!state.safety.flags.progress_visible ? <p>Reflection history is hidden while safety mode is active.</p> : null}
        {state.safety.flags.progress_visible && state.weeklyReflections.length === 0 ? <p>No weekly reflections yet.</p> : null}
        {state.safety.flags.progress_visible ? state.weeklyReflections.map((reflection) => {
          const reflectionDate = new Date(reflection.weekOf);
          const label = Number.isNaN(reflectionDate.getTime()) ? 'Unknown week' : reflectionDate.toLocaleDateString();
          return (
            <Link
              key={reflection.weekOf}
              to={`/journal/reflections/${encodeURIComponent(reflection.weekOf)}`}
              className="day-row-link"
            >
              <span className="day-row-date">Week of {label}</span>
              <span className="day-row-preview">{reflection.worked || reflection.change || 'View details'}</span>
              <span className="day-row-chevron" aria-hidden="true">›</span>
            </Link>
          );
        }) : null}
      </Card>
      <div className="inline-actions">
        <Link className="button-link" to="/journal">Back to Journal</Link>
      </div>
    </div>
  );
};

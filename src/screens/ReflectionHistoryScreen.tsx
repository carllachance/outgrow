import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { useStore } from '../state/AppStoreContext';
import { growthIntentAnchor } from '../state/growthIntent';

export const ReflectionHistoryScreen = () => {
  const { state } = useStore();
  const anchor = growthIntentAnchor(state.onboarding);

  return (
    <div className="screen reflection-history-screen">
      <section aria-labelledby="reflection-archive-title">
        <h1 id="reflection-archive-title">Reflection archive</h1>
        <p className="muted">A clean view of what you learned each week.</p>
      </section>

      <Card title="Saved weeks">
        <p className="muted">Anchor: {anchor}</p>
        {!state.safety.flags.progress_visible ? <p>Reflection history is hidden while safety mode is active.</p> : null}
        {state.safety.flags.progress_visible && state.weeklyReflections.length === 0 ? <p>No weekly reflections yet.</p> : null}
        {state.safety.flags.progress_visible ? state.weeklyReflections.map((reflection) => {
          const reflectionDate = new Date(reflection.weekOf);
          const label = Number.isNaN(reflectionDate.getTime())
            ? 'Unknown week'
            : reflectionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          const preview = reflection.change || reflection.worked || reflection.adapt || 'Open to review details';
          return (
            <Link
              key={reflection.weekOf}
              to={`/journal/reflections/${encodeURIComponent(reflection.weekOf)}`}
              className="history-card-link"
            >
              <span className="history-card-date">Week of {label}</span>
              <span className="history-card-title">Weekly reflection</span>
              <span className="history-card-preview">{preview}</span>
              <span className="history-card-chevron" aria-hidden="true">›</span>
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

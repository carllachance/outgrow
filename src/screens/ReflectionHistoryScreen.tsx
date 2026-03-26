import { Link } from 'react-router-dom';
import { Card } from '../components/Card';
import { useStore } from '../state/AppStoreContext';

export const ReflectionHistoryScreen = () => {
  const { state } = useStore();

  return (
    <div className="screen">
      <h1>Weekly reflection history</h1>
      <p className="muted">Browse saved weekly reflections and reopen any week for full detail.</p>
      <Card title="Saved reflections">
        {!state.safety.flags.progress_visible ? <p>Reflection history is hidden while safety mode is active.</p> : null}
        {state.safety.flags.progress_visible && state.weeklyReflections.length === 0 ? <p>No weekly reflections yet. Save one from Journal to start your history.</p> : null}
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
              <span className="day-row-preview">{reflection.worked || reflection.change || 'Open full reflection'}</span>
              <span className="day-row-chevron" aria-hidden="true">›</span>
            </Link>
          );
        }) : null}
      </Card>
      <div className="inline-actions">
        <Link className="button-link" to="/journal">Back to reflection composer</Link>
      </div>
    </div>
  );
};

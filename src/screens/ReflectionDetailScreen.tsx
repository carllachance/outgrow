import { Link, useParams } from 'react-router-dom';
import { Card } from '../components/Card';
import { useStore } from '../state/AppStoreContext';
import { growthIntentAnchor } from '../state/growthIntent';

const formatRange = (weekOf: string) => {
  const start = new Date(weekOf);
  if (Number.isNaN(start.getTime())) return 'Unknown week';
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
};

export const ReflectionDetailScreen = () => {
  const { reflectionId } = useParams();
  const { state } = useStore();
  const anchor = growthIntentAnchor(state.onboarding);
  const decodedId = reflectionId ? decodeURIComponent(reflectionId) : '';
  const reflection = state.weeklyReflections.find((entry) => entry.weekOf === decodedId);

  return (
    <div className="screen">
      <h1>Reflection detail</h1>
      {!state.safety.flags.progress_visible ? <p>Reflection detail is hidden while safety mode is active.</p> : null}
      {state.safety.flags.progress_visible && !reflection ? <p>Reflection not found.</p> : null}
      {state.safety.flags.progress_visible && reflection ? (
        <>
          <Card title="Anchor statement">
            <p>{anchor}</p>
          </Card>
          <Card title="Week range">
            <p>{formatRange(reflection.weekOf)}</p>
          </Card>
          <Card title="What worked?">
            <p>{reflection.worked || 'No answer saved.'}</p>
          </Card>
          <Card title="What didn&apos;t hold up?">
            <p>{reflection.didntHold || 'No answer saved.'}</p>
          </Card>
          <Card title="What would you change?">
            <p>{reflection.change || 'No answer saved.'}</p>
          </Card>
          <Card title="How should next week adapt?">
            <p>{reflection.adapt || 'No answer saved.'}</p>
          </Card>
        </>
      ) : null}
      <div className="inline-actions">
        <Link className="button-link" to="/journal/reflections">Back to reflection history</Link>
      </div>
    </div>
  );
};

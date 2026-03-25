import { Card } from '../components/Card';
import { useStore } from '../state/AppStoreContext';

export const GrowthScreen = () => {
  const { state, addReturnMoment } = useStore();

  return (
    <div className="screen">
      <h1>The Long Horizon</h1>
      <p className="muted">Consistency over intensity. Returning is the work.</p>
      <Card title="Where this is heading">
        <p>{state.onboarding.longHorizon || 'Define your long-horizon statement in onboarding.'}</p>
      </Card>
      <Card title="Rhythm and season">
        <p>The pace can change without progress disappearing. Hard weeks still count.</p>
      </Card>
      <Card title="Moments of return">
        <button onClick={() => addReturnMoment('I came back today and made one workable choice.')}>Log a return moment</button>
        {state.returnMoments.slice(0, 4).map((moment) => (
          <p key={moment.id}>{new Date(moment.date).toLocaleDateString()}: {moment.note}</p>
        ))}
      </Card>
    </div>
  );
};

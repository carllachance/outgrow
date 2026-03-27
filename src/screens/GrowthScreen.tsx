import { Card } from '../components/Card';
import { useStore } from '../state/AppStoreContext';
import { Link } from 'react-router-dom';
import { buildInsightSupportLinks, insightLibrary } from '../state/insightProvenance';
import { growthIntentSupportLine, scoreGrowthIntentAlignment } from '../state/growthIntent';

export const GrowthScreen = () => {
  const { state, addReturnMoment } = useStore();
  const isSafetyMode = !state.safety.flags.tracking_enabled;
  const progressHiddenMessage = 'Progress is temporarily hidden while safety mode is active.';
  const supportLinks = state.insightSupportLinks.length ? state.insightSupportLinks : buildInsightSupportLinks(state);
  const recentMealPlans = state.journalEntries.filter((entry) => entry.content.startsWith('Today plan (')).length;
  const reliableReturns = state.returnMoments.length;
  const reflectionCadence = state.weeklyReflections.length;
  const independenceSignals = [
    `Planned days logged: ${recentMealPlans}`,
    `Return moments: ${reliableReturns}`,
    `Weekly reflections: ${reflectionCadence}`
  ];
  const rankedInsights = [...insightLibrary]
    .map((insight) => ({
      insight,
      alignment: scoreGrowthIntentAlignment(`${insight.title} ${insight.statement}`, state.onboarding)
    }))
    .sort((left, right) => right.alignment - left.alignment || left.insight.title.localeCompare(right.insight.title));

  return (
    <div className="screen">
      <h1>Long view</h1>
      <p className="muted">Small steady steps add up.</p>
      <Card title="Where this is heading">
        <p>{state.onboarding.longHorizon || 'Add your long-view goal in onboarding.'}</p>
      </Card>
      <Card title="Rhythm and season">
        <p>The pace can change without progress disappearing. Hard weeks still count.</p>
        <Link className="button-link" to="/meals">Open meal log</Link>
      </Card>
      <Card title="Independence signals">
        <p className="muted">Progress means this gets easier to do on your own.</p>
        {independenceSignals.map((signal) => <p key={signal}>{signal}</p>)}
      </Card>
      <Card title="Moments of return">
        <button disabled={isSafetyMode} onClick={() => addReturnMoment('I came back today and made one workable choice.')}>Log a return moment</button>
        {isSafetyMode ? <p>{progressHiddenMessage}</p> : state.returnMoments.slice(0, 4).map((moment) => (
          <p key={moment.id}>{new Date(moment.date).toLocaleDateString()}: {moment.note}</p>
        ))}
      </Card>
      <Card title="Behavioral insights">
        <p className="muted">Sorted by your goal. {growthIntentSupportLine(state.onboarding)}</p>
        <div className="stack compact">
          {rankedInsights.map(({ insight, alignment }) => {
            const count = supportLinks.filter((link) => link.insightId === insight.id).length;
            return (
              <article key={insight.id} className="insight-card">
                <h3>{insight.title}</h3>
                <p>{insight.statement}</p>
                <p className="muted">Supporting days: {count}</p>
                <p className="muted">Alignment with anchor: {Math.round(alignment * 100)}%</p>
                <div className="inline-actions">
                  <Link className="button-link" to={`/insights/${insight.id}`}>Open insight</Link>
                  <Link className="button-link" to={`/insights/${insight.id}/days`}>View days</Link>
                </div>
              </article>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

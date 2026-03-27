import { Link, useParams } from 'react-router-dom';
import { useStore } from '../state/AppStoreContext';
import { buildInsightSupportLinks, getInsightById } from '../state/insightProvenance';

export const InsightDetailScreen = () => {
  const { insightId = '' } = useParams();
  const { state } = useStore();
  const insight = getInsightById(insightId);
  const links = (state.insightSupportLinks.length ? state.insightSupportLinks : buildInsightSupportLinks(state)).filter((link) => link.insightId === insightId);

  if (!insight) {
    return <div className="screen"><h1>Insight not found</h1></div>;
  }

  return (
    <div className="screen">
      <section className="chapter">
        <p className="panel-kicker">Insight</p>
        <h1>{insight.title}</h1>
        <p>{insight.statement}</p>
        <p className="muted">Supporting days: {links.length}</p>
        <div className="inline-actions" style={{ marginTop: '12px' }}>
          <Link className="button-link" to={`/insights/${insightId}/days`}>Supporting days</Link>
        </div>
      </section>

      <section className="chapter">
        <h3>Why these days match</h3>
        {links.slice(0, 3).map((link) => <p key={link.id}>{link.explanation ?? 'Included because this day matched part of the pattern.'}</p>)}
        {!links.length ? <p>No supporting days yet.</p> : null}
      </section>
    </div>
  );
};

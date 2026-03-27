import { Link, useParams } from 'react-router-dom';
import { useStore } from '../state/AppStoreContext';
import { buildDayContexts, buildInsightSupportLinks, getInsightById } from '../state/insightProvenance';

export const InsightSupportingDaysScreen = () => {
  const { insightId = '' } = useParams();
  const { state } = useStore();
  const insight = getInsightById(insightId);
  const days = buildDayContexts(state);
  const links = (state.insightSupportLinks.length ? state.insightSupportLinks : buildInsightSupportLinks(state))
    .filter((link) => link.insightId === insightId)
    .sort((a, b) => (a.dayId < b.dayId ? 1 : -1));

  return (
    <div className="screen">
      <div>
        <p className="panel-kicker">Supporting days</p>
        <h1>{insight?.title ?? 'Insight'}</h1>
        <p className="muted">Each day includes a short reason.</p>
      </div>

      <section className="chapter">
        {links.length ? links.map((link) => {
          const day = days.find((candidate) => candidate.dayId === link.dayId);
          return (
            <Link key={link.id} to={`/days/${link.dayId}?source=insight&insightId=${insightId}`} className="day-row-link">
              <span className="day-row-date">{new Date(`${link.dayId}T12:00:00`).toLocaleDateString()}</span>
              <span className="day-row-preview">{day?.preview ?? 'No writing saved for this day.'}</span>
              <span className="reason-badge">{link.explanation ?? 'Included because this day matched the pattern.'}</span>
              <span className="day-row-chevron" aria-hidden="true">›</span>
            </Link>
          );
        }) : <p>No supporting days linked yet.</p>}
      </section>
    </div>
  );
};

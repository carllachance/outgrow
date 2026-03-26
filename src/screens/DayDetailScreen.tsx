import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../state/AppStoreContext';
import {
  buildAuthoredTimeline,
  buildInsightSupportLinks,
  buildObservedCards,
  getInsightById,
  getRelativeDateLabel,
  parseOpenedFrom
} from '../state/insightProvenance';

export const DayDetailScreen = () => {
  const { dayId = '' } = useParams();
  const { state } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const source = parseOpenedFrom(params.get('source'));
  const originatingInsightId = params.get('insightId');

  const relativeLabel = dayId ? getRelativeDateLabel(dayId) : null;
  const authoredItems = buildAuthoredTimeline(state, dayId);
  const observedCards = buildObservedCards(state, dayId);
  const links = (state.insightSupportLinks.length ? state.insightSupportLinks : buildInsightSupportLinks(state)).filter((link) => link.dayId === dayId);

  const originInsight = originatingInsightId ? getInsightById(originatingInsightId) : null;

  return (
    <div className="screen day-detail-screen">
      <header className="day-detail-header">
        <button type="button" className="day-detail-back" onClick={() => navigate(-1)}>← Back</button>
        <p className="panel-kicker">Day detail</p>
        <h1>{dayId ? new Date(`${dayId}T12:00:00`).toLocaleDateString() : 'Day'}</h1>
        {relativeLabel ? <p className="muted">{relativeLabel}</p> : null}
        {source === 'insight' && originInsight ? <p className="origin-badge">From insight: {originInsight.title}</p> : null}
      </header>

      <section className="chapter">
        <h3>What you wrote</h3>
        {authoredItems.length ? (
          <div className="stack compact">
            {authoredItems.map((item) => (
              <article key={item.id} className="authored-item">
                <p className="muted">{item.title}{item.timeDisplay ? ` · ${item.timeDisplay}` : ''}</p>
                {item.rawText ? <p>{item.rawText}</p> : null}
                {item.interpretedSummary ? <p className="muted">Summary: {item.interpretedSummary}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <div>
            <p><strong>Nothing written for this day</strong></p>
            <p className="muted">This day can still show patterns from connected data, but there are no written entries here yet.</p>
          </div>
        )}
      </section>

      <section className="chapter">
        <h3>What the day looked like</h3>
        {observedCards.length ? (
          <div className="stack compact">
            {observedCards.map((card) => (
              <article key={card.id} className="observed-card">
                <p className="day-row-date">{card.title}</p>
                <p>{card.summary}</p>
              </article>
            ))}
          </div>
        ) : (
          <div>
            <p><strong>No connected day signals</strong></p>
            <p className="muted">There is no linked wearable or app data for this day.</p>
          </div>
        )}
      </section>

      <section className="chapter">
        <h3>Related insights</h3>
        {links.length ? (
          <div className="stack compact">
            {links.map((link) => {
              const insight = getInsightById(link.insightId);
              return (
                <Link key={link.id} to={`/insights/${link.insightId}`} className="day-row-link">
                  <span className="day-row-date">{insight?.title ?? link.insightId}</span>
                  <span className="day-row-preview">{link.explanation ?? 'Included because parts of this day match the pattern.'}</span>
                  <span className="reason-badge">Used in these patterns · {link.supportStrength} support</span>
                  <span className="day-row-chevron" aria-hidden="true">›</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div>
            <p><strong>No linked insights yet</strong></p>
            <p className="muted">Nothing from this day has been tied to a broader pattern yet.</p>
          </div>
        )}
      </section>

      <section className="chapter">
        <details>
          <summary>Day timeline</summary>
          <div className="stack compact" style={{ marginTop: '10px' }}>
            {authoredItems.length ? authoredItems.map((item) => (
              <p key={`timeline-${item.id}`}>{item.timeDisplay || 'Untimed'} · {item.title}</p>
            )) : <p className="muted">Most entries are untimed for this day.</p>}
          </div>
        </details>
      </section>
    </div>
  );
};

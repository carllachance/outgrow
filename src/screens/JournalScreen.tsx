import { FormEvent, useState } from 'react';
import { Card } from '../components/Card';
import { useStore } from '../state/AppStoreContext';
import { Link, useLocation } from 'react-router-dom';
import { buildDayContexts } from '../state/insightProvenance';
import { growthIntentAnchor } from '../state/growthIntent';

export const JournalScreen = () => {
  const { state, addJournalEntry, addReflection } = useStore();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const focusedDate = query.get('date') || new Date().toISOString().slice(0, 10);
  const focusedPlanPrefix = `Today plan (${focusedDate}):`;
  const focusedPlan = state.journalEntries.find((journalEntry) => journalEntry.content.startsWith(focusedPlanPrefix));
  const [entry, setEntry] = useState('');
  const [worked, setWorked] = useState('');
  const [didntHold, setDidntHold] = useState('');
  const [change, setChange] = useState('');
  const [adapt, setAdapt] = useState('');
  const [integrityMessage, setIntegrityMessage] = useState('');
  const recentDays = buildDayContexts(state).slice(0, 5);
  const anchor = growthIntentAnchor(state.onboarding);

  const submitEntry = (event: FormEvent) => {
    event.preventDefault();
    if (!entry.trim()) return;
    const integrityMessageFromStore = addJournalEntry({ type: 'freeform', content: entry });
    setIntegrityMessage(integrityMessageFromStore);
    if (!integrityMessageFromStore.includes('not punishment')) {
      setEntry('');
    }
  };

  const submitReflection = (event: FormEvent) => {
    event.preventDefault();
    addReflection({ weekOf: new Date().toISOString(), worked, didntHold, change, adapt });
    setWorked('');
    setDidntHold('');
    setChange('');
    setAdapt('');
  };

  return (
    <div className="screen">
      <h1>Journal</h1>
      <p className="muted">Freeform reflections for hard days, good days, and everything in between.</p>
      {query.get('focus') === 'today-plan' ? (
        <Card title="Today's journal plan">
          {focusedPlan ? (
            <>
              <p className="muted">Saved from Today.</p>
              <p>{focusedPlan.content.replace(focusedPlanPrefix, '').trim()}</p>
            </>
          ) : (
            <p className="muted">No journal plan has been saved for this date yet. Use “Plan this in Journal” on Today first.</p>
          )}
        </Card>
      ) : null}
      <Card title="Freeform journaling">
        <p className="muted">Try: Write what&apos;s on your mind, what brings you joy, or brag about yourself.</p>
        <form onSubmit={submitEntry}>
          <textarea value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="Write what's on your mind." />
          <button type="submit">Save reflection</button>
        </form>
        {integrityMessage ? <p>{integrityMessage}</p> : null}
      </Card>
      <Card title="Weekly reflection">
        <div className="inline-actions" style={{ marginBottom: '10px' }}>
          <Link className="button-link" to="/journal/reflections">View reflection history</Link>
        </div>
        <p className="muted">Reflect against your anchor statement: {anchor}</p>
        <form onSubmit={submitReflection} className="stack compact">
          <textarea value={worked} onChange={(e) => setWorked(e.target.value)} placeholder="What worked in support of your anchor?" />
          <textarea value={didntHold} onChange={(e) => setDidntHold(e.target.value)} placeholder="What got in the way of your anchor?" />
          <textarea value={change} onChange={(e) => setChange(e.target.value)} placeholder="What would you change to stay aligned?" />
          <textarea value={adapt} onChange={(e) => setAdapt(e.target.value)} placeholder="How should next week adapt to better support your anchor?" />
          <button type="submit">Save weekly reflection</button>
        </form>
      </Card>
      <Card title="Recent days">
        {!state.safety.flags.progress_visible ? <p>Past entries are hidden while safety mode is active.</p> : recentDays.length === 0 ? <p>No days logged yet. Your next entry will appear here.</p> : recentDays.map((day) => (
          <Link key={day.dayId} to={`/days/${day.dayId}?source=recent-days`} className="day-row-link">
            <span className="day-row-date">{new Date(`${day.dayId}T12:00:00`).toLocaleDateString()}</span>
            <span className="day-row-preview">{day.preview}</span>
            <span className="day-row-chevron" aria-hidden="true">›</span>
          </Link>
        ))}
      </Card>
    </div>
  );
};

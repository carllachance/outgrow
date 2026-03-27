import { FormEvent, useMemo, useState } from 'react';
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
  const [selectedContext, setSelectedContext] = useState<string[]>([]);
  const recentDays = buildDayContexts(state).slice(0, 6);
  const anchor = growthIntentAnchor(state.onboarding);

  const submitEntry = (event: FormEvent) => {
    event.preventDefault();
    if (!entry.trim()) return;
    const integrityMessageFromStore = addJournalEntry({ type: 'freeform', content: entry });
    setIntegrityMessage(integrityMessageFromStore);
    if (!integrityMessageFromStore.includes('not punishment')) {
      setEntry('');
      setSelectedContext([]);
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

  const entryPlaceholder = useMemo(() => {
    if (selectedContext.includes('overloaded')) return 'Name one thing that felt heavy and one thing you can make easier.';
    if (selectedContext.includes('low-energy')) return 'What is one minimum useful step you can still take today?';
    if (selectedContext.includes('steady')) return 'What is working that you want to repeat tomorrow?';
    return "Write what happened, what mattered, or one next step.";
  }, [selectedContext]);

  const toggleContext = (id: string) => {
    setSelectedContext((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  return (
    <div className="screen journal-screen">
      <section className="journal-header" aria-labelledby="journal-title">
        <h1 id="journal-title">Journal</h1>
        <p className="muted">Capture today clearly so tomorrow is easier.</p>
      </section>

      {query.get('focus') === 'today-plan' ? (
        <Card title="Today’s saved plan">
          {focusedPlan ? (
            <p className="journal-plan-copy">{focusedPlan.content.replace(focusedPlanPrefix, '').trim()}</p>
          ) : (
            <p className="muted">No plan saved for this date yet.</p>
          )}
        </Card>
      ) : null}

      <Card title="What happened today?">
        <form onSubmit={submitEntry} className="stack">
          <div className="journal-context">
            <p className="journal-context-label">Optional context</p>
            <div className="chip-row" role="list" aria-label="Optional context">
              {[
                { id: 'low-energy', icon: '◐', label: 'Low energy' },
                { id: 'steady', icon: '●', label: 'Steady' },
                { id: 'overloaded', icon: '△', label: 'Overloaded' }
              ].map((chip) => {
                const isSelected = selectedContext.includes(chip.id);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    className={`chip-button context-chip${isSelected ? ' selected' : ''}`}
                    onClick={() => toggleContext(chip.id)}
                    aria-pressed={isSelected}
                  >
                    <span aria-hidden="true">{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <textarea value={entry} onChange={(e) => setEntry(e.target.value)} placeholder={entryPlaceholder} />
          <button type="submit" className="primary-cta">Save entry</button>
        </form>
        {integrityMessage ? <p className="panel-copy panel-copy-support">{integrityMessage}</p> : null}
      </Card>

      <Card title="Recent entries">
        {!state.safety.flags.progress_visible ? <p>Past entries are hidden while safety mode is active.</p> : recentDays.length === 0 ? <p>No days logged yet. Your next entry will appear here.</p> : recentDays.map((day) => (
          <Link key={day.dayId} to={`/days/${day.dayId}?source=recent-days`} className="history-card-link">
            <span className="history-card-date">{new Date(`${day.dayId}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span className="history-card-title">Daily notes</span>
            <span className="history-card-preview">{day.preview}</span>
            <span className="history-card-chevron" aria-hidden="true">›</span>
          </Link>
        ))}
      </Card>

      <Card title="Weekly review">
        <p className="muted">Anchor: {anchor}</p>
        <div className="inline-actions" style={{ marginBottom: '10px' }}>
          <Link className="button-link" to="/journal/reflections">Open reflection archive</Link>
        </div>
        <form onSubmit={submitReflection} className="stack compact">
          <textarea value={worked} onChange={(e) => setWorked(e.target.value)} placeholder="What worked this week?" />
          <textarea value={didntHold} onChange={(e) => setDidntHold(e.target.value)} placeholder="What got in the way?" />
          <textarea value={change} onChange={(e) => setChange(e.target.value)} placeholder="What should change next week?" />
          <textarea value={adapt} onChange={(e) => setAdapt(e.target.value)} placeholder="How can you make next week easier?" />
          <button type="submit">Save weekly reflection</button>
        </form>
      </Card>
    </div>
  );
};

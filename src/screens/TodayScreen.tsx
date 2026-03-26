import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ReentryHero } from '../components/brand/ReentryHero';
import { BrandHeader } from '../components/brand/BrandHeader';
import { useStore } from '../state/AppStoreContext';

export const TodayScreen = () => {
  const { state, addReturnMoment } = useStore();
  const isSafetyMode = !state.safety.flags.optimization_enabled;
  const hasSetDirection = Boolean(state.onboarding.weeklyLens || state.onboarding.currentFocus || state.journalEntries.length);
  const [selectedAction, setSelectedAction] = useState('meal-intention');
  const [checkedActions, setCheckedActions] = useState<string[]>([]);
  const [tonightNoteDraft, setTonightNoteDraft] = useState('');
  const [inlineMessage, setInlineMessage] = useState('');

  const weeklyLens = state.onboarding.weeklyLens || 'Returning is the work. Start where you are today.';
  const currentFocus = state.onboarding.currentFocus || 'Showing up counts. Choose one useful thing for today.';
  const actions = useMemo(
    () => [
      {
        id: 'meal-intention',
        kind: 'simple' as const,
        label: 'Name one meal intention',
        support: 'Write one line for what steady nourishment looks like in your next meal.',
        actionLabel: 'Mark intention named',
      },
      {
        id: 'reset-walk',
        kind: 'simple' as const,
        label: 'Take a 10-minute reset walk',
        support: 'No pace goal, no distance goal. Just move and return to your breath.',
        actionLabel: 'Mark walk complete',
      },
      {
        id: 'note-tonight',
        kind: 'input' as const,
        label: 'Leave a note for tonight-you',
        support: 'Capture one sentence your later self can lean on when energy dips.',
        actionLabel: 'Save note for tonight',
      },
    ],
    [],
  );
  const latestTonightNote = state.returnMoments[0];
  const currentHour = new Date().getHours();
  const isTonightContext = currentHour >= 17 || currentHour < 4;
  const selectedActionLabel = actions.find((action) => action.id === selectedAction)?.label ?? actions[0].label;

  const toggleChecked = (actionId: string) => {
    setInlineMessage('');
    setCheckedActions((existing) =>
      existing.includes(actionId) ? existing.filter((id) => id !== actionId) : [...existing, actionId],
    );
  };

  const saveTonightNote = () => {
    if (!tonightNoteDraft.trim()) {
      setInlineMessage('Write a short note before saving.');
      return;
    }
    const result = addReturnMoment(`Tonight note: ${tonightNoteDraft.trim()}`);
    if (result) {
      setInlineMessage(result);
      return;
    }
    setInlineMessage('Saved. We will resurface this in tonight context and in Growth notes.');
    setTonightNoteDraft('');
  };

  return (
    <div className="screen today-screen">
      {hasSetDirection ? (
        <ReentryHero />
      ) : (
        <BrandHeader
          title="Glad You’re Here."
          note="This space is not for performance. It is for honest return. One chapter at a time."
          kicker="Arrival"
        />
      )}

      <section className="atmospheric-panel today-primary" aria-labelledby="today-arrival-title">
        <p className="panel-kicker">Today</p>
        <h2 id="today-arrival-title" className="panel-title">What would make today a little steadier?</h2>
        <p className="panel-copy">{currentFocus}</p>
        <p className="panel-copy panel-copy-support">{weeklyLens}</p>
        <div className="inline-actions today-primary-actions">
          <Link className="button-link primary-cta" to="/journal">
            Start: {selectedActionLabel}
          </Link>
          <Link className="button-link" to="/meals">
            Quick meal log
          </Link>
          <Link className="button-link kind-link" to="/kind-words">
            Open Kind support
          </Link>
        </div>
        {isSafetyMode ? <p className="panel-copy">Safety mode is active, so action planning and tracking are paused. Gentle support remains available.</p> : <div className="action-list" role="list" aria-label="Today actions">
          {actions.map((action) => {
            const isChecked = checkedActions.includes(action.id);
            const isSelected = selectedAction === action.id;
            return (
              <article key={action.id} className={`action-item${isSelected ? ' selected' : ''}`} role="listitem">
                <button
                  type="button"
                  className="action-check"
                  onClick={() => toggleChecked(action.id)}
                  aria-pressed={isChecked}
                  aria-label={`${isChecked ? 'Mark not done' : 'Mark done'}: ${action.label}`}
                >
                  {isChecked ? '✓' : '○'}
                </button>
                <button type="button" className="action-select" onClick={() => setSelectedAction(action.id)}>
                  {action.label}
                </button>
                <p className="action-support">{action.support}</p>
                {action.kind === 'simple' ? (
                  <button type="button" className="action-expand" onClick={() => toggleChecked(action.id)}>
                    {checkedActions.includes(action.id) ? 'Completed' : action.actionLabel}
                  </button>
                ) : (
                  <div className="today-inline-note">
                    <label htmlFor="tonight-note" className="sr-only">Tonight note</label>
                    <textarea
                      id="tonight-note"
                      value={tonightNoteDraft}
                      onChange={(event) => setTonightNoteDraft(event.target.value)}
                      placeholder="One line for your later self"
                      rows={2}
                    />
                    <button type="button" className="action-expand" onClick={saveTonightNote}>
                      {action.actionLabel}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>}
        {inlineMessage ? <p className="panel-copy">{inlineMessage}</p> : null}
        {latestTonightNote ? (
          <article className="action-item" aria-live="polite">
            <p className="panel-kicker">Tonight retrieval</p>
            {isTonightContext ? <p className="action-support">Saved note for now: {latestTonightNote.note}</p> : <p className="action-support">Your latest tonight note is stored and will reappear this evening.</p>}
            <Link className="button-link" to="/growth">Open Growth notes</Link>
          </article>
        ) : null}
      </section>

      <section className="chapter chapter-kind" aria-labelledby="today-kind-title">
        <p className="panel-kicker">Kind</p>
        <h3 id="today-kind-title">Need grounding before action?</h3>
        <p>Kind is always available as a first stop when the day feels heavy or noisy.</p>
        <div className="inline-actions" style={{ marginTop: '14px' }}>
          <Link className="button-link" to="/kind-words">
            Go to Kind now
          </Link>
        </div>
      </section>
    </div>
  );
};

import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ReentryHero } from '../components/brand/ReentryHero';
import { BrandHeader } from '../components/brand/BrandHeader';
import { useStore } from '../state/AppStoreContext';

type StretchGoal = {
  id: string;
  kind: 'simple' | 'input';
  label: string;
  support?: string;
  actionLabel: string;
};

export const TodayScreen = () => {
  const { state, addReturnMoment, saveTodaySuccess } = useStore();
  const isSafetyMode = !state.safety.flags.optimization_enabled;
  const hasSetDirection = Boolean(state.onboarding.weeklyLens || state.onboarding.currentFocus || state.journalEntries.length);
  const [expandedStretchId, setExpandedStretchId] = useState<string | null>(null);
  const [completedStretch, setCompletedStretch] = useState<string[]>([]);
  const [tonightNoteDraft, setTonightNoteDraft] = useState('');
  const [inlineMessage, setInlineMessage] = useState('');
  const [todaySuccessMessage, setTodaySuccessMessage] = useState('');

  const todayDateKey = new Date().toISOString().slice(0, 10);
  const savedTodaySuccess = state.todaySuccessByDate[todayDateKey] ?? '';
  const [todaySuccessDraft, setTodaySuccessDraft] = useState(savedTodaySuccess);

  const weeklyLens = state.onboarding.weeklyLens || 'Returning is the work.';
  const currentFocus = state.onboarding.currentFocus || 'Keep it honest and doable.';

  const recentWin = state.returnMoments[0]?.note.replace(/^Tonight note:\s*/i, '');
  const recentJournalTheme = state.journalEntries[0]?.content;
  const hour = new Date().getHours();
  const timeOfDayHint = hour < 12 ? 'this morning' : hour < 18 ? 'this afternoon' : 'tonight';

  const suggestionChips = useMemo(
    () =>
      [
        `Keep one promise to myself ${timeOfDayHint}.`,
        recentWin ? `Build on yesterday: ${recentWin.slice(0, 46)}${recentWin.length > 46 ? '…' : ''}` : '',
        recentJournalTheme
          ? `Finish one doable step from: ${recentJournalTheme.slice(0, 40)}${recentJournalTheme.length > 40 ? '…' : ''}`
          : '',
      ].filter(Boolean),
    [recentJournalTheme, recentWin, timeOfDayHint],
  );

  const stretchGoals = useMemo<StretchGoal[]>(
    () => [
      {
        id: 'reset-walk',
        kind: 'simple',
        label: 'Add a short reset walk',
        actionLabel: 'Mark done',
      },
      {
        id: 'note-tonight',
        kind: 'input',
        label: 'Leave a note for tonight-you',
        support: 'One sentence is enough.',
        actionLabel: 'Save note',
      },
      {
        id: 'kind-visit',
        kind: 'simple',
        label: 'Open Kind for a grounding minute',
        actionLabel: 'Mark done',
      },
    ],
    [],
  );

  const toggleStretchComplete = (goalId: string) => {
    setCompletedStretch((existing) =>
      existing.includes(goalId) ? existing.filter((id) => id !== goalId) : [...existing, goalId],
    );
  };

  const saveTodaySuccessDraft = () => {
    const result = saveTodaySuccess(todayDateKey, todaySuccessDraft);
    setTodaySuccessMessage(result || 'Saved your definition of success for today.');
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
    setInlineMessage('Saved for later tonight.');
    setTonightNoteDraft('');
    setExpandedStretchId(null);
  };

  return (
    <div className="screen today-screen">
      {hasSetDirection ? (
        <ReentryHero />
      ) : (
        <BrandHeader
          title="Glad You’re Here."
          note="This space is for one honest next step, not performance."
          kicker="Arrival"
        />
      )}

      <section className="atmospheric-panel today-primary" aria-labelledby="today-success-title">
        <p className="panel-kicker">Today</p>
        <h2 id="today-success-title" className="panel-title">Today, success looks like…</h2>
        <label htmlFor="today-success-input" className="sr-only">Your success definition for today</label>
        <textarea
          id="today-success-input"
          className="today-success-input"
          value={todaySuccessDraft}
          onChange={(event) => {
            setTodaySuccessDraft(event.target.value);
            setTodaySuccessMessage('');
          }}
          rows={2}
          placeholder="Example: Finish my top priority by lunch and eat one grounded meal."
        />

        {suggestionChips.length ? (
          <div className="chip-row" aria-label="Optional suggestions">
            {suggestionChips.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="chip-button"
                onClick={() => {
                  setTodaySuccessDraft(suggestion);
                  setTodaySuccessMessage('');
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        <div className="inline-actions today-primary-actions">
          <button type="button" className="button-link primary-cta" onClick={saveTodaySuccessDraft}>
            Save today’s success
          </button>
          <Link className="button-link" to="/journal">
            Plan this in Journal
          </Link>
        </div>

        {todaySuccessMessage ? <p className="panel-copy panel-copy-support">{todaySuccessMessage}</p> : null}

        {isSafetyMode ? <p className="panel-copy">Safety mode is active. Keep today simple and gentle.</p> : null}
      </section>

      <section className="chapter today-stretch" aria-labelledby="stretch-title">
        <p className="panel-kicker">Optional</p>
        <h3 id="stretch-title">Stretch goals</h3>
        <div className="stretch-list" role="list" aria-label="Optional stretch goals">
          {stretchGoals.map((goal) => {
            const isExpanded = expandedStretchId === goal.id;
            const isComplete = completedStretch.includes(goal.id);
            return (
              <article key={goal.id} className={`stretch-row${isExpanded ? ' expanded' : ''}`} role="listitem">
                <button
                  type="button"
                  className="stretch-row-trigger"
                  onClick={() => {
                    setInlineMessage('');
                    setExpandedStretchId((current) => (current === goal.id ? null : goal.id));
                  }}
                  aria-expanded={isExpanded}
                >
                  <span>{goal.label}</span>
                  <span className="stretch-row-state">{isComplete ? 'Done' : 'Optional'}</span>
                </button>

                {isExpanded ? (
                  <div className="stretch-row-inline">
                    {goal.support ? <p className="action-support">{goal.support}</p> : null}
                    {goal.kind === 'simple' ? (
                      goal.id === 'kind-visit' ? (
                        <div className="inline-actions stretch-inline-actions">
                          <Link className="button-link" to="/kind-words">
                            Open Kind
                          </Link>
                          <button type="button" className="action-expand" onClick={() => toggleStretchComplete(goal.id)}>
                            {isComplete ? 'Completed' : goal.actionLabel}
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="action-expand" onClick={() => toggleStretchComplete(goal.id)}>
                          {isComplete ? 'Completed' : goal.actionLabel}
                        </button>
                      )
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
                          {goal.actionLabel}
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        {inlineMessage ? <p className="panel-copy">{inlineMessage}</p> : null}
      </section>

      <section className="chapter today-longer-arc" aria-label="Bigger picture">
        <p className="panel-kicker">What this supports</p>
        <p className="today-longer-arc-copy">{weeklyLens || currentFocus}</p>
      </section>
    </div>
  );
};

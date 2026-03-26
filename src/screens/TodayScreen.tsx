import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ReentryHero } from '../components/brand/ReentryHero';
import { BrandHeader } from '../components/brand/BrandHeader';
import { useStore } from '../state/AppStoreContext';

type StretchGoal = {
  id: string;
  kind: 'action' | 'input' | 'link';
  label: string;
  actionLabel?: string;
  to?: string;
  support?: string;
};

export const TodayScreen = () => {
  const { state, addJournalEntry, addReturnMoment, saveTodaySuccess } = useStore();
  const isSafetyMode = !state.safety.flags.optimization_enabled;
  const hasSetDirection = Boolean(state.onboarding.weeklyLens || state.onboarding.currentFocus || state.journalEntries.length);
  const [expandedStretchId, setExpandedStretchId] = useState<string | null>(null);
  const [tonightNoteDraft, setTonightNoteDraft] = useState('');
  const [inlineMessage, setInlineMessage] = useState('');
  const [todaySuccessMessage, setTodaySuccessMessage] = useState('');
  const [resetWalkSecondsRemaining, setResetWalkSecondsRemaining] = useState(0);

  const todayDateKey = new Date().toISOString().slice(0, 10);
  const savedTodaySuccess = state.todaySuccessByDate[todayDateKey] ?? '';
  const todayPlanPrefix = `Today plan (${todayDateKey}):`;
  const hasTodayJournalPlan = state.journalEntries.some((entry) => entry.content.startsWith(todayPlanPrefix));
  const [todaySuccessDraft, setTodaySuccessDraft] = useState(savedTodaySuccess);
  const [isEditingTodaySuccess, setIsEditingTodaySuccess] = useState(false);

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
        kind: 'action',
        label: 'Add a short reset walk',
        support: 'A few minutes outside can reset your pace.',
        actionLabel: 'Start 10-minute timer',
      },
      {
        id: 'note-tonight',
        kind: 'input',
        label: 'Leave a note for tonight-you',
        support: 'One sentence is enough.',
      },
      {
        id: 'kind-visit',
        kind: 'link',
        label: 'Open Kind for a grounding minute',
        to: '/kind-words',
      },
    ],
    [],
  );

  useEffect(() => {
    if (resetWalkSecondsRemaining <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setResetWalkSecondsRemaining((seconds) => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resetWalkSecondsRemaining]);

  const startResetWalkTimer = () => {
    setResetWalkSecondsRemaining(10 * 60);
    setInlineMessage('10-minute timer started.');
  };

  const saveTodaySuccessDraft = (closeCard = true) => {
    const result = saveTodaySuccess(todayDateKey, todaySuccessDraft);
    if (result) {
      setTodaySuccessMessage(result);
      return false;
    }
    setTodaySuccessMessage('Saved for today.');
    if (closeCard) {
      setIsEditingTodaySuccess(false);
    }
    return true;
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

  const planInJournal = () => {
    const planSource = savedTodaySuccess || todaySuccessDraft;
    if (!planSource.trim()) {
      setTodaySuccessMessage('Save today\'s success statement first.');
      return;
    }
    const result = addJournalEntry({ type: 'freeform', content: `${todayPlanPrefix} ${planSource.trim()}` });
    if (result) {
      setTodaySuccessMessage(result);
      return;
    }
    setTodaySuccessMessage('Saved to Journal. You can open today\'s journal plan below.');
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
        {!isEditingTodaySuccess ? (
          <div className="today-intention-card">
            <button
              type="button"
              className="today-intention-display"
              onClick={() => {
                setTodaySuccessMessage('');
                setIsEditingTodaySuccess(true);
              }}
              aria-label="Edit today intention"
            >
              {savedTodaySuccess || 'Choose one clear intention for today.'}
            </button>
            <button
              type="button"
              className="action-expand today-change-win"
              onClick={() => {
                setTodaySuccessMessage('');
                setIsEditingTodaySuccess(true);
              }}
            >
              Edit
            </button>
          </div>
        ) : (
          <>
            <label htmlFor="today-success-input" className="sr-only">Your success definition for today</label>
            <textarea
              id="today-success-input"
              className="today-success-input"
              value={todaySuccessDraft}
              onChange={(event) => {
                setTodaySuccessDraft(event.target.value);
                setTodaySuccessMessage('');
              }}
              onBlur={() => {
                saveTodaySuccessDraft(true);
              }}
              rows={2}
              placeholder="Example: Finish my top priority by lunch and eat one grounded meal."
              autoFocus
            />

            {suggestionChips.length ? (
              <div className="chip-row" aria-label="Intention suggestions">
                {suggestionChips.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="chip-button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setTodaySuccessDraft(suggestion);
                      setTodaySuccessMessage('');
                      saveTodaySuccess(todayDateKey, suggestion);
                      setTodaySuccessMessage('Saved for today.');
                      setIsEditingTodaySuccess(false);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}

        <div className="inline-actions today-primary-actions">
          {hasTodayJournalPlan ? (
            <Link className="button-link" to={`/journal?focus=today-plan&date=${todayDateKey}`}>
              Open today&apos;s journal plan
            </Link>
          ) : (
            <button type="button" className="button-link" onClick={planInJournal}>
              Plan this in Journal
            </button>
          )}
        </div>

        {todaySuccessMessage ? <p className="panel-copy panel-copy-support">{todaySuccessMessage}</p> : null}

        {isSafetyMode ? <p className="panel-copy">Safety mode is active. Keep today simple and gentle.</p> : null}
      </section>

      <section className="chapter today-stretch" aria-label="If it helps">
        <p className="panel-kicker">If it helps</p>
        <div className="stretch-list" role="list" aria-label="Optional support actions">
          {stretchGoals.map((goal) => {
            const isExpanded = expandedStretchId === goal.id;
            const minutes = Math.floor(resetWalkSecondsRemaining / 60);
            const seconds = String(resetWalkSecondsRemaining % 60).padStart(2, '0');
            return (
              <article key={goal.id} className={`stretch-row${isExpanded ? ' expanded' : ''}`} role="listitem">
                {goal.kind === 'link' && goal.to ? (
                  <Link className="stretch-row-trigger stretch-row-link" to={goal.to}>
                    <span>{goal.label}</span>
                  </Link>
                ) : (
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
                  </button>
                )}

                {isExpanded ? (
                  <div className="stretch-row-inline">
                    {goal.support ? <p className="action-support">{goal.support}</p> : null}
                    {goal.kind === 'action' ? (
                      <div className="inline-actions stretch-inline-actions">
                        <button type="button" className="button-link" onClick={startResetWalkTimer}>
                          {goal.actionLabel}
                        </button>
                        {resetWalkSecondsRemaining > 0 ? <p className="panel-copy">{minutes}:{seconds} remaining</p> : null}
                      </div>
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
                          Save note
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
    </div>
  );
};

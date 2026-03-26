import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ReentryHero } from '../components/brand/ReentryHero';
import { BrandHeader } from '../components/brand/BrandHeader';
import { useStore } from '../state/AppStoreContext';

type DailyWin = {
  id: string;
  label: string;
  ctaLabel: string;
  ctaTo: string;
};

type StretchGoal = {
  id: string;
  kind: 'simple' | 'input';
  label: string;
  support?: string;
  actionLabel: string;
};

export const TodayScreen = () => {
  const { state, addReturnMoment } = useStore();
  const isSafetyMode = !state.safety.flags.optimization_enabled;
  const hasSetDirection = Boolean(state.onboarding.weeklyLens || state.onboarding.currentFocus || state.journalEntries.length);
  const [selectedWinId, setSelectedWinId] = useState('steady-meal');
  const [showWinPicker, setShowWinPicker] = useState(false);
  const [expandedStretchId, setExpandedStretchId] = useState<string | null>(null);
  const [completedStretch, setCompletedStretch] = useState<string[]>([]);
  const [tonightNoteDraft, setTonightNoteDraft] = useState('');
  const [inlineMessage, setInlineMessage] = useState('');

  const weeklyLens = state.onboarding.weeklyLens || 'Returning is the work.';
  const currentFocus = state.onboarding.currentFocus || 'Keep it honest and doable.';

  const dailyWins = useMemo<DailyWin[]>(
    () => [
      {
        id: 'steady-meal',
        label: 'Eat one steady meal without multitasking.',
        ctaLabel: 'Log your next meal intention',
        ctaTo: '/meals',
      },
      {
        id: 'ten-minute-reset',
        label: 'Take a 10-minute reset walk and breathe.',
        ctaLabel: 'Capture a quick check-in',
        ctaTo: '/journal',
      },
      {
        id: 'close-one-loop',
        label: 'Close one open loop you have been avoiding.',
        ctaLabel: 'Name the one thing in Journal',
        ctaTo: '/journal',
      },
    ],
    [],
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

  const selectedWin = dailyWins.find((win) => win.id === selectedWinId) ?? dailyWins[0];

  const toggleStretchComplete = (goalId: string) => {
    setCompletedStretch((existing) =>
      existing.includes(goalId) ? existing.filter((id) => id !== goalId) : [...existing, goalId],
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
        <p className="today-win-statement">{selectedWin.label}</p>

        <div className="inline-actions today-primary-actions">
          <Link className="button-link primary-cta" to={selectedWin.ctaTo}>
            {selectedWin.ctaLabel}
          </Link>
          <button
            type="button"
            className="action-expand today-change-win"
            onClick={() => setShowWinPicker((existing) => !existing)}
          >
            {showWinPicker ? 'Hide other win options' : 'Choose a different today win'}
          </button>
        </div>

        {showWinPicker ? (
          <div className="choices today-win-choices" role="list" aria-label="Today win options">
            {dailyWins.map((win) => (
              <button
                key={win.id}
                type="button"
                role="listitem"
                className={`choice-chip${selectedWinId === win.id ? ' active' : ''}`}
                onClick={() => {
                  setSelectedWinId(win.id);
                  setShowWinPicker(false);
                }}
              >
                {win.label}
              </button>
            ))}
          </div>
        ) : null}

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

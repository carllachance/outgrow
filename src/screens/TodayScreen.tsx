import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ReentryHero } from '../components/brand/ReentryHero';
import { BrandHeader } from '../components/brand/BrandHeader';
import { useStore } from '../state/AppStoreContext';
import { supportTone, todayMode, todayNextStepFromStatedIntent, type GrowthIntentInput } from '../state/growthIntent';
import { Card } from '../components/Card';
import { SupportFrameworkSurface } from '../components/grow/SupportFrameworkSurface';

type StretchGoal = {
  id: string;
  kind: 'action' | 'input' | 'link';
  label: string;
  actionLabel?: string;
  to?: string;
  support?: string;
};

type ContextChip = {
  id: string;
  label: string;
  icon: string;
};

export const TodayScreen = () => {
  const { state, addJournalEntry, addReturnMoment, saveTodaySuccess, saveOpenLoop, setSupportItemStatus, updateSupportItemText } = useStore();
  const MIN_HISTORY_FOR_PATTERN_COPY = 6;
  const isSafetyMode = !state.safety.flags.optimization_enabled;
  const growthIntentInput = useMemo<GrowthIntentInput>(() => ({
    goalText: state.goal?.active_display_text ?? '',
    planHighlights: state.planItems.filter((item) => item.status === 'active').map((item) => item.title),
    optionalNarrative: state.onboarding.optionalNarrative,
    supportTier: state.onboarding.supportTier
  }), [state.goal?.active_display_text, state.onboarding.optionalNarrative, state.onboarding.supportTier, state.planItems]);
  const hasSetDirection = Boolean(
    growthIntentInput.goalText
    || growthIntentInput.planHighlights[0]
    || state.journalEntries.length
  );
  const [expandedStretchId, setExpandedStretchId] = useState<string | null>(null);
  const [tonightNoteDraft, setTonightNoteDraft] = useState('');
  const [inlineMessage, setInlineMessage] = useState('');
  const [frameworkMessage, setFrameworkMessage] = useState('');
  const [todaySuccessMessage, setTodaySuccessMessage] = useState('');
  const [resetWalkSecondsRemaining, setResetWalkSecondsRemaining] = useState(0);
  const [loopMessage, setLoopMessage] = useState('');
  const [loopCaptureDraft, setLoopCaptureDraft] = useState('');

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
  const tone = supportTone(state.onboarding.supportTier);
  const activeIntent = state.growthIntents.find((intent) => intent.active && intent.status === 'active');
  const activeFocusAreas = useMemo(
    () => state.focusAreas
      .filter((focusArea) => focusArea.active && (!activeIntent || focusArea.intentId === activeIntent.id))
      .sort((left, right) => left.priority - right.priority),
    [activeIntent, state.focusAreas]
  );
  const activeFocusAreaIds = new Set(activeFocusAreas.map((focusArea) => focusArea.id));
  const relatedSupportItems = useMemo(
    () => state.supportItems.filter((supportItem) => activeFocusAreaIds.has(supportItem.focusAreaId)),
    [state.supportItems, activeFocusAreaIds]
  );
  const focusAreaById = useMemo(
    () => new Map(activeFocusAreas.map((focusArea) => [focusArea.id, focusArea])),
    [activeFocusAreas]
  );
  const usageHistoryCount = state.returnMoments.length + state.journalEntries.length + state.weeklyReflections.length + state.mealLogs.length;
  const hasPatternHistory = usageHistoryCount >= MIN_HISTORY_FOR_PATTERN_COPY;
  const hasExplicitIntent = Boolean(
    growthIntentInput.goalText.trim()
    || growthIntentInput.planHighlights[0]
  );
  const hasTimelyContext = Boolean(recentWin || recentJournalTheme);
  const shouldRenderGuidance = hasPatternHistory || hasExplicitIntent || hasTimelyContext;
  const mode = todayMode({
    needsImmediateHelp: !savedTodaySuccess && !todaySuccessDraft.trim(),
    hasUsageHistory: hasPatternHistory,
    hasExplicitGoal: hasExplicitIntent
  });
  const modeLine = !shouldRenderGuidance
    ? ''
    : mode === 'reflection_aware'
      ? 'From your recent notes: steady meals tend to keep your day smoother.'
      : hasExplicitIntent
        ? 'Keep today tied to your longer plan with one concrete step.'
        : recentWin
          ? 'You already left yourself a useful cue. Keep this next step specific.'
          : 'Pick one grounded next move you can actually do today.';

  const suggestionChips = useMemo(() => {
    const intentBasedNextStep = todayNextStepFromStatedIntent(growthIntentInput);
    if (!shouldRenderGuidance) return [];
    const suggestions = [
      tone === 'simple'
        ? (intentBasedNextStep ?? '')
        : (intentBasedNextStep ?? ''),
      hasPatternHistory ? 'Planning one real meal now will likely land better than grazing later.' : '',
      hasTimelyContext && hasExplicitIntent ? `Keep one planned promise ${timeOfDayHint}.` : '',
      recentWin ? `Build on yesterday: ${recentWin.slice(0, 46)}${recentWin.length > 46 ? '…' : ''}` : '',
      recentJournalTheme
        ? `Finish one doable step from: ${recentJournalTheme.slice(0, 40)}${recentJournalTheme.length > 40 ? '…' : ''}`
        : '',
    ].filter(Boolean);
    if (tone === 'simple') return suggestions.slice(0, 2);
    if (tone === 'teach') return suggestions;
    return suggestions.slice(0, 4);
  }, [growthIntentInput, hasExplicitIntent, hasPatternHistory, hasTimelyContext, recentJournalTheme, recentWin, shouldRenderGuidance, timeOfDayHint, tone]);

  const contextChips: ContextChip[] = [
    { id: 'low-energy', icon: '◐', label: 'Low energy' },
    { id: 'steady', icon: '●', label: 'Steady' },
    { id: 'stretched', icon: '△', label: 'Stretched' },
    { id: 'need-support', icon: '♡', label: 'Need support' },
  ];
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);

  const toggleContext = (id: string) => {
    setSelectedContextIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const stretchGoals = useMemo<StretchGoal[]>(
    () => [
      {
        id: 'reset-walk',
        kind: 'action',
        label: 'Add a short reset walk',
        support: 'A few minutes outside can help you reset.',
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

  const openLoops = state.openLoops.filter((loop) => loop.state !== 'done' && loop.state !== 'dropped');
  const loopGroups = {
    needsNextStep: openLoops.filter((loop) => loop.state !== 'waiting' && !loop.nextVisibleStep?.trim()),
    waitingOnSomeone: openLoops.filter((loop) => loop.state === 'waiting'),
    worthDoingSoon: openLoops.filter((loop) => loop.state === 'clarified' && loop.nextVisibleStep?.trim())
  };

  const captureOpenLoop = () => {
    const trimmedTitle = loopCaptureDraft.trim();
    if (!trimmedTitle) {
      setLoopMessage('Write the thing first.');
      return;
    }
    const result = saveOpenLoop({ title: trimmedTitle, state: 'captured' });
    if (!result.ok) {
      setLoopMessage(result.message);
      return;
    }
    setLoopCaptureDraft('');
    setLoopMessage('Saved. You do not have to carry that in your head.');
  };

  const saveTonightNote = () => {
    if (!tonightNoteDraft.trim()) {
      setInlineMessage('Write a short note first.');
      return;
    }
    const result = addReturnMoment(`Tonight note: ${tonightNoteDraft.trim()}`);
    if (result) {
      setInlineMessage(result);
      return;
    }
    setInlineMessage('Saved for later.');
    setTonightNoteDraft('');
    setExpandedStretchId(null);
  };

  const planInJournal = () => {
    const planSource = savedTodaySuccess || todaySuccessDraft;
    if (!planSource.trim()) {
      setTodaySuccessMessage('Save today\'s focus first.');
      return;
    }
    const result = addJournalEntry({ type: 'freeform', content: `${todayPlanPrefix} ${planSource.trim()}` });
    if (result) {
      setTodaySuccessMessage(result);
      return;
    }
    setTodaySuccessMessage('Saved to Journal. You can open today’s plan below.');
  };

  return (
    <div className="screen today-screen">
      {hasSetDirection ? (
        <ReentryHero />
      ) : (
        <BrandHeader
          title="Glad You’re Here."
          note="Start with one honest next step."
          kicker="Arrival"
        />
      )}

      <section className="atmospheric-panel today-primary" aria-labelledby="today-success-title">
        <p className="panel-kicker">Today</p>
        <h2 id="today-success-title" className="panel-title">What needs to happen today?</h2>
        {shouldRenderGuidance && modeLine ? <p className="panel-copy panel-copy-support">{modeLine}</p> : null}
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
              {savedTodaySuccess || 'Pick one clear focus for today.'}
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
              placeholder="Example: Finish my top priority by lunch and eat one steady meal."
              autoFocus
            />

            <div className="today-context" aria-label="Optional context">
              <p className="today-context-label">Optional context</p>
              <div className="chip-row" role="list">
                {contextChips.map((chip) => {
                  const isSelected = selectedContextIds.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      className={`chip-button context-chip${isSelected ? ' selected' : ''}`}
                      onMouseDown={(event) => event.preventDefault()}
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

      <section className="chapter" aria-labelledby="follow-through-card">
        <p className="panel-kicker">Follow-through</p>
        <h3 id="follow-through-card">Today, follow-through means…</h3>
        <p className="panel-copy">Get one loose thread out of your head, make it smaller, or close it on purpose.</p>
        <div className="today-inline-note">
          <label htmlFor="open-loop-capture" className="sr-only">Capture an open loop</label>
          <textarea
            id="open-loop-capture"
            value={loopCaptureDraft}
            onChange={(event) => {
              setLoopCaptureDraft(event.target.value);
              setLoopMessage('');
            }}
            placeholder="Something I do not want to lose today"
            rows={2}
          />
          <button type="button" className="action-expand" onClick={captureOpenLoop}>
            Capture something
          </button>
        </div>
        {loopMessage ? <p className="panel-copy">{loopMessage}</p> : null}
      </section>

      <section className="chapter" aria-labelledby="loop-review">
        <p className="panel-kicker">Evening review</p>
        <h3 id="loop-review">Anything still open?</h3>
        <p className="panel-copy">These are the things you asked Outgrow not to let disappear.</p>
        {openLoops.length === 0 ? (
          <p className="panel-copy">Nothing saved here yet. Add a loose thread when you want help remembering it.</p>
        ) : (
          <div className="stack">
            <p><strong>Needs a next step</strong> · {loopGroups.needsNextStep.length}</p>
            <p><strong>Waiting on someone</strong> · {loopGroups.waitingOnSomeone.length}</p>
            <p><strong>Worth doing soon</strong> · {loopGroups.worthDoingSoon.length}</p>
          </div>
        )}
      </section>

      <section className="chapter today-stretch" aria-label="Optional support">
        <p className="panel-kicker">Optional support</p>
        <h3 className="today-support-title">If you want extra support</h3>
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

      {(activeFocusAreas.length || relatedSupportItems.length) ? (
        <Card title="Your support framework">
          <SupportFrameworkSurface
            focusAreas={activeFocusAreas}
            supportItems={relatedSupportItems}
            focusAreaById={focusAreaById}
            onPauseSupport={(supportItemId) => {
              const result = setSupportItemStatus(supportItemId, 'paused');
              setFrameworkMessage(result.ok ? 'Support paused.' : result.message);
            }}
            onRetireSupport={(supportItemId) => {
              const result = setSupportItemStatus(supportItemId, 'retired');
              setFrameworkMessage(result.ok ? 'Support retired.' : result.message);
            }}
            onActivateSupport={(supportItemId) => {
              const result = setSupportItemStatus(supportItemId, 'active');
              setFrameworkMessage(result.ok ? 'Support is active again.' : result.message);
            }}
            onEditSupport={(supportItemId, nextText) => {
              const result = updateSupportItemText(supportItemId, nextText);
              setFrameworkMessage(result.ok ? 'Support updated.' : result.message);
            }}
            emptySupportMessage="No active supports yet. Keeping this simple is okay."
          />
          {frameworkMessage ? <p className="panel-copy">{frameworkMessage}</p> : null}
        </Card>
      ) : null}
    </div>
  );
};

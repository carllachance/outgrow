import { FormEvent, useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { useStore } from '../state/AppStoreContext';
import { buildMealLogEntry, interpretMealEntry } from '../state/mealInterpretation';
import type { MealKind, TimeMode } from '../types';
import { buildWeeklyMealSummary, canUseMealLogging, canViewMealHistory } from '../state/mealLogSummary';

const MEAL_KINDS: MealKind[] = ['unknown', 'breakfast', 'lunch', 'dinner', 'snack', 'drink'];

const todayDate = () => new Date().toISOString().slice(0, 10);

export const MealLogScreen = () => {
  const { state, addMealLog, removeMealLog } = useStore();
  const trackingEnabled = canUseMealLogging(state.safety);
  const historyVisible = canViewMealHistory(state.safety);

  const [rawText, setRawText] = useState('');
  const [entryDate, setEntryDate] = useState(todayDate());
  const [showDetails, setShowDetails] = useState(false);
  const [storeMessage, setStoreMessage] = useState('');

  const interpreted = useMemo(() => interpretMealEntry({ rawText, entryDate }), [rawText, entryDate]);

  const [timeModeOverride, setTimeModeOverride] = useState<TimeMode | ''>('');
  const [softTimeOverride, setSoftTimeOverride] = useState('');
  const [mealKindOverride, setMealKindOverride] = useState<MealKind | ''>('');
  const [summaryOverride, setSummaryOverride] = useState('');

  const weeklySummary = useMemo(() => buildWeeklyMealSummary(state.mealLogs), [state.mealLogs]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!rawText.trim()) {
      setStoreMessage('Please add at least a short food note.');
      return;
    }

    const hasEdits = Boolean(timeModeOverride || softTimeOverride || mealKindOverride || summaryOverride.trim());

    const message = addMealLog(buildMealLogEntry({
      rawText,
      entryDate,
      interpretation: interpreted,
      edited: hasEdits
        ? {
          timeMode: timeModeOverride || interpreted.timeMode,
          softTimeLabel: softTimeOverride.trim() || interpreted.softTimeLabel,
          mealKind: mealKindOverride || interpreted.mealKind,
          interpretedSummary: summaryOverride.trim() || interpreted.interpretedSummary
        }
        : undefined
    }));

    setStoreMessage(message || 'Saved. You can edit details later anytime.');
    if (!message) {
      setRawText('');
      setTimeModeOverride('');
      setSoftTimeOverride('');
      setMealKindOverride('');
      setSummaryOverride('');
      setShowDetails(false);
      setEntryDate(todayDate());
    }
  };

  return (
    <div className="screen">
      <h1>Meal log</h1>
      <p className="muted">Log meals or snacks now or later. Approximate timing is welcome.</p>
      <Card title="Add meal or snack">
        {trackingEnabled ? (
          <form onSubmit={submit} className="stack compact">
            <label>
              What did you have? You can be approximate.
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Example: turkey sandwich, around lunch"
              />
            </label>
            <label>
              Day (optional)
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </label>

            {rawText.trim() ? (
              <div>
                <p className="muted">Looks like</p>
                <p>
                  {(mealKindOverride || interpreted.mealKind || 'unknown').replace('_', ' ')}
                  {' · '}
                  {softTimeOverride || interpreted.softTimeLabel || ((timeModeOverride || interpreted.timeMode) === 'exact' ? 'Exact time' : 'Time open')}
                </p>
                <p>{summaryOverride || interpreted.interpretedSummary || rawText}</p>
              </div>
            ) : null}

            <button type="button" onClick={() => setShowDetails((current) => !current)}>
              {showDetails ? 'Hide details' : 'Edit details'}
            </button>

            {showDetails ? (
              <div className="stack compact">
                <label>
                  Time mode
                  <select value={timeModeOverride} onChange={(e) => setTimeModeOverride(e.target.value as TimeMode | '')}>
                    <option value="">Use interpretation ({interpreted.timeMode})</option>
                    <option value="soft">Soft</option>
                    <option value="exact">Exact</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </label>
                <label>
                  Soft time label
                  <input
                    value={softTimeOverride}
                    onChange={(e) => setSoftTimeOverride(e.target.value)}
                    placeholder={interpreted.softTimeLabel || 'around lunch'}
                  />
                </label>
                <label>
                  Meal type
                  <select value={mealKindOverride} onChange={(e) => setMealKindOverride(e.target.value as MealKind | '')}>
                    <option value="">Use interpretation ({interpreted.mealKind})</option>
                    {MEAL_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                  </select>
                </label>
                <label>
                  Understood as
                  <input
                    value={summaryOverride}
                    onChange={(e) => setSummaryOverride(e.target.value)}
                    placeholder={interpreted.interpretedSummary || rawText}
                  />
                </label>
              </div>
            ) : null}

            <button type="submit">Save</button>
            {storeMessage ? <p>{storeMessage}</p> : null}
          </form>
        ) : (
          <p>Meal logging is paused while safety mode is active. Calm support stays available.</p>
        )}
      </Card>

      <Card title="Weekly pattern summary">
        {!historyVisible ? (
          <p>Meal history is hidden while safety mode is active.</p>
        ) : (
          <>
            <p className="muted">
              This week: {weeklySummary.totalEntries} entries · late afternoon snacks: {weeklySummary.lateAfternoonSnacks} · late night snacks: {weeklySummary.lateNightSnacks}
            </p>
            {weeklySummary.lines.map((line) => <p key={line}>{line}</p>)}
          </>
        )}
      </Card>

      <Card title="Recent meal logs">
        {!historyVisible ? <p>Meal history is hidden while safety mode is active.</p> : state.mealLogs.slice(0, 8).map((entry) => (
          <article key={entry.id} className="meal-log-item">
            <p>
              <strong>{entry.mealKind ?? 'unknown'}</strong> · {entry.softTimeLabel || entry.timeMode} · {new Date(entry.createdAt).toLocaleString()}
            </p>
            <p>{entry.interpretedSummary || entry.rawText}</p>
            {entry.rawText !== entry.interpretedSummary ? <p className="muted">Original: {entry.rawText}</p> : null}
            {entry.wasEditedAfterInterpretation ? <p className="muted">Edited after interpretation.</p> : null}
            {trackingEnabled ? <button type="button" onClick={() => removeMealLog(entry.id)}>Remove</button> : null}
          </article>
        ))}
      </Card>
    </div>
  );
};

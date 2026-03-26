import { FormEvent, useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { useStore } from '../state/AppStoreContext';
import type { CompositionTag, MealContext, MealEventType, PortionFeel } from '../types';
import { buildWeeklyMealSummary, canUseMealLogging, canViewMealHistory } from '../state/mealLogSummary';

const EVENT_TYPES: MealEventType[] = ['meal', 'snack', 'treat', 'drink'];
const COMPOSITION_TAGS: CompositionTag[] = ['protein', 'produce', 'fiber', 'starch', 'sweets', 'fried_heavy', 'ultra_processed', 'alcohol', 'caffeine'];
const PORTION_FEELS: PortionFeel[] = ['light', 'sensible', 'heavy'];
const CONTEXTS: MealContext[] = ['hungry', 'convenience', 'stress', 'social', 'celebration', 'bored', 'routine'];

export const MealLogScreen = () => {
  const { state, addMealLog, removeMealLog } = useStore();
  const trackingEnabled = canUseMealLogging(state.safety);
  const historyVisible = canViewMealHistory(state.safety);

  const [eventType, setEventType] = useState<MealEventType>('meal');
  const [compositionTags, setCompositionTags] = useState<CompositionTag[]>([]);
  const [portionFeel, setPortionFeel] = useState<PortionFeel>('sensible');
  const [context, setContext] = useState<MealContext | ''>('');
  const [note, setNote] = useState('');
  const [storeMessage, setStoreMessage] = useState('');

  const weeklySummary = useMemo(() => buildWeeklyMealSummary(state.mealLogs), [state.mealLogs]);

  const toggleTag = (tag: CompositionTag) => {
    setCompositionTags((current) => current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const message = addMealLog({
      eventType,
      compositionTags,
      portionFeel,
      context: context || undefined,
      note: note.trim() || undefined
    });

    setStoreMessage(message);
    if (!message) {
      setCompositionTags([]);
      setPortionFeel('sensible');
      setContext('');
      setNote('');
    }
  };

  return (
    <div className="screen">
      <h1>Meal log</h1>
      <p className="muted">Notice the shape of your habits. No calories, no points, no weighing.</p>
      <Card title="Quick entry">
        {trackingEnabled ? (
          <form onSubmit={submit} className="stack compact">
            <div>
              <p className="muted">Event type</p>
              <div className="chip-row">
                {EVENT_TYPES.map((type) => (
                  <button key={type} type="button" className={`chip-button ${eventType === type ? 'selected' : ''}`} onClick={() => setEventType(type)}>
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="muted">Composition tags</p>
              <div className="chip-row">
                {COMPOSITION_TAGS.map((tag) => (
                  <button key={tag} type="button" className={`chip-button ${compositionTags.includes(tag) ? 'selected' : ''}`} onClick={() => toggleTag(tag)}>
                    {tag.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="muted">Portion feel</p>
              <div className="chip-row">
                {PORTION_FEELS.map((feel) => (
                  <button key={feel} type="button" className={`chip-button ${portionFeel === feel ? 'selected' : ''}`} onClick={() => setPortionFeel(feel)}>
                    {feel}
                  </button>
                ))}
              </div>
            </div>
            <label>
              Context (optional)
              <select value={context} onChange={(e) => setContext(e.target.value as MealContext | '')}>
                <option value="">None</option>
                {CONTEXTS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Note (optional)
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="One line is enough." />
            </label>
            <button type="submit">Save meal log</button>
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
              This week: {weeklySummary.totalEntries} entries · treats: {weeklySummary.treatCount} · heavy-feeling: {weeklySummary.heavyFeelCount} · stress-context: {weeklySummary.stressContextCount}
            </p>
            {weeklySummary.lines.map((line) => <p key={line}>{line}</p>)}
          </>
        )}
      </Card>

      <Card title="Recent meal logs">
        {!historyVisible ? <p>Meal history is hidden while safety mode is active.</p> : state.mealLogs.slice(0, 8).map((entry) => (
          <article key={entry.id} className="meal-log-item">
            <p>
              <strong>{entry.eventType}</strong> · {entry.portionFeel} · {new Date(entry.timestamp).toLocaleString()}
            </p>
            <p>Tags: {entry.compositionTags.length ? entry.compositionTags.join(', ') : 'none selected'}</p>
            {entry.context ? <p>Context: {entry.context}</p> : null}
            {entry.note ? <p>Note: {entry.note}</p> : null}
            {trackingEnabled ? <button type="button" onClick={() => removeMealLog(entry.id)}>Remove</button> : null}
          </article>
        ))}
      </Card>
    </div>
  );
};

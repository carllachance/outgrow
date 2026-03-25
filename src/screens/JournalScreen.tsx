import { FormEvent, useState } from 'react';
import { Card } from '../components/Card';
import { useStore } from '../state/AppStoreContext';

export const JournalScreen = () => {
  const { state, addJournalEntry, addReflection } = useStore();
  const [entry, setEntry] = useState('');
  const [worked, setWorked] = useState('');
  const [didntHold, setDidntHold] = useState('');
  const [change, setChange] = useState('');
  const [adapt, setAdapt] = useState('');

  const submitEntry = (event: FormEvent) => {
    event.preventDefault();
    if (!entry.trim()) return;
    addJournalEntry({ type: 'freeform', content: entry });
    setEntry('');
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
      <p className="muted">Freeform reflections and weekly adjustment.</p>
      <Card title="Freeform journaling">
        <form onSubmit={submitEntry}>
          <textarea value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="Write what today felt like." />
          <button type="submit">Save reflection</button>
        </form>
      </Card>
      <Card title="Weekly reflection">
        <form onSubmit={submitReflection} className="stack compact">
          <textarea value={worked} onChange={(e) => setWorked(e.target.value)} placeholder="What worked?" />
          <textarea value={didntHold} onChange={(e) => setDidntHold(e.target.value)} placeholder="What didn't hold up?" />
          <textarea value={change} onChange={(e) => setChange(e.target.value)} placeholder="What would you change?" />
          <textarea value={adapt} onChange={(e) => setAdapt(e.target.value)} placeholder="Should we adapt for next week?" />
          <button type="submit">Save weekly reflection</button>
        </form>
      </Card>
      <Card title="Recent entries">
        {state.journalEntries.slice(0, 5).map((item) => (
          <p key={item.id}>{new Date(item.date).toLocaleDateString()} — {item.content}</p>
        ))}
      </Card>
    </div>
  );
};

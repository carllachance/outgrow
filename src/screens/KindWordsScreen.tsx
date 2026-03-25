import { useState } from 'react';
import { Card } from '../components/Card';
import { getHandResponse, getInspireLine } from '../data/mockSupport';
import { BrandHeader } from '../components/brand/BrandHeader';
import { useStore } from '../state/AppStoreContext';

export const KindWordsScreen = () => {
  const { state, addKindWord, addAnonymousNod } = useStore();
  const [inspire, setInspire] = useState('');
  const [request, setRequest] = useState('');

  return (
    <div className="screen">
      <BrandHeader title="Kind Words" subtitle="Be kind to yourself." note="Support without pressure." compactMark />
      <Card title="Inspire me">
        <button type="button" onClick={() => setInspire(getInspireLine())}>Inspire me</button>
        {inspire ? <p>{inspire}</p> : null}
      </Card>
      <Card title="I could use a hand">
        <textarea value={request} onChange={(e) => setRequest(e.target.value)} placeholder="What do you need help with right now?" />
        <button
          type="button"
          onClick={() => {
            const response = getHandResponse();
            if (request.trim()) addKindWord(request, response);
            setRequest('');
          }}
        >
          Get a gentle response
        </button>
      </Card>
      <Card title="Community nods (optional)">
        <button onClick={addAnonymousNod}>Send a kind nod</button>
        <p>Nods sent: {state.anonymousNodCount}</p>
      </Card>
    </div>
  );
};

import { useState } from 'react';
import { Card } from '../components/Card';
import { getHandResponse, getInspireLine } from '../data/mockSupport';
import { BrandHeader } from '../components/brand/BrandHeader';
import { useStore } from '../state/AppStoreContext';
import type { CommunityCategory } from '../types';

export const KindWordsScreen = () => {
  const { state, addKindWord, addCommunityShare, flagCommunityShare } = useStore();
  const [inspire, setInspire] = useState('');
  const [request, setRequest] = useState('');
  const [communityPost, setCommunityPost] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('small win');
  const [publishMessage, setPublishMessage] = useState('');
  const [handMessage, setHandMessage] = useState('');

  return (
    <div className="screen">
      <BrandHeader title="Kind Words" subtitle="Be kind to yourself." note="Support without pressure." />
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
            if (request.trim()) {
              const message = addKindWord(request, response);
              setHandMessage(message);
            }
            setRequest('');
          }}
        >
          Get a gentle response
        </button>
        {handMessage ? <p>{handMessage}</p> : null}
      </Card>
      <Card title="Anonymous community shares">
        <p className="muted">Share short authored notes to encourage others. Posts are screened before publish.</p>
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as CommunityCategory)}>
            <option value="small win">Small win</option>
            <option value="kind reminder">Kind reminder</option>
            <option value="what helped today">What helped today</option>
            <option value="gentle encouragement">Gentle encouragement</option>
          </select>
        </label>
        <textarea
          value={communityPost}
          maxLength={260}
          onChange={(e) => setCommunityPost(e.target.value)}
          placeholder="Share a small win or supportive note anonymously."
        />
        <button
          type="button"
          onClick={() => {
            const message = addCommunityShare(communityPost, category);
            setPublishMessage(message || 'Shared anonymously. Thanks for contributing care.');
            if (!message || !message.includes('not publish')) {
              setCommunityPost('');
            }
          }}
        >
          Share anonymously
        </button>
        {publishMessage ? <p>{publishMessage}</p> : null}
      </Card>
      <Card title="Community board">
        {state.communityShares.filter((share) => !share.isFlagged).slice(0, 8).map((share) => (
          <div key={share.id} className="community-item">
            <p><strong>{share.category}</strong> · {new Date(share.date).toLocaleDateString()}</p>
            <p>{share.content}</p>
            <button type="button" onClick={() => flagCommunityShare(share.id)}>Report / remove</button>
          </div>
        ))}
        {!state.communityShares.some((share) => !share.isFlagged) ? <p>No shared notes yet.</p> : null}
      </Card>
    </div>
  );
};

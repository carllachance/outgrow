import { useState } from 'react';
import { Card } from '../components/Card';
import { getHandResponse, getInspireLine } from '../data/mockSupport';
import { BrandHeader } from '../components/brand/BrandHeader';
import { useStore } from '../state/AppStoreContext';
import type { CommunityCategory } from '../types';

export const KindWordsScreen = () => {
  const { state, addKindWord, addCommunityShare, flagCommunityShare } = useStore();
  const isSafetyMode = !state.safety.flags.community_posting_enabled;
  const [inspire, setInspire] = useState('');
  const [request, setRequest] = useState('');
  const [communityPost, setCommunityPost] = useState('');
  const [category, setCategory] = useState<CommunityCategory>('small win');
  const [publishMessage, setPublishMessage] = useState('');
  const [handMessage, setHandMessage] = useState('');

  return (
    <div className="screen">
      <BrandHeader title="Be kind to yourself" note="Support without pressure." />
      <Card>
        <p className="muted">Generated support is guidance, not medical advice.</p>
        <button type="button" onClick={() => setInspire(getInspireLine())}>Inspire me</button>
        {inspire ? (
          <div className="generated-output" role="status" aria-live="polite">
            <p className="generated-output-copy">{inspire}</p>
          </div>
        ) : null}
      </Card>
      <Card title="What feels hard right now">
        <textarea value={request} onChange={(e) => setRequest(e.target.value)} placeholder="What do you need help with right now?" />
        <button
          disabled={state.safety.mode === 'prolonged_safe_mode' || !state.safety.flags.adaptive_coaching_enabled}
          type="button"
          onClick={() => {
            const trimmed = request.trim();
            if (!trimmed) {
              setHandMessage('Share a little context so we can keep support specific and kind.');
              return;
            }

            const generated = getHandResponse(trimmed);
            const storeMessage = addKindWord(trimmed, generated.response);
            setHandMessage([storeMessage, generated.response].filter(Boolean).join(' ').trim());
            setRequest('');
          }}
        >
          I could use a hand
        </button>
        {handMessage ? <p>{handMessage}</p> : null}
        {state.safety.mode === 'prolonged_safe_mode' ? <p>Support stays in low-intensity mode right now. Keep requests short and gentle.</p> : null}
      </Card>
      <Card title="Anonymous community shares">
        {isSafetyMode ? (
          <p className="muted">Community posting is paused while safety mode is active.</p>
        ) : (
          <>
        <p className="muted">All submissions are screened before publish and may be blocked when risk is uncertain.</p>
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
          </>
        )}
      </Card>
      <Card title="Community board">
        {isSafetyMode ? <p>Community board is hidden in safety mode.</p> : state.communityShares.filter((share) => !share.isFlagged).slice(0, 8).map((share) => (
          <div key={share.id} className="community-item">
            <p><strong>{share.category}</strong> · {new Date(share.date).toLocaleDateString()}</p>
            <p>{share.content}</p>
            <button type="button" onClick={() => flagCommunityShare(share.id)}>Report / remove</button>
          </div>
        ))}
        {!isSafetyMode && !state.communityShares.some((share) => !share.isFlagged) ? <p>No shared notes yet.</p> : null}
      </Card>
    </div>
  );
};

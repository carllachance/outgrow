import outgrowMark from '../../../assets/logo/outgrow-mark.svg';

export const AppWordmark = ({ compact = false }: { compact?: boolean }) => (
  <div className={`app-wordmark ${compact ? 'compact' : ''}`}>
    <img src={outgrowMark} alt="Outgrow mark" className="brand-mark" />
    <div>
      <p className="app-name">Outgrow</p>
      {compact ? null : <p className="app-tag">A calm place to return to.</p>}
    </div>
  </div>
);

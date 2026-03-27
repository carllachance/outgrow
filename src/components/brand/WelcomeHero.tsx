type WelcomeHeroProps = {
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
};

export const WelcomeHero = ({ onPrimaryAction, onSecondaryAction }: WelcomeHeroProps) => (
  <header className="welcome-hero" aria-labelledby="welcome-hero-title">
    <div className="welcome-hero-brand-wrap">
      <p className="welcome-hero-brand">OUTGROW</p>
      <p className="welcome-hero-tagline">A calm place to return to.</p>
    </div>
    <h1 id="welcome-hero-title">Build trust with food one grounded chapter at a time.</h1>
    <p className="welcome-hero-support">
      Start your first chapter now and shape support around your real life, not perfection.
    </p>
    <div className="welcome-hero-actions">
      <button type="button" className="primary-cta welcome-hero-primary" onClick={onPrimaryAction}>
        Start chapter one
      </button>
      <button type="button" className="welcome-hero-secondary" onClick={onSecondaryAction}>
        See the full flow
      </button>
    </div>
  </header>
);

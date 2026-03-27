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
    <h1 id="welcome-hero-title">Build trust with food, one step at a time.</h1>
    <p className="welcome-hero-support">
      Set things up around your real life.
    </p>
    <div className="welcome-hero-actions">
      <button type="button" className="primary-cta welcome-hero-primary" onClick={onPrimaryAction}>
        Get started
      </button>
      <button type="button" className="welcome-hero-secondary" onClick={onSecondaryAction}>
        Skip ahead
      </button>
    </div>
  </header>
);

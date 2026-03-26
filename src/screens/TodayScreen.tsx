import { Link } from 'react-router-dom';
import { ReentryHero } from '../components/brand/ReentryHero';
import { WelcomeHero } from '../components/brand/WelcomeHero';
import { useStore } from '../state/AppStoreContext';

export const TodayScreen = () => {
  const { state } = useStore();
  const hasSetDirection = Boolean(state.onboarding.weeklyLens || state.onboarding.currentFocus || state.journalEntries.length);

  const weeklyLens = state.onboarding.weeklyLens || 'Returning is the work. Start where you are today.';
  const currentFocus = state.onboarding.currentFocus || 'Showing up counts. Choose one useful thing for today.';

  return (
    <div className="screen today-screen">
      {hasSetDirection ? <WelcomeHero /> : <ReentryHero />}

      <section className="today-card today-card-hero" aria-labelledby="today-hero-title">
        <p className="today-kicker">Today</p>
        <h2 id="today-hero-title">Post-intake summary</h2>
        <p>Here&apos;s what I&apos;m hearing: you want this to be workable and steady.</p>
        <p>I&apos;ll support you with lighter nudges as confidence grows. You can adjust support any time.</p>
      </section>

      <section className="today-card today-card-weekly" aria-labelledby="today-weekly-title">
        <p className="today-kicker">Weekly lens</p>
        <h3 id="today-weekly-title">This week</h3>
        <p>{weeklyLens}</p>
      </section>

      <section className="today-card today-card-focus" aria-labelledby="today-focus-title">
        <p className="today-kicker">Current focus</p>
        <h3 id="today-focus-title">What matters most right now</h3>
        <p>{currentFocus}</p>
      </section>

      <section className="today-card today-card-action" aria-labelledby="today-action-title">
        <p className="today-kicker">Useful action</p>
        <h3 id="today-action-title">Pick one or two gentle actions</h3>
        <ul>
          <li>Choose one anchor meal to simplify today.</li>
          <li>Leave one note about what felt workable.</li>
        </ul>
      </section>

      <section className="today-card today-card-rhythm" aria-labelledby="today-rhythm-title">
        <p className="today-kicker">Insight / rhythm</p>
        <h3 id="today-rhythm-title">Support rhythm</h3>
        <p>
          You are currently on <strong>{state.onboarding.supportTier}</strong> support. This can shift with your week —
          lighter when steady, closer when needed.
        </p>
      </section>

      <section className="today-card today-card-kind" aria-labelledby="today-kind-title">
        <p className="today-kicker">Kind word</p>
        <h3 id="today-kind-title">A small nudge with heart</h3>
        <p>Momentum can be quiet. Care still counts, even when it looks small.</p>
        <div className="inline-actions today-actions">
          <Link className="button-link" to="/kind-words">
            You good?
          </Link>
          <button type="button">Chef shortcut (stub)</button>
          <button type="button">Shopping helper (stub)</button>
        </div>
      </section>
    </div>
  );
};

import { Link } from 'react-router-dom';
import { ReentryHero } from '../components/brand/ReentryHero';
import { BrandHeader } from '../components/brand/BrandHeader';
import { useStore } from '../state/AppStoreContext';

export const TodayScreen = () => {
  const { state } = useStore();
  const hasSetDirection = Boolean(state.onboarding.weeklyLens || state.onboarding.currentFocus || state.journalEntries.length);

  const weeklyLens = state.onboarding.weeklyLens || 'Returning is the work. Start where you are today.';
  const currentFocus = state.onboarding.currentFocus || 'Showing up counts. Choose one useful thing for today.';

  return (
    <div className="screen today-screen">
      {hasSetDirection ? (
        <ReentryHero />
      ) : (
        <BrandHeader
          title="Glad You’re Here."
          note="This space is not for performance. It is for honest return. One chapter at a time."
          kicker="Arrival"
        />
      )}

      <section className="atmospheric-panel" aria-labelledby="today-arrival-title">
        <p className="panel-kicker">Today</p>
        <h2 id="today-arrival-title" className="panel-title">What would make today a little steadier?</h2>
        <p className="panel-copy">
          We&apos;ll keep this day simple. One grounded action is enough to count as progress.
        </p>
      </section>

      <section className="chapter" aria-labelledby="today-focus-title">
        <p className="panel-kicker">Current focus</p>
        <h3 id="today-focus-title">{currentFocus}</h3>
        <p>{weeklyLens}</p>
      </section>

      <section className="chapter" aria-labelledby="today-choice-title">
        <p className="panel-kicker">Gentle choices</p>
        <h3 id="today-choice-title">Choose one next step.</h3>
        <div className="choices">
          <button type="button" className="choice-chip">Write one clear meal intention.</button>
          <button type="button" className="choice-chip">Take a ten-minute reset walk.</button>
          <button type="button" className="choice-chip">Leave a note for tonight-you.</button>
        </div>
      </section>

      <section className="chapter" aria-labelledby="today-reflection-title">
        <p className="panel-kicker">Reflection</p>
        <h3 id="today-reflection-title">Returning is the work.</h3>
        <p>Momentum can be quiet. Care still counts, especially when the day feels ordinary.</p>
        <div className="inline-actions" style={{ marginTop: '14px' }}>
          <Link className="button-link" to="/kind-words">
            I need a kind word
          </Link>
        </div>
      </section>
    </div>
  );
};

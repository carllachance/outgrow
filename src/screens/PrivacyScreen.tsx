import { useStore } from '../state/AppStoreContext';

export const PrivacyScreen = () => {
  const { state, updatePrivacy, clearAllData } = useStore();

  return (
    <div className="screen privacy-screen">
      <section className="atmospheric-panel" aria-labelledby="privacy-title">
        <p className="panel-kicker">Private sanctuary</p>
        <h1 id="privacy-title" className="panel-title">Your reflection stays yours.</h1>
        <p className="panel-copy">Privacy is structural, not decorative. You choose how close or quiet this space should be.</p>
      </section>

      <section className="chapter" aria-labelledby="privacy-controls-title">
        <p className="panel-kicker">Controls</p>
        <h2 id="privacy-controls-title">Set your boundary and lock preferences.</h2>
        <label className="toggle">
          <input type="checkbox" checked={state.privacy.localOnly} onChange={(e) => updatePrivacy({ localOnly: e.target.checked })} />
          Local-only storage
        </label>
        <label className="toggle">
          <input type="checkbox" checked={state.privacy.anonymousNods} onChange={(e) => updatePrivacy({ anonymousNods: e.target.checked })} />
          Anonymous community nods
        </label>
        <label className="toggle">
          <input type="checkbox" checked={state.privacy.biometricLock} onChange={(e) => updatePrivacy({ biometricLock: e.target.checked })} />
          Biometric lock (stub)
        </label>
        <button type="button">Export data (stub)</button>
        <button type="button" onClick={clearAllData}>Delete all local data</button>
      </section>

      <section className="chapter" aria-label="privacy-note">
        <p className="privacy-quote">“What is shared here is held, not harvested.”</p>
      </section>
    </div>
  );
};

import { useStore } from '../state/AppStoreContext';

export const PrivacyScreen = () => {
  const { state, updatePrivacy, clearAllData } = useStore();

  return (
    <div className="screen privacy-screen">
      <section className="atmospheric-panel" aria-labelledby="privacy-title">
        <p className="panel-kicker">Privacy</p>
        <h1 id="privacy-title" className="panel-title">Your reflection stays yours.</h1>
        <p className="panel-copy">You control what stays on your device and how this app is locked.</p>
      </section>

      <section className="chapter" aria-labelledby="privacy-controls-title">
        <p className="panel-kicker">Controls</p>
        <h2 id="privacy-controls-title">Choose your privacy and lock settings.</h2>
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
          Biometric lock (coming soon)
        </label>
        <button type="button">Export data (coming soon)</button>
        <button type="button" onClick={clearAllData}>Delete all local data</button>
      </section>

      <section className="chapter" aria-label="privacy-note">
        <p className="privacy-quote">“What you share here stays in your control.”</p>
      </section>
    </div>
  );
};

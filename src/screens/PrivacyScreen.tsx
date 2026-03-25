import { Card } from '../components/Card';
import { BrandHeader } from '../components/brand/BrandHeader';
import { useStore } from '../state/AppStoreContext';

export const PrivacyScreen = () => {
  const { state, updatePrivacy, clearAllData } = useStore();

  return (
    <div className="screen">
      <BrandHeader title="Privacy" subtitle="Be kind to yourself." note="Your reflection stays yours." compactMark />
      <Card title="Controls">
        <label className="toggle"><input type="checkbox" checked={state.privacy.localOnly} onChange={(e) => updatePrivacy({ localOnly: e.target.checked })} /> Local-only storage</label>
        <label className="toggle"><input type="checkbox" checked={state.privacy.anonymousNods} onChange={(e) => updatePrivacy({ anonymousNods: e.target.checked })} /> Anonymous community nods</label>
        <label className="toggle"><input type="checkbox" checked={state.privacy.biometricLock} onChange={(e) => updatePrivacy({ biometricLock: e.target.checked })} /> Biometric lock (stub)</label>
        <button type="button">Export data (stub)</button>
        <button type="button" onClick={clearAllData}>Delete all local data</button>
      </Card>
      <Card title="Privacy philosophy">
        <p>Privacy is structural, not decorative. Reflection belongs to you, not ad systems.</p>
      </Card>
    </div>
  );
};

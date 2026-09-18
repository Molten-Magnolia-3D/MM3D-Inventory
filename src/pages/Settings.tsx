import { FormEvent, useState } from "react";
import { loadSampleWorkshop } from "../core/seed";
import { useInventory } from "../state";
import { Field } from "../ui";
import { useUpdateStatus } from "../useUpdateStatus";

export default function SettingsPage() {
  const { inv, refresh, sync, lock, online, platform, user } = useInventory();
  const update = useUpdateStatus();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  if (!inv) return null;
  const api = inv;
  const settings = api.getSettings();
  const [low, setLow] = useState(String(settings.filamentLowGrams));
  const [critical, setCritical] = useState(String(settings.filamentCriticalGrams));
  const [cloudEnabled, setCloudEnabled] = useState(settings.cloudEnabled);
  const [firebaseJson, setFirebaseJson] = useState(
    settings.firebaseConfig ? JSON.stringify(settings.firebaseConfig, null, 2) : "",
  );

  function saveThresholds(e: FormEvent) {
    e.preventDefault();
    api.updateSettings({
      filamentLowGrams: Number(low) || 300,
      filamentCriticalGrams: Number(critical) || 100,
    });
    refresh();
    setMessage("Filament thresholds saved.");
  }

  function saveCloud(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const config = firebaseJson.trim() ? JSON.parse(firebaseJson) : null;
      if (cloudEnabled && !config?.apiKey) {
        throw new Error("Paste a Firebase web config JSON before enabling cloud sync.");
      }
      api.configureFirebase(config, cloudEnabled);
      refresh();
      setMessage("Cloud settings saved. Sign-in uses the same email/password as this app when Firebase Auth is enabled.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>
            Signed in as {user?.email}. {platform.isElectron ? "Windows desktop" : "Browser"} ·{" "}
            {online ? "online" : "offline"}
            {update?.version ? ` · v${update.version}` : ""}
          </p>
        </div>
      </div>
      {message && <div className="warn-banner">{message}</div>}
      {error && <div className="danger-banner">{error}</div>}
      {lock && !lock.holder && (
        <div className="danger-banner">
          Another PC holds the lock ({lock.hostname}). This copy is read-only until you take over.
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>App updates</h2>
        <p className="empty" style={{ paddingTop: 0 }}>
          The installed Setup app checks GitHub Releases after launch and downloads newer builds in the background.
          Portable EXEs do not auto-update — install with Setup if you want that.
        </p>
        {update && <p>{update.message || `This copy is v${update.version}.`}</p>}
        {update?.state === "downloading" && (
          <div className="update-meter" aria-valuenow={update.percent ?? 0}>
            <span style={{ width: `${update.percent ?? 0}%` }} />
          </div>
        )}
        <div className="row">
          <button
            className="btn secondary"
            type="button"
            disabled={checking || update?.state === "checking" || update?.state === "downloading"}
            onClick={() => {
              setChecking(true);
              void platform.checkForUpdates().finally(() => setChecking(false));
            }}
          >
            {checking || update?.state === "checking" ? "Checking…" : "Check for updates"}
          </button>
          {update?.state === "ready" && (
            <button className="btn" type="button" onClick={() => void platform.installUpdate()}>
              Restart to update
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Filament low stock</h2>
        <form onSubmit={saveThresholds} className="form-grid">
          <Field label="Low (grams)">
            <input value={low} onChange={(e) => setLow(e.target.value)} />
          </Field>
          <Field label="Critical (grams)">
            <input value={critical} onChange={(e) => setCritical(e.target.value)} />
          </Field>
          <div>
            <button className="btn" type="submit">
              Save thresholds
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Cloud sync (one PC at a time)</h2>
        <p className="empty" style={{ paddingTop: 0 }}>
          Create a Firebase project, enable Email/Password authentication and Cloud Firestore, then paste the web
          config object below. The shop database stays on this PC and uploads when you are online. If the internet
          drops, keep working — sync catches up later.
        </p>
        <form onSubmit={saveCloud}>
          <Field label="Enable cloud">
            <select
              value={cloudEnabled ? "yes" : "no"}
              onChange={(e) => setCloudEnabled(e.target.value === "yes")}
            >
              <option value="no">Local only</option>
              <option value="yes">Firebase</option>
            </select>
          </Field>
          <Field label="Firebase config JSON">
            <textarea
              value={firebaseJson}
              onChange={(e) => setFirebaseJson(e.target.value)}
              placeholder='{ "apiKey": "...", "authDomain": "...", "projectId": "...", "appId": "..." }'
            />
          </Field>
          <div className="row">
            <button className="btn" type="submit">
              Save cloud settings
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={() => void sync(true)}
            >
              Sync / take over this PC
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Sample workshop</h2>
        <p className="empty" style={{ paddingTop: 0 }}>
          Loads Harrier 231 / 542 kit recipes with shared pens and wings, a hardware bin, and two PLA spools. Safe to
          click on an empty database.
        </p>
        <button
          className="btn secondary"
          onClick={() => {
            loadSampleWorkshop(api);
            refresh();
            setMessage("Sample workshop loaded.");
          }}
        >
          Load sample data
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { isStandaloneDisplay } from "./pwa";
import { useInventory } from "./state";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallAppCard({ compact = false }: { compact?: boolean }) {
  const { platform } = useInventory();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setStandalone(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (platform.isElectron || standalone || installed) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }

  return (
    <div className={compact ? "install-hint" : "card"} style={compact ? undefined : { marginBottom: 16 }}>
      {!compact && <h2>Install on this phone</h2>}
      <p className="empty" style={{ paddingTop: compact ? 0 : 0, marginTop: compact ? 12 : 0 }}>
        Add MM3D Inventory to your home screen so it opens like an app and still works offline after the first load.
        This copy is separate from the Windows shop PC unless you turn on cloud sync.
      </p>
      {deferred ? (
        <button className="btn" type="button" onClick={() => void install()}>
          Install app
        </button>
      ) : (
        <p className="lede" style={{ margin: compact ? "8px 0 0" : "8px 0 0" }}>
          iPhone: Share → Add to Home Screen. Android Chrome: menu → Install app or Add to Home screen.
        </p>
      )}
    </div>
  );
}

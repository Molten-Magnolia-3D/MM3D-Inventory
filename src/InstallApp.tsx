import { useEffect, useState } from "react";
import { version as appVersion } from "../package.json";
import {
  DOWNLOAD_PAGE_URL,
  PHONE_APP_URL,
  windowsPortableUrl,
  windowsSetupUrl,
} from "./core/downloads";
import { isStandaloneDisplay } from "./pwa";
import { useInventory } from "./state";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function WindowsDownloadLinks() {
  const setup = windowsSetupUrl(appVersion);
  const portable = windowsPortableUrl(appVersion);
  return (
    <div className="download-links">
      <p className="lede" style={{ margin: "12px 0 8px" }}>
        Shop PC: these links download the Windows file immediately. You do not need to open GitHub
        Releases or expand Assets.
      </p>
      <div className="row">
        <a className="btn" href={setup}>
          Download Windows Setup
        </a>
        <a className="btn secondary" href={portable}>
          Portable EXE
        </a>
      </div>
      <p className="empty" style={{ paddingTop: 8 }}>
        Setup auto-updates. Portable does not. Phone testers should open{" "}
        <a href={PHONE_APP_URL}>{PHONE_APP_URL}</a> and Add to Home Screen — there is no iPhone or
        Android installer. File links also live on <a href={DOWNLOAD_PAGE_URL}>download.html</a>.
      </p>
    </div>
  );
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

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }

  if (platform.isElectron) return null;

  const showWindows = !standalone && !installed;

  return (
    <div className={compact ? "install-hint" : "card"} style={compact ? undefined : { marginBottom: 16 }}>
      {!compact && <h2>Install on this phone</h2>}
      {standalone || installed ? (
        <p className="empty" style={{ paddingTop: compact ? 0 : 0, marginTop: compact ? 12 : 0 }}>
          This home-screen copy is the phone app. It stays on this device unless you turn on cloud
          sync.
        </p>
      ) : (
        <>
          <p className="empty" style={{ paddingTop: compact ? 0 : 0, marginTop: compact ? 12 : 0 }}>
            You are already in the phone app. Add it to your home screen so it opens like an app and
            still works offline after the first load. A downloaded zip will not install on iPhone or
            Android.
          </p>
          {deferred ? (
            <button className="btn" type="button" onClick={() => void install()}>
              Install app
            </button>
          ) : (
            <p className="lede" style={{ margin: compact ? "8px 0 0" : "8px 0 0" }}>
              iPhone: Share → Add to Home Screen. Android Chrome: menu → Install app or Add to Home
              screen.
            </p>
          )}
        </>
      )}
      {showWindows &&
        (compact ? (
          <p className="lede" style={{ margin: "12px 0 0" }}>
            Need the Windows shop app?{" "}
            <a href={DOWNLOAD_PAGE_URL}>Download Setup from this page</a>.
          </p>
        ) : (
          <WindowsDownloadLinks />
        ))}
    </div>
  );
}

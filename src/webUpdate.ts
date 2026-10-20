import { version as appVersion } from "../package.json";
import {
  isNewerVersion,
  readRemoteVersion,
  versionJsonUrl,
  type UpdateStatus,
} from "./core/update";

export const WEB_UPDATE_CHECK_MS = 5 * 60 * 1000;
const RELOAD_KEY = "mm3d-update-reload";

export interface WebUpdater {
  getStatus(): UpdateStatus;
  check(fromUser?: boolean): Promise<UpdateStatus>;
  install(): Promise<boolean>;
  subscribe(cb: (status: UpdateStatus) => void): () => void;
  start(): () => void;
}

export interface WebUpdaterOptions {
  version?: string;
  href?: string;
  fetchImpl?: typeof fetch;
  reload?: () => void;
  now?: () => number;
  visibility?: () => DocumentVisibilityState;
  storage?: Pick<Storage, "getItem" | "setItem">;
}

function idleStatus(version: string, message = ""): UpdateStatus {
  return {
    version,
    packaged: false,
    portable: false,
    state: "idle",
    message,
  };
}

async function pingServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.map(async (registration) => {
      registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      await registration.update().catch(() => undefined);
    }),
  );
}

export function createWebUpdater(options: WebUpdaterOptions = {}): WebUpdater {
  const version = options.version ?? appVersion;
  const fetchImpl = options.fetchImpl ?? fetch;
  const reload = options.reload ?? (() => window.location.reload());
  const now = options.now ?? Date.now;
  const visibility = options.visibility ?? (() =>
    typeof document === "undefined" ? "visible" : document.visibilityState);
  const storage = options.storage ?? (typeof sessionStorage === "undefined" ? undefined : sessionStorage);
  const listeners = new Set<(status: UpdateStatus) => void>();
  let status = idleStatus(version);
  let inFlight = false;
  let initial = true;
  let started = false;

  function href(): string {
    return options.href ?? (typeof window === "undefined" ? "https://example.test/" : window.location.href);
  }

  function emit(patch: Partial<UpdateStatus>) {
    status = { ...status, ...patch, version };
    for (const listener of listeners) listener(status);
  }

  function alreadyReloaded(remote: string): boolean {
    return storage?.getItem(RELOAD_KEY) === remote;
  }

  function markReloaded(remote: string) {
    storage?.setItem(RELOAD_KEY, remote);
  }

  async function applyRemote(remote: string, fromUser: boolean) {
    emit({
      state: "ready",
      versionAvailable: remote,
      message: `Version ${remote} is ready. This copy is v${version}.`,
    });
    await pingServiceWorker();
    const hidden = visibility() === "hidden";
    const shouldReloadNow = fromUser || initial || hidden;
    if (shouldReloadNow && !alreadyReloaded(remote)) {
      markReloaded(remote);
      reload();
      return;
    }
  }

  async function check(fromUser = false): Promise<UpdateStatus> {
    if (inFlight) return status;
    inFlight = true;
    if (fromUser) {
      emit({ state: "checking", message: "Checking for a newer phone build…" });
    }
    try {
      const res = await fetchImpl(versionJsonUrl(href(), now()), { cache: "no-store" });
      if (!res.ok) {
        emit(
          idleStatus(
            version,
            fromUser
              ? "Could not reach the published version file. Try again when you are online."
              : `This copy is v${version}.`,
          ),
        );
        return status;
      }
      const remote = readRemoteVersion(await res.json());
      if (!remote) {
        emit(idleStatus(version, `This copy is v${version}.`));
        return status;
      }
      if (isNewerVersion(remote, version)) {
        await applyRemote(remote, fromUser);
      } else {
        emit({
          state: "idle",
          versionAvailable: undefined,
          message: `You're on ${version}, the latest phone build.`,
        });
      }
      return status;
    } catch (err) {
      emit({
        state: fromUser ? "error" : "idle",
        message: fromUser ? (err as Error).message || "Update check failed." : `This copy is v${version}.`,
      });
      return status;
    } finally {
      inFlight = false;
      initial = false;
    }
  }

  function start(): () => void {
    if (started) return () => undefined;
    started = true;
    void check(false);
    const timer = setInterval(() => {
      if (status.state === "ready") return;
      void check(false);
    }, WEB_UPDATE_CHECK_MS);
    const onVisible = () => {
      if (visibility() !== "visible") return;
      if (status.state === "ready" && status.versionAvailable && !alreadyReloaded(status.versionAvailable)) {
        markReloaded(status.versionAvailable);
        reload();
        return;
      }
      void check(false);
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onVisible);
    }
    return () => {
      started = false;
      clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onVisible);
      }
    };
  }

  return {
    getStatus: () => status,
    check,
    async install() {
      if (status.versionAvailable) markReloaded(status.versionAvailable);
      await pingServiceWorker();
      reload();
      return true;
    },
    subscribe(cb) {
      listeners.add(cb);
      cb(status);
      return () => {
        listeners.delete(cb);
      };
    },
    start,
  };
}

let singleton: WebUpdater | null = null;

export function getWebUpdater(): WebUpdater {
  if (!singleton) singleton = createWebUpdater();
  return singleton;
}

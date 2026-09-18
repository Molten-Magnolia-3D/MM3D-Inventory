import { app, BrowserWindow, ipcMain } from "electron";
import electronUpdater from "electron-updater";
import { isPortableEnv } from "./portable";

const { autoUpdater } = electronUpdater;

export { isPortableEnv };

export type UpdateState =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "unavailable"
  | "error";

export interface UpdateStatus {
  version: string;
  packaged: boolean;
  portable: boolean;
  state: UpdateState;
  message: string;
  versionAvailable?: string;
  percent?: number;
}

let status: UpdateStatus = {
  version: "0",
  packaged: false,
  portable: false,
  state: "idle",
  message: "",
};
let userInitiated = false;

function broadcast() {
  const payload = { ...status };
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("mm3d:update", payload);
  }
}

function setStatus(patch: Partial<UpdateStatus>) {
  status = { ...status, ...patch };
  broadcast();
}

async function checkNow(fromUser = false) {
  userInitiated = fromUser;
  if (!app.isPackaged || isPortableEnv()) return status;
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    applyError(err);
  }
  return status;
}

function applyError(err: unknown) {
  const message = (err as Error).message || String(err);
  console.error("MM3D update error", err);
  if (!userInitiated && status.state !== "downloading" && status.state !== "ready") {
    setStatus({ state: "idle", message: "" });
    return;
  }
  setStatus({ state: "error", message });
}

export function setupUpdater(): void {
  status = {
    version: app.getVersion(),
    packaged: app.isPackaged,
    portable: isPortableEnv(),
    state: "idle",
    message: "",
  };

  ipcMain.handle("mm3d:update-status", () => status);
  ipcMain.handle("mm3d:update-check", () => checkNow(true));
  ipcMain.handle("mm3d:update-install", async () => {
    if (status.state !== "ready") return false;
    autoUpdater.quitAndInstall(false, true);
    return true;
  });

  if (!app.isPackaged) {
    setStatus({
      state: "unavailable",
      message: "Updates are checked in the installed Windows app, not during development.",
    });
    return;
  }
  if (isPortableEnv()) {
    setStatus({
      state: "unavailable",
      message:
        "Auto-update needs the Setup installer (MM3D-Inventory-Setup). This portable copy will not update itself.",
    });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.logger = console;
  const nsis = autoUpdater as {
    verifyUpdateCodeSignature?: (publisherName: string[], path: string) => Promise<string | null>;
  };
  if (nsis.verifyUpdateCodeSignature) {
    // Shop builds are unsigned; skip Authenticode so GitHub releases can still install.
    nsis.verifyUpdateCodeSignature = async () => null;
  }

  autoUpdater.on("checking-for-update", () => {
    setStatus({
      state: "checking",
      message: "Checking GitHub for a newer shop build…",
      percent: undefined,
    });
  });
  autoUpdater.on("update-available", (info) => {
    setStatus({
      state: "available",
      versionAvailable: info.version,
      message: `Version ${info.version} is available. Downloading in the background.`,
    });
  });
  autoUpdater.on("update-not-available", () => {
    setStatus({
      state: "idle",
      versionAvailable: undefined,
      percent: undefined,
      message: `You're on ${status.version}, the latest release.`,
    });
  });
  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.round(progress.percent);
    setStatus({
      state: "downloading",
      percent,
      message: `Downloading update… ${percent}%`,
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    setStatus({
      state: "ready",
      versionAvailable: info.version,
      percent: 100,
      message: `Version ${info.version} is ready. Restart when you can — it also installs when you quit.`,
    });
  });
  autoUpdater.on("error", (err) => applyError(err));

  setTimeout(() => {
    void checkNow(false);
  }, 6_000);
}

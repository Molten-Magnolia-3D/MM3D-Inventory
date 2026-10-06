import type { DeviceInfo } from "./core/types";
import { asUint8Array, sqlAssetUrl } from "./core/util";
import { unavailableUpdate, type UpdateStatus } from "./core/update";

export interface Platform {
  isElectron: boolean;
  loadDb(): Promise<Uint8Array | null>;
  saveDb(data: Uint8Array): Promise<void>;
  loadWasm(): Promise<Uint8Array | null>;
  deviceInfo(): Promise<DeviceInfo>;
  saveFile(filename: string, data: Uint8Array | string, mime?: string): Promise<boolean>;
  openFile(): Promise<{ name: string; data: Uint8Array } | null>;
  locateWasm(file: string): string;
  getUpdateStatus(): Promise<UpdateStatus>;
  checkForUpdates(): Promise<UpdateStatus>;
  installUpdate(): Promise<boolean>;
  onUpdate(cb: (status: UpdateStatus) => void): () => void;
}

type ElectronApi = {
  isElectron: true;
  loadDb: () => Promise<unknown>;
  saveDb: (data: Uint8Array) => Promise<void>;
  loadWasm: () => Promise<unknown>;
  deviceInfo: () => Promise<DeviceInfo>;
  saveFile: (filename: string, data: Uint8Array | string, mime?: string) => Promise<boolean>;
  openFile: () => Promise<{ name: string; data: Uint8Array } | null>;
  getUpdateStatus: () => Promise<UpdateStatus>;
  checkForUpdates: () => Promise<UpdateStatus>;
  installUpdate: () => Promise<boolean>;
  onUpdate: (cb: (status: UpdateStatus) => void) => () => void;
};

declare global {
  interface Window {
    mm3d?: ElectronApi;
  }
}

const IDB_NAME = "mm3d-inventory";
const IDB_STORE = "kv";

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key: string): Promise<Uint8Array | string | null> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as Uint8Array | string | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: Uint8Array | string): Promise<void> {
  const db = await idb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function download(filename: string, data: Uint8Array | string, mime = "application/octet-stream") {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: mime })
      : new Blob([Uint8Array.from(data)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function webDeviceLabel(): { hostname: string; platform: string } {
  const ua = navigator.userAgent;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  if (standalone && mobile) return { hostname: "MM3D phone", platform: "mobile" };
  if (mobile) return { hostname: "phone browser", platform: "mobile" };
  if (standalone) return { hostname: "MM3D web", platform: "web" };
  return { hostname: window.location.hostname || "browser", platform: "web" };
}

async function fetchPublicWasm(): Promise<Uint8Array | null> {
  for (const name of ["sql-wasm-browser.wasm", "sql-wasm.wasm"]) {
    try {
      const res = await fetch(sqlAssetUrl(name));
      if (res.ok) return new Uint8Array(await res.arrayBuffer());
    } catch {
      /* try the next name */
    }
  }
  return null;
}

export function createPlatform(): Platform {
  if (window.mm3d?.isElectron) {
    const api = window.mm3d;
    return {
      isElectron: true,
      async loadDb() {
        return asUint8Array(await api.loadDb());
      },
      saveDb: (data) => api.saveDb(data),
      async loadWasm() {
        const fromMain = asUint8Array(await api.loadWasm());
        if (fromMain?.length) return fromMain;
        return fetchPublicWasm();
      },
      deviceInfo: () => api.deviceInfo(),
      saveFile: (filename, data, mime) => api.saveFile(filename, data, mime),
      async openFile() {
        const file = await api.openFile();
        if (!file) return null;
        const data = asUint8Array((file as { data: unknown }).data);
        if (!data) return null;
        return { name: file.name, data };
      },
      locateWasm: (file) => sqlAssetUrl(file),
      getUpdateStatus: () => api.getUpdateStatus(),
      checkForUpdates: () => api.checkForUpdates(),
      installUpdate: () => api.installUpdate(),
      onUpdate: (cb) => api.onUpdate(cb),
    };
  }

  return {
    isElectron: false,
    async loadDb() {
      const bytes = await idbGet("db");
      return asUint8Array(bytes);
    },
    async saveDb(data) {
      await idbSet("db", data);
    },
    loadWasm: () => fetchPublicWasm(),
    async deviceInfo() {
      let id = (await idbGet("device-id")) as string | null;
      if (!id) {
        id = crypto.randomUUID();
        await idbSet("device-id", id);
      }
      return { id, ...webDeviceLabel() };
    },
    async saveFile(filename, data, mime) {
      download(filename, data, mime);
      return true;
    },
    async openFile() {
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv,text/csv";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return resolve(null);
          const buf = new Uint8Array(await file.arrayBuffer());
          resolve({ name: file.name, data: buf });
        };
        input.click();
      });
    },
    locateWasm: (file) => sqlAssetUrl(file),
    async getUpdateStatus() {
      return unavailableUpdate("web", "Phone and browser copies pick up a new build the next time you open the page.");
    },
    async checkForUpdates() {
      return unavailableUpdate("web", "Phone and browser copies pick up a new build the next time you open the page.");
    },
    async installUpdate() {
      return false;
    },
    onUpdate() {
      return () => undefined;
    },
  };
}

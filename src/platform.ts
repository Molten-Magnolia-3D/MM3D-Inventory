import type { DeviceInfo } from "./core/types";

export interface Platform {
  isElectron: boolean;
  loadDb(): Promise<Uint8Array | null>;
  saveDb(data: Uint8Array): Promise<void>;
  deviceInfo(): Promise<DeviceInfo>;
  saveFile(filename: string, data: Uint8Array | string, mime?: string): Promise<boolean>;
  openFile(): Promise<{ name: string; data: Uint8Array } | null>;
  locateWasm(file: string): string;
}

type ElectronApi = {
  isElectron: true;
  loadDb: () => Promise<Uint8Array | null>;
  saveDb: (data: Uint8Array) => Promise<void>;
  deviceInfo: () => Promise<DeviceInfo>;
  saveFile: (filename: string, data: Uint8Array | string, mime?: string) => Promise<boolean>;
  openFile: () => Promise<{ name: string; data: Uint8Array } | null>;
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

export function createPlatform(): Platform {
  if (window.mm3d?.isElectron) {
    const api = window.mm3d;
    return {
      isElectron: true,
      loadDb: () => api.loadDb(),
      saveDb: (data) => api.saveDb(data),
      deviceInfo: () => api.deviceInfo(),
      saveFile: (filename, data, mime) => api.saveFile(filename, data, mime),
      openFile: () => api.openFile(),
      locateWasm: (file) => `./${file}`,
    };
  }

  return {
    isElectron: false,
    async loadDb() {
      const bytes = await idbGet("db");
      return bytes instanceof Uint8Array ? bytes : null;
    },
    async saveDb(data) {
      await idbSet("db", data);
    },
    async deviceInfo() {
      let id = (await idbGet("device-id")) as string | null;
      if (!id) {
        id = crypto.randomUUID();
        await idbSet("device-id", id);
      }
      return { id, hostname: window.location.hostname || "browser", platform: "web" };
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
    locateWasm: (file) => `/${file}`,
  };
}

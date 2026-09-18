import { contextBridge, ipcRenderer } from "electron";
import type { UpdateStatus } from "./updater";

contextBridge.exposeInMainWorld("mm3d", {
  isElectron: true,
  loadDb: () => ipcRenderer.invoke("mm3d:load-db"),
  saveDb: (data: Uint8Array) => ipcRenderer.invoke("mm3d:save-db", data),
  loadWasm: () => ipcRenderer.invoke("mm3d:load-wasm"),
  deviceInfo: () => ipcRenderer.invoke("mm3d:device-info"),
  saveFile: (filename: string, data: Uint8Array | string, mime?: string) =>
    ipcRenderer.invoke("mm3d:save-file", {
      filename,
      data: typeof data === "string" ? data : Array.from(data),
      mime,
    }),
  openFile: () => ipcRenderer.invoke("mm3d:open-file"),
  getUpdateStatus: () => ipcRenderer.invoke("mm3d:update-status") as Promise<UpdateStatus>,
  checkForUpdates: () => ipcRenderer.invoke("mm3d:update-check") as Promise<UpdateStatus>,
  installUpdate: () => ipcRenderer.invoke("mm3d:update-install") as Promise<boolean>,
  onUpdate: (cb: (status: UpdateStatus) => void) => {
    const listener = (_event: unknown, status: UpdateStatus) => cb(status);
    ipcRenderer.on("mm3d:update", listener);
    return () => {
      ipcRenderer.removeListener("mm3d:update", listener);
    };
  },
});

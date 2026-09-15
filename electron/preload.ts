import { contextBridge, ipcRenderer } from "electron";

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
});

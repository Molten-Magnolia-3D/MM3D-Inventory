import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

function userDataFile(name: string) {
  return path.join(app.getPath("userData"), name);
}

function deviceId(): string {
  const file = userDataFile("device-id.txt");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  const id = randomUUID();
  fs.writeFileSync(file, id, "utf8");
  return id;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#16110e",
    title: "MM3D Inventory",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    win.loadURL("http://127.0.0.1:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  ipcMain.handle("mm3d:load-db", async () => {
    const file = userDataFile("mm3d-inventory.sqlite");
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file);
  });

  ipcMain.handle("mm3d:save-db", async (_evt, data: Uint8Array) => {
    const file = userDataFile("mm3d-inventory.sqlite");
    fs.writeFileSync(file, Buffer.from(data));
  });

  ipcMain.handle("mm3d:device-info", async () => ({
    id: deviceId(),
    hostname: os.hostname(),
    platform: process.platform,
  }));

  ipcMain.handle(
    "mm3d:save-file",
    async (
      _evt,
      payload: { filename: string; data: number[] | string; mime?: string },
    ) => {
      const result = await dialog.showSaveDialog({
        defaultPath: payload.filename,
      });
      if (result.canceled || !result.filePath) return false;
      const buf =
        typeof payload.data === "string"
          ? Buffer.from(payload.data, "utf8")
          : Buffer.from(payload.data);
      fs.writeFileSync(result.filePath, buf);
      return true;
    },
  );

  ipcMain.handle("mm3d:open-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "CSV", extensions: ["csv"] },
        { name: "All files", extensions: ["*"] },
      ],
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const filePath = result.filePaths[0];
    const data = fs.readFileSync(filePath);
    return { name: path.basename(filePath), data };
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

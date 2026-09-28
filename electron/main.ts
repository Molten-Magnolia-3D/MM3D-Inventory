import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from "electron";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { fileInDist } from "./paths.js";
import { setupUpdater } from "./updater.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const SCHEME = "mm3d";

protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function userDataFile(name: string) {
  return path.join(app.getPath("userData"), name);
}

function distDir() {
  return path.join(__dirname, "..", "dist");
}

function findWasmFile(): string {
  const names = ["sql-wasm-browser.wasm", "sql-wasm.wasm"];
  const dirs = [
    distDir(),
    path.join(__dirname, "..", "public"),
    path.join(process.cwd(), "public"),
    path.join(process.cwd(), "node_modules", "sql.js", "dist"),
    path.join(__dirname, "..", "node_modules", "sql.js", "dist"),
  ];
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  throw new Error("SQLite WASM file was not packaged with the app.");
}

function deviceId(): string {
  const file = userDataFile("device-id.txt");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  const id = randomUUID();
  fs.writeFileSync(file, id, "utf8");
  return id;
}

function registerRendererProtocol() {
  protocol.handle(SCHEME, (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname === "/" || url.pathname === "" ? "/index.html" : url.pathname;
    const filePath = fileInDist(pathname, distDir());
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
    }
    return net.fetch(pathToFileURL(filePath).href);
  });
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
    win.loadURL(`${SCHEME}://app/index.html`);
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  if (!isDev) registerRendererProtocol();

  ipcMain.handle("mm3d:load-db", async () => {
    const file = userDataFile("mm3d-inventory.sqlite");
    if (!fs.existsSync(file)) return null;
    return fs.readFileSync(file);
  });

  ipcMain.handle("mm3d:save-db", async (_evt, data: Uint8Array) => {
    const file = userDataFile("mm3d-inventory.sqlite");
    fs.writeFileSync(file, Buffer.from(data));
  });

  ipcMain.handle("mm3d:load-wasm", async () => fs.readFileSync(findWasmFile()));

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

  setupUpdater();

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

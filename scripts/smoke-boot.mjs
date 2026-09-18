import { app, BrowserWindow, ipcMain, net, protocol } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fileInDist } from "../dist-electron/paths.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "..", "dist");
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

function wasmPath() {
  for (const name of ["sql-wasm-browser.wasm", "sql-wasm.wasm"]) {
    const candidate = path.join(dist, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("wasm missing from dist/");
}

app.whenReady().then(async () => {
  protocol.handle(SCHEME, (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname === "/" || url.pathname === "" ? "/index.html" : url.pathname;
    const filePath = fileInDist(pathname, dist);
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return new Response("Not found", { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).href);
  });

  ipcMain.handle("mm3d:load-db", async () => null);
  ipcMain.handle("mm3d:save-db", async () => undefined);
  ipcMain.handle("mm3d:load-wasm", async () => fs.readFileSync(wasmPath()));
  ipcMain.handle("mm3d:device-info", async () => ({
    id: "smoke",
    hostname: "smoke",
    platform: process.platform,
  }));
  ipcMain.handle("mm3d:save-file", async () => false);
  ipcMain.handle("mm3d:open-file", async () => null);
  const smokeUpdate = {
    version: "1.0.2",
    packaged: true,
    portable: false,
    state: "unavailable",
    message: "smoke",
  };
  ipcMain.handle("mm3d:update-status", async () => smokeUpdate);
  ipcMain.handle("mm3d:update-check", async () => smokeUpdate);
  ipcMain.handle("mm3d:update-install", async () => false);

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "dist-electron", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  await win.loadURL(`${SCHEME}://app/index.html`);

  const deadline = Date.now() + 20_000;
  let text = "";
  while (Date.now() < deadline) {
    text = await win.webContents.executeJavaScript("document.body.innerText");
    if (/Could not open the database/i.test(text)) {
      console.error("SMOKE FAIL\n", text);
      app.exit(1);
      return;
    }
    if (text && !/Opening the shop ledger/i.test(text)) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!text || /Opening the shop ledger/i.test(text)) {
    console.error("SMOKE TIMEOUT\n", text);
    app.exit(1);
    return;
  }
  if (!/Create your owner login/i.test(text)) {
    console.error("SMOKE FAIL expected owner login\n", text);
    app.exit(1);
    return;
  }

  await win.webContents.executeJavaScript(`
    (() => {
      const email = document.querySelector('input[type="email"]');
      const password = document.querySelector('input[type="password"]');
      const form = document.querySelector("form");
      const set = (el, value) => {
        const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
        proto.set.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      };
      set(email, "owner@moltenmagnolia3d.com");
      set(password, "correct-horse");
      form.requestSubmit();
    })()
  `);

  const after = Date.now() + 10_000;
  while (Date.now() < after) {
    text = await win.webContents.executeJavaScript("document.body.innerText");
    if (/Shop floor|Scan \/ lookup|Locations/i.test(text) && !/Create your owner login/i.test(text)) {
      console.log("SMOKE OK\n", text.slice(0, 500));
      app.exit(0);
      return;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  console.error("SMOKE FAIL after register\n", text);
  app.exit(1);
});

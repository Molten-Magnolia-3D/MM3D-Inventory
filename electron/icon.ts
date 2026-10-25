import fs from "node:fs";
import path from "node:path";

/** Matches package.json build.appId so Windows pins the MM3D icon, not Electron's. */
export const APP_USER_MODEL_ID = "com.moltenmagnolia.inventory";

export function windowIconPath(opts: {
  cwd?: string;
  dirname: string;
  resourcesPath?: string;
}): string | undefined {
  const cwd = opts.cwd ?? process.cwd();
  const candidates = [
    path.join(cwd, "build", "icon.ico"),
    path.join(opts.dirname, "..", "build", "icon.ico"),
    path.join(opts.dirname, "icon.ico"),
    opts.resourcesPath ? path.join(opts.resourcesPath, "icon.ico") : "",
  ].filter(Boolean);
  return candidates.find((file) => fs.existsSync(file));
}

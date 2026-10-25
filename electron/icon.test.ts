import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { APP_USER_MODEL_ID, windowIconPath } from "./icon";

describe("desktop icon", () => {
  it("ships a multi-size Windows ico from the MM3D spreadsheet mark", () => {
    const buf = fs.readFileSync("build/icon.ico");
    expect(buf.readUInt16LE(0)).toBe(0);
    expect(buf.readUInt16LE(2)).toBe(1);
    expect(buf.readUInt16LE(4)).toBeGreaterThanOrEqual(6);
    expect(fs.existsSync("build/icon.png")).toBe(true);
    expect(fs.existsSync("public/icon-192.png")).toBe(true);
    expect(fs.existsSync("public/icon-512.png")).toBe(true);
  });

  it("bakes the MM3D ico into the Windows exe without code-signing", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
      build: {
        appId: string;
        extraResources: Array<{ from: string; to: string }>;
        files: string[];
        nsis: { installerIcon: string; uninstallerIcon: string };
        win: {
          icon: string;
          signAndEditExecutable?: boolean;
          signExecutable?: boolean;
        };
      };
    };
    expect(pkg.build.appId).toBe(APP_USER_MODEL_ID);
    expect(pkg.build.win.icon).toBe("build/icon.ico");
    expect(pkg.build.win.signAndEditExecutable).not.toBe(false);
    expect(pkg.build.win.signExecutable).toBe(false);
    expect(pkg.build.files).toContain("build/icon.ico");
    expect(pkg.build.extraResources).toContainEqual({ from: "build/icon.ico", to: "icon.ico" });
    expect(pkg.build.nsis.installerIcon).toBe("build/icon.ico");
    expect(pkg.build.nsis.uninstallerIcon).toBe("build/icon.ico");

    const main = fs.readFileSync("electron/main.ts", "utf8");
    expect(main).toContain("setAppUserModelId(APP_USER_MODEL_ID)");
    expect(main).toContain("windowIconPath(");
  });

  it("finds the MM3D ico for the running window, not Electron's default", () => {
    const fromBuild = windowIconPath({
      cwd: process.cwd(),
      dirname: path.join(os.tmpdir(), "mm3d-missing"),
      resourcesPath: path.join(os.tmpdir(), "mm3d-missing-resources"),
    });
    expect(fromBuild).toBe(path.join(process.cwd(), "build", "icon.ico"));

    const packagedDir = fs.mkdtempSync(path.join(os.tmpdir(), "mm3d-icon-"));
    const resources = path.join(packagedDir, "resources");
    fs.mkdirSync(resources);
    const packagedIcon = path.join(resources, "icon.ico");
    fs.copyFileSync("build/icon.ico", packagedIcon);
    expect(
      windowIconPath({
        cwd: packagedDir,
        dirname: path.join(packagedDir, "dist-electron"),
        resourcesPath: resources,
      }),
    ).toBe(packagedIcon);
  });
});

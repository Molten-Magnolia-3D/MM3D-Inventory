import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("electron ESM specifiers", () => {
  it("uses .js on relative imports so the packaged asar can load", () => {
    for (const file of ["electron/main.ts", "electron/updater.ts", "electron/preload.ts"]) {
      const src = fs.readFileSync(file, "utf8");
      const specs = [...src.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((match) => match[1]);
      expect(specs.length).toBeGreaterThan(0);
      for (const spec of specs) {
        expect(spec, `${file} import ${spec}`).toMatch(/\.js$/);
      }
    }
  });
});

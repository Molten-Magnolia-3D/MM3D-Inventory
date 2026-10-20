import fs from "node:fs";
import { describe, expect, it } from "vitest";

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
});

import { describe, expect, it } from "vitest";
import {
  isNewerVersion,
  parseSemver,
  readRemoteVersion,
  unavailableUpdate,
  versionJsonUrl,
} from "./update";

describe("update status", () => {
  it("marks development copies as unable to self-update", () => {
    const status = unavailableUpdate("1.0.5", "Updates are checked in the installed Windows app.");
    expect(status.state).toBe("unavailable");
    expect(status.packaged).toBe(false);
    expect(status.version).toBe("1.0.5");
  });

  it("compares stamped shop versions", () => {
    expect(parseSemver("1.0.33")).toEqual([1, 0, 33]);
    expect(isNewerVersion("1.0.40", "1.0.33")).toBe(true);
    expect(isNewerVersion("1.0.33", "1.0.33")).toBe(false);
    expect(isNewerVersion("1.0.32", "1.0.33")).toBe(false);
    expect(isNewerVersion("2.0.1", "1.9.99")).toBe(true);
  });

  it("reads version.json and resolves it next to the phone page", () => {
    expect(readRemoteVersion({ version: "1.0.41" })).toBe("1.0.41");
    expect(readRemoteVersion({ version: "  " })).toBeNull();
    expect(
      versionJsonUrl("https://molten-magnolia-3d.github.io/MM3D-Inventory/#/items", 99),
    ).toBe("https://molten-magnolia-3d.github.io/MM3D-Inventory/version.json?t=99");
  });
});

import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createWebUpdater } from "./webUpdate";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

describe("phone web updater", () => {
  it("stays idle when the published version matches this copy", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ version: "1.0.33" }));
    const updater = createWebUpdater({
      version: "1.0.33",
      href: "https://molten-magnolia-3d.github.io/MM3D-Inventory/#/",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => 7,
    });
    const status = await updater.check(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://molten-magnolia-3d.github.io/MM3D-Inventory/version.json?t=7",
      { cache: "no-store" },
    );
    expect(status.state).toBe("idle");
    expect(status.message).toMatch(/1\.0\.33/);
  });

  it("reloads once when a newer Pages build is published", async () => {
    const reload = vi.fn();
    const storage = new Map<string, string>();
    const updater = createWebUpdater({
      version: "1.0.33",
      href: "https://molten-magnolia-3d.github.io/MM3D-Inventory/",
      fetchImpl: (async () => jsonResponse({ version: "1.0.40" })) as unknown as typeof fetch,
      reload,
      visibility: () => "visible",
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
      },
    });
    const status = await updater.check(false);
    expect(status.state).toBe("ready");
    expect(status.versionAvailable).toBe("1.0.40");
    expect(reload).toHaveBeenCalledTimes(1);
    await updater.check(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload on a later poll while the shop screen is still open", async () => {
    const reload = vi.fn();
    let remote = "1.0.40";
    const storage = new Map<string, string>();
    const updater = createWebUpdater({
      version: "1.0.33",
      href: "https://example.test/app/",
      fetchImpl: (async () => jsonResponse({ version: remote })) as unknown as typeof fetch,
      reload,
      visibility: () => "visible",
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          storage.set(key, value);
        },
      },
    });
    await updater.check(false);
    expect(reload).toHaveBeenCalledTimes(1);
    reload.mockClear();
    remote = "1.0.42";
    await updater.check(false);
    expect(updater.getStatus().state).toBe("ready");
    expect(updater.getStatus().versionAvailable).toBe("1.0.42");
    expect(reload).not.toHaveBeenCalled();
  });

  it("keeps version.json off the service-worker cache", () => {
    const sw = fs.readFileSync("public/sw.js", "utf8");
    expect(sw).toMatch(/version\.json/);
    expect(sw).toMatch(/cache: "no-store"/);
  });
});

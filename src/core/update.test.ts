import { describe, expect, it } from "vitest";
import { unavailableUpdate } from "./update";

describe("update status", () => {
  it("marks browser copies as unable to self-update", () => {
    const status = unavailableUpdate("web", "Updates apply to the installed Windows Setup app.");
    expect(status.state).toBe("unavailable");
    expect(status.packaged).toBe(false);
    expect(status.version).toBe("web");
  });
});

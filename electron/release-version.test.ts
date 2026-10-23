import { describe, expect, it } from "vitest";
import { nextReleaseVersion } from "../scripts/release-version.mjs";

describe("release version stamp", () => {
  it("uses the workflow run number when it is ahead of the package patch", () => {
    expect(nextReleaseVersion("1.0.5", 15)).toBe("1.0.15");
  });

  it("always moves past the package.json patch so shops on that build update", () => {
    expect(nextReleaseVersion("1.0.5", 3)).toBe("1.0.6");
    expect(nextReleaseVersion("1.0.5", 5)).toBe("1.0.6");
  });

  it("keeps major.minor when the series changes", () => {
    expect(nextReleaseVersion("1.1.0", 20)).toBe("1.1.20");
    expect(nextReleaseVersion("2.0.0", 4)).toBe("2.0.4");
  });

  it("rejects a missing run number", () => {
    expect(() => nextReleaseVersion("1.0.5", "")).toThrow(/GITHUB_RUN_NUMBER/);
  });
});

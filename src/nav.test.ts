import { describe, expect, it } from "vitest";
import { isMoreNavPath, isPrimaryNavPath, navPathname } from "./nav";

describe("mobile nav groups", () => {
  it("normalizes empty and missing slashes", () => {
    expect(navPathname("")).toBe("/");
    expect(navPathname("settings")).toBe("/settings");
  });

  it("keeps shop, scan, items, and kits on the phone dock", () => {
    expect(isPrimaryNavPath("/")).toBe(true);
    expect(isPrimaryNavPath("/scan")).toBe(true);
    expect(isPrimaryNavPath("/items")).toBe(true);
    expect(isPrimaryNavPath("/items/sku-1")).toBe(true);
    expect(isPrimaryNavPath("/kits/harrier")).toBe(true);
  });

  it("puts the remaining shop pages behind More", () => {
    expect(isMoreNavPath("/locations")).toBe(true);
    expect(isMoreNavPath("/filament/spool-1")).toBe(true);
    expect(isMoreNavPath("/movements")).toBe(true);
    expect(isMoreNavPath("/labels")).toBe(true);
    expect(isMoreNavPath("/csv")).toBe(true);
    expect(isMoreNavPath("/settings")).toBe(true);
    expect(isMoreNavPath("/")).toBe(false);
    expect(isMoreNavPath("/kits")).toBe(false);
  });
});

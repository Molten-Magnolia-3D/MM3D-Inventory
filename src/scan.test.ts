import { describe, expect, it } from "vitest";
import { cameraScanAvailable, hitRoute, normalizeScannedCode } from "./scan";
import type { LookupHit } from "./core/types";

describe("scan helpers", () => {
  it("trims scanner junk off a barcode", () => {
    expect(normalizeScannedCode("  BIN-A1\n")).toBe("BIN-A1");
    expect(normalizeScannedCode("\u0000SKU-1")).toBe("SKU-1");
  });

  it("routes a lookup hit to the matching shop page", () => {
    expect(
      hitRoute({ kind: "bin", location: { id: "loc-1" } } as LookupHit),
    ).toBe("/locations?bin=loc-1");
    expect(hitRoute({ kind: "item", item: { id: "item-1" } } as LookupHit)).toBe("/items/item-1");
    expect(hitRoute({ kind: "kit", kit: { id: "kit-1" } } as LookupHit)).toBe("/kits/kit-1");
    expect(hitRoute({ kind: "spool", spool: { id: "sp-1" } } as LookupHit)).toBe("/filament/sp-1");
    expect(hitRoute({ kind: "none", code: "x" })).toBeNull();
  });

  it("hides camera scanning in the Windows app", () => {
    expect(cameraScanAvailable(true)).toBe(false);
  });
});

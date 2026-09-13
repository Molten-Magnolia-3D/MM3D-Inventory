import { describe, expect, it } from "vitest";
import { flattenBom, canMakeFromStock, allocateFromLots } from "../core/kits";
import type { BomLine, StockRow } from "../core/types";

function line(partial: Partial<BomLine> & { kitId: string }): BomLine {
  return {
    id: partial.id ?? crypto.randomUUID(),
    kitId: partial.kitId,
    componentItemId: partial.componentItemId ?? null,
    nestedKitId: partial.nestedKitId ?? null,
    qty: partial.qty ?? 1,
    filamentGrams: partial.filamentGrams ?? null,
    filamentMaterial: partial.filamentMaterial ?? null,
    notes: partial.notes ?? null,
    sortOrder: partial.sortOrder ?? 0,
  };
}

describe("flattenBom", () => {
  it("expands nested kits into shared and unique parts", () => {
    const map = new Map<string, BomLine[]>([
      [
        "harrier-shared",
        [
          line({ kitId: "harrier-shared", componentItemId: "pen", qty: 1 }),
          line({ kitId: "harrier-shared", componentItemId: "wings", qty: 1 }),
        ],
      ],
      [
        "kit-231",
        [
          line({ kitId: "kit-231", nestedKitId: "harrier-shared", qty: 1 }),
          line({ kitId: "kit-231", componentItemId: "dec-231", qty: 1 }),
          line({
            kitId: "kit-231",
            componentItemId: "can-231",
            qty: 1,
            filamentGrams: 12,
            filamentMaterial: "PLA",
          }),
        ],
      ],
    ]);
    const leaves = flattenBom("kit-231", map);
    expect(leaves.find((l) => l.itemId === "pen")?.qty).toBe(1);
    expect(leaves.find((l) => l.itemId === "wings")?.qty).toBe(1);
    expect(leaves.find((l) => l.itemId === "dec-231")?.qty).toBe(1);
    expect(leaves.find((l) => l.itemId === "can-231")?.filamentGrams).toBe(12);
  });

  it("rejects cyclic nested kits", () => {
    const map = new Map<string, BomLine[]>([
      ["a", [line({ kitId: "a", nestedKitId: "b", qty: 1 })]],
      ["b", [line({ kitId: "b", nestedKitId: "a", qty: 1 })]],
    ]);
    expect(() => flattenBom("a", map)).toThrow(/cycle/i);
  });
});

describe("canMakeFromStock", () => {
  it("is limited by the scarcest shared part", () => {
    const leaves = flattenBom(
      "kit-231",
      new Map([
        [
          "kit-231",
          [
            line({ kitId: "kit-231", componentItemId: "pen", qty: 1 }),
            line({ kitId: "kit-231", componentItemId: "dec-231", qty: 1 }),
          ],
        ],
      ]),
    );
    const n = canMakeFromStock(
      leaves,
      new Map([
        ["pen", 12],
        ["dec-231", 4],
      ]),
      new Map(),
      0,
    );
    expect(n).toBe(4);
  });

  it("counts filament grams by material", () => {
    const leaves = [
      {
        itemId: "can-231",
        qty: 1,
        filamentGrams: 12,
        filamentMaterial: "PLA",
        sourceKitIds: ["kit-231"],
      },
    ];
    expect(
      canMakeFromStock(leaves, new Map([["can-231", 10]]), new Map([["PLA", 20]]), 20),
    ).toBe(1);
    expect(
      canMakeFromStock(leaves, new Map([["can-231", 10]]), new Map([["PLA", 120]]), 120),
    ).toBe(10);
  });
});

describe("allocateFromLots", () => {
  it("pulls from the fullest bin first", () => {
    const lots: StockRow[] = [
      { itemId: "pen", locationId: "b", qty: 2, updatedAt: "" },
      { itemId: "pen", locationId: "a", qty: 10, updatedAt: "" },
    ];
    const { allocations } = allocateFromLots("pen", 11, lots);
    expect(allocations).toEqual([
      { itemId: "pen", locationId: "a", qty: 10 },
      { itemId: "pen", locationId: "b", qty: 1 },
    ]);
  });
});

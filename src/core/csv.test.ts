import { describe, expect, it } from "vitest";
import { importCsv, TEMPLATE_CSV } from "./csv";
import { freshInventory } from "../test/helpers";

const SQUARESPACE_CSV = `\uFEFFProduct Type,Title,Description,SKU,Option Name 1,Option Value 1,Price,Sale Price,On Sale,Stock,Categories
PHYSICAL,Harrier 231 kit,<p>Ready to fly</p>,KIT-H-231,Color,Black,42.00,35.00,Yes,5,Pens
PHYSICAL,Harrier 542 kit,,KIT-H-542,Color,Olive,48.00,,No,Unlimited,Pens
`;

describe("csv import", () => {
  it("still loads the MM3D template", async () => {
    const inv = await freshInventory();
    const result = importCsv(inv, TEMPLATE_CSV);
    expect(result.errors).toEqual([]);
    expect(inv.getItemBySku("PEN-BODY")?.name).toBe("Pen body");
  });

  it("imports a Squarespace product export into items and stock", async () => {
    const inv = await freshInventory();
    const result = importCsv(inv, SQUARESPACE_CSV);
    expect(result.errors).toEqual([]);
    expect(result.created.items).toBe(2);
    expect(result.created.stock).toBe(1);
    const kit = inv.getItemBySku("KIT-H-231")!;
    expect(kit.name).toBe("Harrier 231 kit / Black");
    expect(kit.type).toBe("product");
    expect(kit.sellPriceUsd).toBe(35);
    expect(inv.totalQty(kit.id)).toBe(5);
    expect(inv.getItemBySku("KIT-H-542")?.sellPriceUsd).toBe(48);
    expect(inv.totalQty(inv.getItemBySku("KIT-H-542")!.id)).toBe(0);
    expect(inv.listLocations().some((l) => l.barcode === "BIN-IMPORT")).toBe(true);
  });

  it("rejects Squarespace order exports instead of silently skipping them", async () => {
    const inv = await freshInventory();
    const result = importCsv(
      inv,
      `Order ID,Order Date,Customer Email,Product Name,SKU,Quantity
123,2026-01-01,a@b.com,Harrier,KIT-H-231,1`,
    );
    expect(result.created.items).toBe(0);
    expect(result.errors[0]).toMatch(/orders export/i);
  });
});

import { describe, expect, it } from "vitest";
import { importCsv, TEMPLATE_CSV } from "./csv";
import { freshInventory } from "../test/helpers";

const SQUARESPACE_CSV = `\uFEFFProduct Type,Title,Description,SKU,Option Name 1,Option Value 1,Price,Sale Price,On Sale,Stock,Categories
PHYSICAL,Harrier 231 kit,<p>Ready to fly</p>,KIT-H-231,Color,Black,42.00,35.00,Yes,5,Pens
PHYSICAL,Harrier 542 kit,,KIT-H-542,Color,Olive,48.00,,No,Unlimited,Pens
`;

const SQUARESPACE_VARIANTS_CSV = `"Product ID [Non Editable]","Variant ID [Non Editable]","Product Type [Non Editable]","Title","SKU","Option Name 1","Option Value 1","Option Name 2","Option Value 2","Price","Sale Price","On Sale","Stock","Categories","Tags"
"abc","v1","PHYSICAL","AV8B Squadrons Unit Patches","SQ0076717","Squadron","VMAT-203","Size","Small","10.00","0.00","No","Unlimited","","patches"
"","v2","","","SQ8799192","Squadron","VMAT-203","Size","Medium","20.00","0.00","No","Unlimited","",""
"","v3","","","SQ2218334","Squadron","VMA-231","Size","Large","30.00","0.00","No","Unlimited","",""
"mug1","v4","PHYSICAL","Commemorative Harrier Squadron Mug - VMA-231","695800E6BD68A_11-oz","Size","11 oz","","","10.00","0.00","No","Unlimited","","mugs"
"","v5","","","695800E6BD68A_15-oz","Size","15 oz","","","12.00","0.00","No","Unlimited","",""
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
    expect(kit.name).toBe("Harrier 231 kit");
    expect(kit.variant).toBe("Color: Black");
    expect(kit.type).toBe("product");
    expect(kit.sellPriceUsd).toBe(35);
    expect(inv.totalQty(kit.id)).toBe(5);
    expect(inv.getItemBySku("KIT-H-542")?.sellPriceUsd).toBe(48);
    expect(inv.totalQty(inv.getItemBySku("KIT-H-542")!.id)).toBe(0);
    expect(inv.listLocations().some((l) => l.barcode === "BIN-IMPORT")).toBe(true);
  });

  it("keeps the product title and puts Squarespace options in variant", async () => {
    const inv = await freshInventory();
    const result = importCsv(inv, SQUARESPACE_VARIANTS_CSV);
    expect(result.errors).toEqual([]);
    expect(result.created.items).toBe(5);

    const patch = inv.getItemBySku("SQ8799192")!;
    expect(patch.name).toBe("AV8B Squadrons Unit Patches");
    expect(patch.variant).toBe("Squadron: VMAT-203 · Size: Medium");

    const mug11 = inv.getItemBySku("695800E6BD68A_11-OZ")!;
    const mug15 = inv.getItemBySku("695800E6BD68A_15-OZ")!;
    expect(mug11.name).toBe("Commemorative Harrier Squadron Mug - VMA-231");
    expect(mug11.variant).toBe("Size: 11 oz");
    expect(mug15.name).toBe("Commemorative Harrier Squadron Mug - VMA-231");
    expect(mug15.variant).toBe("Size: 15 oz");
    expect(mug15.sellPriceUsd).toBe(12);
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

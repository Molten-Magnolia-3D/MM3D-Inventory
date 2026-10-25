import type { Inventory } from "./inventory";

export function loadSampleWorkshop(inv: Inventory): void {
  const workshop = inv.createLocation({
    name: "Workshop",
    type: "building",
    area: "hardware",
    barcode: "LOC-WS",
  });
  const hwRoom = inv.createLocation({
    name: "Hardware room",
    type: "room",
    area: "hardware",
    parentId: workshop.id,
    barcode: "LOC-HW",
  });
  const shelf = inv.createLocation({
    name: "Small hardware",
    type: "shelf",
    area: "hardware",
    parentId: hwRoom.id,
  });
  const binA1 = inv.createLocation({
    name: "Bin A1",
    type: "bin",
    area: "hardware",
    parentId: shelf.id,
    barcode: "BIN-A1",
  });
  const binB2 = inv.createLocation({
    name: "Bin B2",
    type: "bin",
    area: "hardware",
    parentId: shelf.id,
    barcode: "BIN-B2",
  });
  const filWall = inv.createLocation({
    name: "Filament wall",
    type: "area",
    area: "filament",
    parentId: workshop.id,
    barcode: "LOC-FIL",
  });
  const plaTote = inv.createLocation({
    name: "PLA tote",
    type: "tote",
    area: "filament",
    parentId: filWall.id,
    barcode: "TOTE-PLA",
  });

  const body = inv.createItem({
    sku: "PEN-BODY",
    name: "Pen body",
    type: "part",
    barcode: "PEN-BODY",
    costUsd: 2.4,
    sellPriceUsd: 18,
    notes: "Shared across Harrier kits",
  });
  const wings = inv.createItem({
    sku: "WING-SET",
    name: "Wing set",
    type: "part",
    barcode: "WING-SET",
    costUsd: 1.1,
  });
  const hw = inv.createItem({
    sku: "HW-PACK",
    name: "Hardware pack",
    type: "consumable",
    barcode: "HW-PACK",
    costUsd: 0.35,
  });
  const dec231 = inv.createItem({
    sku: "DEC-231",
    name: "231 squadron decals",
    type: "part",
    barcode: "DEC-231",
    costUsd: 0.9,
    notes: "Livery-specific",
  });
  const dec542 = inv.createItem({
    sku: "DEC-542",
    name: "542 squadron decals",
    type: "part",
    barcode: "DEC-542",
    costUsd: 0.9,
    notes: "Livery-specific",
  });
  const can231 = inv.createItem({
    sku: "CAN-231",
    name: "231 canopy tint",
    type: "part",
    barcode: "CAN-231",
    costUsd: 0.55,
  });
  const can542 = inv.createItem({
    sku: "CAN-542",
    name: "542 canopy tint",
    type: "part",
    barcode: "CAN-542",
    costUsd: 0.55,
  });
  const pla = inv.createItem({
    sku: "PLA-BLK",
    name: "PLA Black",
    type: "filament",
    barcode: "PLA-BLK",
    costUsd: 18,
  });

  inv.receive({ itemId: body.id, locationId: binA1.id, qty: 10, note: "Sample" });
  inv.receive({ itemId: body.id, locationId: binB2.id, qty: 2, note: "Overflow" });
  inv.receive({ itemId: wings.id, locationId: binA1.id, qty: 8, note: "Sample" });
  inv.receive({ itemId: hw.id, locationId: binA1.id, qty: 20, note: "Sample" });
  inv.receive({ itemId: dec231.id, locationId: binA1.id, qty: 5, note: "Sample" });
  inv.receive({ itemId: dec542.id, locationId: binA1.id, qty: 4, note: "Sample" });
  inv.receive({ itemId: can231.id, locationId: binA1.id, qty: 5, note: "Sample" });
  inv.receive({ itemId: can542.id, locationId: binA1.id, qty: 4, note: "Sample" });

  const kit231 = inv.createKit({
    sku: "KIT-HARRIER-231",
    name: "Harrier 231 kit",
    barcode: "KIT-HARRIER-231",
    sellPriceUsd: 42,
    notes: "Shared pens/wings + 231 livery",
  });
  const kit542 = inv.createKit({
    sku: "KIT-HARRIER-542",
    name: "Harrier 542 kit",
    barcode: "KIT-HARRIER-542",
    sellPriceUsd: 42,
    notes: "Shared pens/wings + 542 livery",
  });

  const sharedLines = [
    { item: body, qty: 1 },
    { item: wings, qty: 1 },
    { item: hw, qty: 1 },
  ];
  inv.setBom(kit231.id, [
    ...sharedLines.map((l, i) => ({
      componentItemId: l.item.id,
      nestedKitId: null,
      qty: l.qty,
      filamentGrams: null,
      filamentMaterial: null,
      notes: "shared",
      sortOrder: i,
    })),
    {
      componentItemId: dec231.id,
      nestedKitId: null,
      qty: 1,
      filamentGrams: null,
      filamentMaterial: null,
      notes: "livery",
      sortOrder: 3,
    },
    {
      componentItemId: can231.id,
      nestedKitId: null,
      qty: 1,
      filamentGrams: 12,
      filamentMaterial: "PLA",
      notes: "printed canopy",
      sortOrder: 4,
    },
  ]);
  inv.setBom(kit542.id, [
    ...sharedLines.map((l, i) => ({
      componentItemId: l.item.id,
      nestedKitId: null,
      qty: l.qty,
      filamentGrams: null,
      filamentMaterial: null,
      notes: "shared",
      sortOrder: i,
    })),
    {
      componentItemId: dec542.id,
      nestedKitId: null,
      qty: 1,
      filamentGrams: null,
      filamentMaterial: null,
      notes: "livery",
      sortOrder: 3,
    },
    {
      componentItemId: can542.id,
      nestedKitId: null,
      qty: 1,
      filamentGrams: 12,
      filamentMaterial: "PLA",
      notes: "printed canopy",
      sortOrder: 4,
    },
  ]);

  inv.createSpool({
    itemId: pla.id,
    locationId: plaTote.id,
    barcode: "SP-PLA-BLK-01",
    brand: "Bambu",
    material: "PLA",
    colorName: "Black",
    colorHex: "#171717",
    startingGrams: 1000,
    remainingGrams: 640,
    costPerKgUsd: 22.99,
  });
  inv.createSpool({
    itemId: pla.id,
    locationId: plaTote.id,
    barcode: "SP-PLA-OD-02",
    brand: "Bambu",
    material: "PLA",
    colorName: "Olive drab",
    colorHex: "#4b5320",
    startingGrams: 1000,
    remainingGrams: 80,
    costPerKgUsd: 22.99,
    notes: "Low — used on canopies",
  });
}

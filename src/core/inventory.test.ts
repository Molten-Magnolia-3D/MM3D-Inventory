import { describe, expect, it } from "vitest";
import { exportCsv, importCsv, TEMPLATE_CSV } from "./csv";
import { MemoryCloud, syncNow } from "./sync";
import { loadSampleWorkshop } from "./seed";
import { freshInventory } from "../test/helpers";

describe("inventory v1", () => {
  it("registers a single owner and rejects a second account", async () => {
    const inv = await freshInventory();
    const user = await inv.register("owner@moltenmagnolia3d.com", "correct-horse");
    expect(user.email).toBe("owner@moltenmagnolia3d.com");
    await expect(inv.register("other@x.com", "password12")).rejects.toThrow(/already has an owner/i);
    await inv.logout();
    await expect(inv.login("owner@moltenmagnolia3d.com", "wrong-password")).rejects.toThrow(
      /incorrect/i,
    );
    const back = await inv.login("owner@moltenmagnolia3d.com", "correct-horse");
    expect(back.id).toBe(user.id);
  });

  it("tracks the same SKU across bins and totals them", async () => {
    const inv = await freshInventory();
    const room = inv.createLocation({ name: "Room", type: "room", area: "hardware" });
    const a = inv.createLocation({ name: "A1", type: "bin", area: "hardware", parentId: room.id, barcode: "BIN-A1" });
    const b = inv.createLocation({ name: "B2", type: "bin", area: "hardware", parentId: room.id, barcode: "BIN-B2" });
    const pen = inv.createItem({ sku: "pen-body", name: "Pen body", type: "part", barcode: "PEN-BODY", costUsd: 2.4, sellPriceUsd: 18 });
    inv.receive({ itemId: pen.id, locationId: a.id, qty: 10 });
    inv.receive({ itemId: pen.id, locationId: b.id, qty: 2 });
    const view = inv.itemWithStock(pen.id)!;
    expect(view.totalQty).toBe(12);
    expect(view.lots).toHaveLength(2);
    expect(view.marginUsd).toBe(15.6);
    const bin = inv.lookup("BIN-A1");
    expect(bin.kind).toBe("bin");
    if (bin.kind === "bin") {
      expect(bin.contents.items[0]?.qty).toBe(10);
      expect(bin.contents.items[0]?.barcode).toBe("PEN-BODY");
    }
  });

  it("warns but allows negative stock on use", async () => {
    const inv = await freshInventory();
    const bin = inv.createLocation({ name: "Bin", type: "bin", area: "hardware", barcode: "BIN-1" });
    const item = inv.createItem({ sku: "HW", name: "Screw", type: "consumable" });
    inv.receive({ itemId: item.id, locationId: bin.id, qty: 1 });
    const result = inv.useOrScrap("use", { itemId: item.id, locationId: bin.id, qty: 3, note: "job" });
    expect(result.warnings[0]?.code).toBe("negative_stock");
    expect(inv.totalQty(item.id)).toBe(-2);
  });

  it("updates every kit can-make when shared stock changes", async () => {
    const inv = await freshInventory();
    loadSampleWorkshop(inv);
    const before231 = inv.kitView(inv.listKits().find((k) => k.sku === "KIT-HARRIER-231")!.id)!;
    const before542 = inv.kitView(inv.listKits().find((k) => k.sku === "KIT-HARRIER-542")!.id)!;
    expect(before231.canMake).toBe(5);
    expect(before542.canMake).toBe(4);
    const wings = inv.getItemBySku("WING-SET")!;
    const bin = inv.listLocations().find((l) => l.barcode === "BIN-A1")!;
    inv.useOrScrap("use", { itemId: wings.id, locationId: bin.id, qty: 6 });
    expect(inv.kitView(before231.id)!.canMake).toBe(2);
    expect(inv.kitView(before542.id)!.canMake).toBe(2);
  });

  it("sells a kit by subtracting parts and picked filament grams", async () => {
    const inv = await freshInventory();
    loadSampleWorkshop(inv);
    const kit = inv.listKits().find((k) => k.sku === "KIT-HARRIER-231")!;
    const spool = inv.listSpools().find((s) => s.barcode === "SP-PLA-BLK-01")!;
    const result = inv.sellKit({
      kitId: kit.id,
      qty: 1,
      note: "Etsy order",
      filament: [{ spoolId: spool.id, grams: 12 }],
    });
    expect(result.data.sellPriceUsd).toBe(42);
    expect(result.data.marginUsd).toBeGreaterThan(0);
    expect(inv.totalQty(inv.getItemBySku("PEN-BODY")!.id)).toBe(11);
    expect(inv.totalQty(inv.getItemBySku("DEC-231")!.id)).toBe(4);
    expect(inv.totalQty(inv.getItemBySku("DEC-542")!.id)).toBe(4);
    expect(inv.getSpool(spool.id)!.remainingGrams).toBe(628);
    expect(inv.spoolUsage(spool.id)[0]?.jobName).toMatch(/Harrier 231/);
    expect(inv.kitView(kit.id)!.canMake).toBe(4);
  });

  it("looks up a spool barcode and logs usage", async () => {
    const inv = await freshInventory();
    loadSampleWorkshop(inv);
    const hit = inv.lookup("SP-PLA-OD-02");
    expect(hit.kind).toBe("spool");
    if (hit.kind !== "spool") return;
    const result = inv.logSpoolUsage({
      spoolId: hit.spool.id,
      grams: 30,
      jobName: "Canopy batch",
    });
    expect(result.data.weightAfter).toBe(50);
    const low = inv.lowStockFilament();
    expect(low.some((g) => g.colorName === "Olive drab" && g.level === "critical")).toBe(true);
  });

  it("round-trips CSV import and export", async () => {
    const inv = await freshInventory();
    const imported = importCsv(inv, TEMPLATE_CSV);
    expect(imported.errors).toEqual([]);
    expect(inv.getItemBySku("PEN-BODY")).toBeTruthy();
    expect(inv.listKits().some((k) => k.sku === "KIT-HARRIER-231")).toBe(true);
    const csv = exportCsv(inv);
    const other = await freshInventory();
    const again = importCsv(other, csv);
    expect(again.errors).toEqual([]);
    expect(other.getItemBySku("PEN-BODY")?.name).toBe("Pen body");
    expect(other.kitView(other.listKits()[0]!.id)?.canMake).toBeGreaterThan(0);
  });

  it("keeps a one-PC lock until it goes stale", async () => {
    const inv = await freshInventory();
    const cloud = new MemoryCloud();
    const a = { id: "pc-a", hostname: "SHOP-PC" };
    const b = { id: "pc-b", hostname: "LAPTOP" };
    const first = await syncNow(inv, cloud, a);
    expect(first.lock.holder).toBe(true);
    const blocked = await syncNow(inv, cloud, b);
    expect(blocked.pushed).toBe(false);
    expect(inv.readOnly).toBe(true);
    cloud.lock!.heartbeatAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    inv.readOnly = false;
    const takeover = await syncNow(inv, cloud, b);
    expect(takeover.lock.deviceId).toBe("pc-b");
    expect(inv.readOnly).toBe(false);
  });
});

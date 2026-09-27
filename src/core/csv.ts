import Papa from "papaparse";
import type { Inventory } from "./inventory";
import type { BomLine, ItemType, LocationArea, LocationType } from "./types";
import { slugSku } from "./util";

export const CSV_SECTIONS = [
  "locations",
  "items",
  "stock",
  "kits",
  "bom",
  "spools",
] as const;

type Row = Record<string, string>;

export const TEMPLATE_HEADER = [
  "section",
  "sku",
  "name",
  "type",
  "area",
  "parent_path",
  "path",
  "barcode",
  "qty",
  "cost_usd",
  "sell_price_usd",
  "notes",
  "kit_sku",
  "component_sku",
  "nested_kit_sku",
  "filament_grams",
  "filament_material",
  "brand",
  "material",
  "color_name",
  "color_hex",
  "starting_grams",
  "remaining_grams",
  "location_path",
  "location_barcode",
  "cost_per_kg_usd",
];

function row(partial: Record<string, string | number>): Row {
  const out: Row = {};
  for (const key of TEMPLATE_HEADER) out[key] = "";
  for (const [key, value] of Object.entries(partial)) out[key] = String(value);
  return out;
}

export const TEMPLATE_ROWS: Row[] = [
  row({ section: "locations", name: "Workshop", type: "building", area: "hardware", path: "Workshop", barcode: "LOC-WS" }),
  row({
    section: "locations",
    name: "Hardware room",
    type: "room",
    area: "hardware",
    parent_path: "Workshop",
    path: "Workshop / Hardware room",
    barcode: "LOC-HW",
  }),
  row({
    section: "locations",
    name: "Bin A1",
    type: "bin",
    area: "hardware",
    parent_path: "Workshop / Hardware room",
    path: "Workshop / Hardware room / Bin A1",
    barcode: "BIN-A1",
  }),
  row({
    section: "locations",
    name: "Filament wall",
    type: "area",
    area: "filament",
    parent_path: "Workshop",
    path: "Workshop / Filament wall",
    barcode: "LOC-FIL",
  }),
  row({
    section: "items",
    sku: "PEN-BODY",
    name: "Pen body",
    type: "part",
    cost_usd: 2.4,
    sell_price_usd: 18,
    notes: "Shared across Harrier kits",
  }),
  row({ section: "items", sku: "WING-SET", name: "Wing set", type: "part", cost_usd: 1.1 }),
  row({
    section: "items",
    sku: "DEC-231",
    name: "231 squadron decals",
    type: "part",
    cost_usd: 0.9,
    notes: "Livery-specific",
  }),
  row({
    section: "stock",
    sku: "PEN-BODY",
    qty: 12,
    location_path: "Workshop / Hardware room / Bin A1",
    location_barcode: "BIN-A1",
  }),
  row({
    section: "stock",
    sku: "WING-SET",
    qty: 8,
    location_path: "Workshop / Hardware room / Bin A1",
    location_barcode: "BIN-A1",
  }),
  row({
    section: "stock",
    sku: "DEC-231",
    qty: 5,
    location_path: "Workshop / Hardware room / Bin A1",
    location_barcode: "BIN-A1",
  }),
  row({
    section: "kits",
    sku: "KIT-HARRIER-231",
    name: "Harrier 231 kit",
    sell_price_usd: 42,
  }),
  row({ section: "bom", kit_sku: "KIT-HARRIER-231", component_sku: "PEN-BODY", qty: 1 }),
  row({ section: "bom", kit_sku: "KIT-HARRIER-231", component_sku: "WING-SET", qty: 1 }),
  row({
    section: "bom",
    kit_sku: "KIT-HARRIER-231",
    component_sku: "DEC-231",
    qty: 1,
    filament_grams: 12,
    filament_material: "PLA",
  }),
  row({
    section: "spools",
    sku: "PLA-BLK",
    name: "Black PLA spool",
    barcode: "SP-PLA-BLK-01",
    brand: "Bambu",
    material: "PLA",
    color_name: "Black",
    color_hex: "#111111",
    starting_grams: 1000,
    remaining_grams: 640,
    location_path: "Workshop / Filament wall",
    location_barcode: "LOC-FIL",
    cost_per_kg_usd: 22.99,
  }),
];

export const TEMPLATE_CSV = Papa.unparse(TEMPLATE_ROWS, { columns: TEMPLATE_HEADER });

function keyOf(header: string): string {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const HEADER_ALIASES: Record<string, string> = {
  title: "name",
  product_name: "name",
  item_name: "name",
  product_title: "name",
  sku: "sku",
  variant_sku: "sku",
  product_sku: "sku",
  price: "sell_price_usd",
  sale_price: "sale_price",
  stock: "qty",
  quantity: "qty",
  qty: "qty",
  inventory: "qty",
  description: "notes",
  product_type: "product_type",
  categories: "categories",
  tags: "tags",
  on_sale: "on_sale",
  option_name_1: "option_name_1",
  option_value_1: "option_value_1",
  option_name_2: "option_name_2",
  option_value_2: "option_value_2",
  option_name_3: "option_name_3",
  option_value_3: "option_value_3",
  order_id: "order_id",
  order_number: "order_number",
  section: "section",
};

function canonicalHeader(header: string): string {
  const key = keyOf(header);
  return HEADER_ALIASES[key] ?? key;
}

export function parseCsvTable(csvText: string): { headers: string[]; rows: Row[] } {
  const text = csvText.replace(/^\uFEFF/, "").replace(/^sep=.*\r?\n/i, "");
  const parsed = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: canonicalHeader,
  });
  const headers = (parsed.meta.fields ?? []).map(canonicalHeader);
  const rows = parsed.data
    .map((raw) => {
      const out: Row = {};
      for (const [k, v] of Object.entries(raw)) {
        if (!k || k.startsWith("_")) continue;
        out[canonicalHeader(k)] = String(v ?? "").trim();
      }
      return out;
    })
    .filter((entry) => Object.values(entry).some((v) => String(v ?? "").trim()));
  return { headers, rows };
}

function looksLikeOrders(headers: string[]): boolean {
  return headers.includes("order_id") || headers.includes("order_number");
}

function looksLikeSquarespace(headers: string[]): boolean {
  if (headers.includes("section")) return false;
  if (looksLikeOrders(headers)) return false;
  return (
    headers.includes("name") &&
    (headers.includes("sku") || headers.includes("sell_price_usd") || headers.includes("qty") || headers.includes("product_type"))
  );
}

function squarespaceItemName(data: Row): string {
  const bits = [cell(data, "name")];
  for (const i of [1, 2, 3]) {
    const value = cell(data, `option_value_${i}`);
    if (value) bits.push(value);
  }
  return bits.filter(Boolean).join(" / ");
}

function squarespaceToMm3d(rows: Row[]): Row[] {
  const out: Row[] = [
    row({
      section: "locations",
      name: "Imported",
      type: "area",
      area: "hardware",
      path: "Imported",
    }),
    row({
      section: "locations",
      name: "Squarespace",
      type: "bin",
      area: "hardware",
      parent_path: "Imported",
      path: "Imported / Squarespace",
      barcode: "BIN-IMPORT",
    }),
  ];
  for (const data of rows) {
    const name = squarespaceItemName(data);
    const sku = slugSku(cell(data, "sku") || name);
    if (!sku) continue;
    let sell = num(data, "sell_price_usd");
    if (/^yes$/i.test(cell(data, "on_sale")) && num(data, "sale_price")) sell = num(data, "sale_price");
    const notes = [cell(data, "notes"), cell(data, "categories"), cell(data, "tags")]
      .filter(Boolean)
      .join(" · ");
    out.push(
      row({
        section: "items",
        sku,
        name: name || sku,
        type: "product",
        barcode: sku,
        sell_price_usd: sell,
        notes,
      }),
    );
    const qtyRaw = cell(data, "qty");
    if (qtyRaw && !/^unlimited$/i.test(qtyRaw)) {
      const qty = Number(qtyRaw.replace(/,/g, ""));
      if (Number.isFinite(qty) && qty !== 0) {
        out.push(
          row({
            section: "stock",
            sku,
            qty,
            location_path: "Imported / Squarespace",
            location_barcode: "BIN-IMPORT",
          }),
        );
      }
    }
  }
  return out;
}

function cell(row: Row, key: string): string {
  return (row[key] ?? "").trim();
}

function num(row: Row, key: string, fallback = 0): number {
  const raw = cell(row, key);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function splitPath(path: string): string[] {
  return path
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
}

function resolveLocation(inv: Inventory, data: Row) {
  const barcode = cell(data, "location_barcode");
  if (barcode) {
    const byCode = inv.listLocations(true).find((l) => l.barcode === barcode);
    if (byCode) return byCode;
  }
  return findLocationByPath(inv, cell(data, "location_path") || barcode);
}

function findLocationByPath(inv: Inventory, path: string) {
  const parts = splitPath(path);
  if (!parts.length) return undefined;
  const all = inv.listLocations(true);
  for (const loc of all) {
    if (inv.locationPath(loc.id) === parts.join(" → ") || inv.locationPath(loc.id) === parts.join(" / ")) {
      return loc;
    }
  }
  let parentId: string | null = null;
  let found;
  for (const name of parts) {
    found = all.find((l) => l.name === name && (l.parentId ?? null) === parentId);
    if (!found) return undefined;
    parentId = found.id;
  }
  return found;
}

export function exportCsv(inv: Inventory): string {
  const rows: Row[] = [];
  for (const loc of inv.listLocations(true)) {
    const parent = loc.parentId ? inv.getLocation(loc.parentId) : undefined;
    rows.push(
      row({
        section: "locations",
        name: loc.name,
        type: loc.type,
        area: loc.area,
        parent_path: parent ? inv.locationPath(parent.id).replace(/ → /g, " / ") : "",
        path: inv.locationPath(loc.id).replace(/ → /g, " / "),
        barcode: loc.barcode ?? "",
      }),
    );
  }
  for (const item of inv.listItems({ includeArchived: true })) {
    rows.push(
      row({
        section: "items",
        sku: item.sku,
        name: item.name,
        type: item.type,
        barcode: item.barcode ?? "",
        cost_usd: item.costUsd,
        sell_price_usd: item.sellPriceUsd,
        notes: item.notes ?? "",
      }),
    );
  }
  for (const item of inv.listItems({ includeArchived: true })) {
    for (const lot of inv.stockForItem(item.id)) {
      if (!lot.qty) continue;
      rows.push(
        row({
          section: "stock",
          sku: item.sku,
          qty: lot.qty,
          location_path: (lot.locationPath ?? "").replace(/ → /g, " / "),
          location_barcode: lot.locationBarcode ?? "",
        }),
      );
    }
  }
  for (const kit of inv.listKits(true)) {
    rows.push(
      row({
        section: "kits",
        sku: kit.sku,
        name: kit.name,
        barcode: kit.barcode ?? "",
        sell_price_usd: kit.sellPriceUsd,
        notes: kit.notes ?? "",
      }),
    );
  }
  for (const kit of inv.listKits(true)) {
    for (const line of inv.kitBom(kit.id)) {
      const component = line.componentItemId ? inv.getItem(line.componentItemId) : undefined;
      const nested = line.nestedKitId ? inv.getKit(line.nestedKitId) : undefined;
      rows.push(
        row({
          section: "bom",
          kit_sku: kit.sku,
          component_sku: component?.sku ?? "",
          nested_kit_sku: nested?.sku ?? "",
          qty: line.qty,
          filament_grams: line.filamentGrams ?? "",
          filament_material: line.filamentMaterial ?? "",
          notes: line.notes ?? "",
        }),
      );
    }
  }
  for (const spool of inv.listSpools()) {
    const item = spool.itemId ? inv.getItem(spool.itemId) : undefined;
    const loc = spool.locationId ? inv.getLocation(spool.locationId) : undefined;
    rows.push(
      row({
        section: "spools",
        sku: item?.sku ?? "",
        name: `${spool.material} ${spool.colorName}`,
        barcode: spool.barcode ?? "",
        brand: spool.brand ?? "",
        material: spool.material,
        color_name: spool.colorName,
        color_hex: spool.colorHex ?? "",
        starting_grams: spool.startingGrams,
        remaining_grams: spool.remainingGrams,
        location_path: loc ? inv.locationPath(loc.id).replace(/ → /g, " / ") : "",
        location_barcode: loc?.barcode ?? "",
        cost_per_kg_usd: spool.costPerKgUsd,
        notes: spool.notes ?? "",
      }),
    );
  }
  return Papa.unparse(rows, { columns: TEMPLATE_HEADER });
}

export interface ImportResult {
  created: {
    locations: number;
    items: number;
    stock: number;
    kits: number;
    bom: number;
    spools: number;
  };
  errors: string[];
}

export function importCsv(inv: Inventory, csvText: string): ImportResult {
  inv.assertWritable();
  const parsed = parseCsvTable(csvText);
  const created = {
    locations: 0,
    items: 0,
    stock: 0,
    kits: 0,
    bom: 0,
    spools: 0,
  };
  const errors: string[] = [];
  if (looksLikeOrders(parsed.headers)) {
    return {
      created,
      errors: [
        "This looks like a Squarespace orders export. Export products from Products → Export all, then import that file.",
      ],
    };
  }
  let rows = parsed.rows;
  if (looksLikeSquarespace(parsed.headers)) rows = squarespaceToMm3d(rows);
  if (!rows.length) {
    return {
      created,
      errors: [
        `No data rows found. Columns: ${parsed.headers.join(", ") || "(none)"}. Use the MM3D template or a Squarespace product export (Title, SKU, Price, Stock).`,
      ],
    };
  }

  const bySection = (section: string) =>
    rows.filter((r) => (cell(r, "section") || "items") === section);

  for (const row of bySection("locations")) {
    try {
      const path = cell(row, "path") || cell(row, "name");
      if (findLocationByPath(inv, path)) continue;
      const parentPath = cell(row, "parent_path");
      const parent = parentPath ? findLocationByPath(inv, parentPath) : undefined;
      inv.createLocation({
        name: cell(row, "name") || splitPath(path).slice(-1)[0] || "Location",
        type: (cell(row, "type") as LocationType) || "bin",
        area: (cell(row, "area") as LocationArea) || "hardware",
        parentId: parent?.id ?? null,
        barcode: cell(row, "barcode") || null,
      });
      created.locations += 1;
    } catch (err) {
      errors.push(`Location: ${(err as Error).message}`);
    }
  }

  for (const row of bySection("items")) {
    try {
      const sku = slugSku(cell(row, "sku"));
      if (!sku) continue;
      if (inv.getItemBySku(sku)) {
        const existing = inv.getItemBySku(sku)!;
        inv.updateItem(existing.id, {
          name: cell(row, "name") || existing.name,
          type: (cell(row, "type") as ItemType) || existing.type,
          barcode: cell(row, "barcode") || existing.barcode,
          costUsd: num(row, "cost_usd", existing.costUsd),
          sellPriceUsd: num(row, "sell_price_usd", existing.sellPriceUsd),
          notes: cell(row, "notes") || existing.notes,
        });
        continue;
      }
      inv.createItem({
        sku,
        name: cell(row, "name") || sku,
        type: (cell(row, "type") as ItemType) || "part",
        barcode: cell(row, "barcode") || null,
        costUsd: num(row, "cost_usd"),
        sellPriceUsd: num(row, "sell_price_usd"),
        notes: cell(row, "notes") || null,
      });
      created.items += 1;
    } catch (err) {
      errors.push(`Item ${cell(row, "sku")}: ${(err as Error).message}`);
    }
  }

  for (const row of bySection("stock")) {
    try {
      const item = inv.getItemBySku(cell(row, "sku"));
      if (!item) throw new Error(`unknown SKU ${cell(row, "sku")}`);
      const loc = resolveLocation(inv, row);
      if (!loc) throw new Error("location not found");
      inv.receive({ itemId: item.id, locationId: loc.id, qty: num(row, "qty"), note: "CSV import" });
      created.stock += 1;
    } catch (err) {
      errors.push(`Stock ${cell(row, "sku")}: ${(err as Error).message}`);
    }
  }

  for (const row of bySection("kits")) {
    try {
      const sku = slugSku(cell(row, "sku"));
      if (!sku) continue;
      const existing = inv.listKits(true).find((k) => k.sku === sku);
      if (existing) {
        inv.updateKit(existing.id, {
          name: cell(row, "name") || existing.name,
          barcode: cell(row, "barcode") || existing.barcode,
          sellPriceUsd: num(row, "sell_price_usd", existing.sellPriceUsd),
          notes: cell(row, "notes") || existing.notes,
        });
        continue;
      }
      inv.createKit({
        sku,
        name: cell(row, "name") || sku,
        barcode: cell(row, "barcode") || null,
        sellPriceUsd: num(row, "sell_price_usd"),
        notes: cell(row, "notes") || null,
      });
      created.kits += 1;
    } catch (err) {
      errors.push(`Kit ${cell(row, "sku")}: ${(err as Error).message}`);
    }
  }

  const bomByKit = new Map<string, Omit<BomLine, "id" | "kitId">[]>();
  for (const row of bySection("bom")) {
    try {
      const kit = inv.listKits(true).find((k) => k.sku === slugSku(cell(row, "kit_sku")));
      if (!kit) throw new Error(`unknown kit ${cell(row, "kit_sku")}`);
      const component = cell(row, "component_sku")
        ? inv.getItemBySku(cell(row, "component_sku"))
        : undefined;
      const nested = cell(row, "nested_kit_sku")
        ? inv.listKits(true).find((k) => k.sku === slugSku(cell(row, "nested_kit_sku")))
        : undefined;
      const list = bomByKit.get(kit.id) ?? [];
      list.push({
        componentItemId: component?.id ?? null,
        nestedKitId: nested?.id ?? null,
        qty: num(row, "qty", 1),
        filamentGrams: cell(row, "filament_grams") ? num(row, "filament_grams") : null,
        filamentMaterial: cell(row, "filament_material") || null,
        notes: cell(row, "notes") || null,
        sortOrder: list.length,
      });
      bomByKit.set(kit.id, list);
    } catch (err) {
      errors.push(`BOM ${cell(row, "kit_sku")}: ${(err as Error).message}`);
    }
  }
  for (const [kitId, lines] of bomByKit) {
    inv.setBom(kitId, lines);
    created.bom += lines.length;
  }

  for (const row of bySection("spools")) {
    try {
      const loc = resolveLocation(inv, row);
      const item = cell(row, "sku") ? inv.getItemBySku(cell(row, "sku")) : undefined;
      inv.createSpool({
        itemId: item?.id ?? null,
        locationId: loc?.id ?? null,
        barcode: cell(row, "barcode") || null,
        brand: cell(row, "brand") || null,
        material: cell(row, "material") || "PLA",
        colorName: cell(row, "color_name") || cell(row, "name") || "Unknown",
        colorHex: cell(row, "color_hex") || null,
        startingGrams: num(row, "starting_grams", 1000),
        remainingGrams: num(row, "remaining_grams", num(row, "starting_grams", 1000)),
        costPerKgUsd: num(row, "cost_per_kg_usd"),
        notes: cell(row, "notes") || null,
      });
      created.spools += 1;
    } catch (err) {
      errors.push(`Spool ${cell(row, "barcode")}: ${(err as Error).message}`);
    }
  }

  const total = Object.values(created).reduce((sum, n) => sum + n, 0);
  if (!total && !errors.length) {
    errors.push(
      `Nothing imported. Need the MM3D template (section, sku, …) or a Squarespace product export (Title, SKU, Price, Stock). Columns found: ${parsed.headers.join(", ") || "(none)"}`,
    );
  }

  return { created, errors };
}

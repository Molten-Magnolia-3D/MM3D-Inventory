import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { hashPassword, validEmail, verifyPassword } from "./auth";
import { Db } from "./db";
import {
  allocateFromLots,
  canMakeFromStock,
  estimatedCost,
  flattenBom,
} from "./kits";
import { DEFAULT_SETTINGS, SCHEMA_SQL } from "./schema";
import type {
  AppSettings,
  BinContents,
  BomLine,
  FilamentPick,
  FirebaseClientConfig,
  Item,
  ItemType,
  ItemWithStock,
  Kit,
  KitSale,
  KitView,
  Location,
  LocationArea,
  LocationNode,
  LocationType,
  LookupHit,
  LowStockGroup,
  Movement,
  MovementType,
  MutationResult,
  Spool,
  SpoolUsage,
  StockAllocation,
  StockRow,
  StockWarning,
  User,
} from "./types";
import { newId, normalizeBarcode, nowIso, roundGrams, roundMoney, slugSku } from "./util";

let sqlModule: SqlJsStatic | null = null;

export async function loadSql(
  locateFile?: (file: string) => string,
): Promise<SqlJsStatic> {
  if (sqlModule) return sqlModule;
  sqlModule = await initSqlJs({
    locateFile: locateFile ?? ((file) => `/${file}`),
  });
  return sqlModule;
}

export function resetSqlModule(): void {
  sqlModule = null;
}

type LocRow = {
  id: string;
  parent_id: string | null;
  name: string;
  type: string;
  area: string;
  barcode: string | null;
  sort_order: number;
  archived: number;
  updated_at: string;
};

type ItemRow = {
  id: string;
  sku: string;
  name: string;
  type: string;
  barcode: string | null;
  cost_usd: number;
  sell_price_usd: number;
  notes: string | null;
  archived: number;
  updated_at: string;
};

type KitRow = {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  sell_price_usd: number;
  notes: string | null;
  archived: number;
  updated_at: string;
};

type BomRow = {
  id: string;
  kit_id: string;
  component_item_id: string | null;
  nested_kit_id: string | null;
  qty: number;
  filament_grams: number | null;
  filament_material: string | null;
  notes: string | null;
  sort_order: number;
};

type SpoolRow = {
  id: string;
  item_id: string | null;
  location_id: string | null;
  barcode: string | null;
  brand: string | null;
  material: string;
  color_name: string;
  color_hex: string | null;
  starting_grams: number;
  remaining_grams: number;
  cost_per_kg_usd: number;
  notes: string | null;
  opened_at: string | null;
  is_empty: number;
  archived: number;
  updated_at: string;
};

function mapLocation(row: LocRow): Location {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    type: row.type as LocationType,
    area: row.area as LocationArea,
    barcode: row.barcode,
    sortOrder: row.sort_order,
    archived: !!row.archived,
    updatedAt: row.updated_at,
  };
}

function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    type: row.type as ItemType,
    barcode: row.barcode,
    costUsd: row.cost_usd,
    sellPriceUsd: row.sell_price_usd,
    notes: row.notes,
    archived: !!row.archived,
    updatedAt: row.updated_at,
  };
}

function mapKit(row: KitRow): Kit {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    barcode: row.barcode,
    sellPriceUsd: row.sell_price_usd,
    notes: row.notes,
    archived: !!row.archived,
    updatedAt: row.updated_at,
  };
}

function mapBom(row: BomRow): BomLine {
  return {
    id: row.id,
    kitId: row.kit_id,
    componentItemId: row.component_item_id,
    nestedKitId: row.nested_kit_id,
    qty: row.qty,
    filamentGrams: row.filament_grams,
    filamentMaterial: row.filament_material,
    notes: row.notes,
    sortOrder: row.sort_order,
  };
}

function mapSpool(row: SpoolRow): Spool {
  return {
    id: row.id,
    itemId: row.item_id,
    locationId: row.location_id,
    barcode: row.barcode,
    brand: row.brand,
    material: row.material,
    colorName: row.color_name,
    colorHex: row.color_hex,
    startingGrams: row.starting_grams,
    remainingGrams: row.remaining_grams,
    costPerKgUsd: row.cost_per_kg_usd,
    notes: row.notes,
    openedAt: row.opened_at,
    isEmpty: !!row.is_empty,
    archived: !!row.archived,
    updatedAt: row.updated_at,
  };
}

export class Inventory {
  readonly db: Db;
  private persist: (bytes: Uint8Array) => Promise<void> | void;
  readOnly = false;
  readOnlyReason: string | null = null;

  constructor(
    sqlDb: Database,
    persist: (bytes: Uint8Array) => Promise<void> | void = () => undefined,
  ) {
    this.db = new Db(sqlDb);
    this.persist = persist;
  }

  static async create(
    bytes: Uint8Array | null,
    persist: (bytes: Uint8Array) => Promise<void> | void,
    locateFile?: (file: string) => string,
  ): Promise<Inventory> {
    const SQL = await loadSql(locateFile);
    const sqlDb = bytes?.length ? new SQL.Database(bytes) : new SQL.Database();
    const inv = new Inventory(sqlDb, persist);
    inv.migrate();
    return inv;
  }

  migrate(): void {
    this.db.exec(SCHEMA_SQL);
    const rev = this.db.get<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = 'rev'",
    );
    if (!rev) {
      this.db.run("INSERT INTO app_meta(key, value) VALUES(?, ?)", ["rev", "0"]);
      this.db.run("INSERT INTO app_meta(key, value) VALUES(?, ?)", [
        "settings",
        JSON.stringify(DEFAULT_SETTINGS),
      ]);
      this.db.run("INSERT INTO app_meta(key, value) VALUES(?, ?)", [
        "dirty",
        "0",
      ]);
    }
  }

  async save(): Promise<void> {
    await this.persist(this.db.export());
  }

  exportBytes(): Uint8Array {
    return this.db.export();
  }

  markDirty(): void {
    const settings = this.getSettings();
    settings.dirty = true;
    settings.rev += 1;
    this.putSettings(settings);
  }

  getSettings(): AppSettings {
    const row = this.db.get<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = 'settings'",
    );
    const parsed = row ? (JSON.parse(row.value) as Partial<AppSettings>) : {};
    const dirtyRow = this.db.get<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = 'dirty'",
    );
    const revRow = this.db.get<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = 'rev'",
    );
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      dirty: dirtyRow?.value === "1" || parsed.dirty === true,
      rev: Number(revRow?.value ?? parsed.rev ?? 0),
    };
  }

  putSettings(next: AppSettings): void {
    this.db.run(
      "INSERT INTO app_meta(key, value) VALUES('settings', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [JSON.stringify(next)],
    );
    this.db.run(
      "INSERT INTO app_meta(key, value) VALUES('dirty', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [next.dirty ? "1" : "0"],
    );
    this.db.run(
      "INSERT INTO app_meta(key, value) VALUES('rev', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [String(next.rev)],
    );
  }

  updateSettings(patch: Partial<AppSettings>): AppSettings {
    this.assertWritable();
    const next = { ...this.getSettings(), ...patch };
    this.putSettings(next);
    this.markDirty();
    return next;
  }

  assertWritable(): void {
    if (this.readOnly) {
      throw new Error(
        this.readOnlyReason ??
          "This copy is read-only because another PC holds the device lock.",
      );
    }
  }

  currentUser(): User | null {
    const row = this.db.get<{
      id: string;
      email: string;
      firebase_uid: string | null;
      created_at: string;
    }>(
      `SELECT u.id, u.email, u.firebase_uid, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC LIMIT 1`,
    );
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      firebaseUid: row.firebase_uid,
      createdAt: row.created_at,
    };
  }

  hasAnyUser(): boolean {
    return (this.db.get<{ c: number }>("SELECT COUNT(*) as c FROM users")?.c ?? 0) > 0;
  }

  async register(email: string, password: string): Promise<User> {
    this.assertWritable();
    const normalized = email.trim().toLowerCase();
    if (!validEmail(normalized)) throw new Error("Enter a valid email address.");
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    if (this.hasAnyUser()) {
      throw new Error("This inventory already has an owner account.");
    }
    const { hash, salt } = await hashPassword(password);
    const user: User = {
      id: newId(),
      email: normalized,
      createdAt: nowIso(),
    };
    this.db.run(
      "INSERT INTO users(id, email, password_hash, password_salt, created_at) VALUES(?,?,?,?,?)",
      [user.id, user.email, hash, salt, user.createdAt],
    );
    this.db.run("DELETE FROM sessions");
    this.db.run("INSERT INTO sessions(id, user_id, created_at) VALUES(?,?,?)", [
      newId(),
      user.id,
      nowIso(),
    ]);
    this.markDirty();
    await this.save();
    return user;
  }

  async login(email: string, password: string): Promise<User> {
    const normalized = email.trim().toLowerCase();
    const row = this.db.get<{
      id: string;
      email: string;
      password_hash: string;
      password_salt: string;
      firebase_uid: string | null;
      created_at: string;
    }>("SELECT * FROM users WHERE email = ?", [normalized]);
    if (!row) throw new Error("Email or password is incorrect.");
    const ok = await verifyPassword(password, row.password_hash, row.password_salt);
    if (!ok) throw new Error("Email or password is incorrect.");
    this.db.run("DELETE FROM sessions");
    this.db.run("INSERT INTO sessions(id, user_id, created_at) VALUES(?,?,?)", [
      newId(),
      row.id,
      nowIso(),
    ]);
    await this.save();
    return {
      id: row.id,
      email: row.email,
      firebaseUid: row.firebase_uid,
      createdAt: row.created_at,
    };
  }

  async logout(): Promise<void> {
    this.db.run("DELETE FROM sessions");
    await this.save();
  }

  locationPath(id: string): string {
    const names: string[] = [];
    let current = this.db.get<LocRow>("SELECT * FROM locations WHERE id = ?", [id]);
    const guard = new Set<string>();
    while (current && !guard.has(current.id)) {
      guard.add(current.id);
      names.unshift(current.name);
      current = current.parent_id
        ? this.db.get<LocRow>("SELECT * FROM locations WHERE id = ?", [current.parent_id])
        : undefined;
    }
    return names.join(" → ");
  }

  listLocations(includeArchived = false): Location[] {
    const rows = this.db.all<LocRow>(
      `SELECT * FROM locations ${includeArchived ? "" : "WHERE archived = 0"} ORDER BY area, sort_order, name`,
    );
    return rows.map(mapLocation);
  }

  locationTree(): LocationNode[] {
    const all = this.listLocations();
    const byId = new Map<string, LocationNode>();
    for (const loc of all) {
      byId.set(loc.id, { ...loc, children: [], path: this.locationPath(loc.id) });
    }
    const roots: LocationNode[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    const sort = (nodes: LocationNode[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      nodes.forEach((n) => sort(n.children));
    };
    sort(roots);
    return roots;
  }

  getLocation(id: string): Location | undefined {
    const row = this.db.get<LocRow>("SELECT * FROM locations WHERE id = ?", [id]);
    return row ? mapLocation(row) : undefined;
  }

  createLocation(input: {
    name: string;
    type: LocationType;
    area: LocationArea;
    parentId?: string | null;
    barcode?: string | null;
  }): Location {
    this.assertWritable();
    const loc: Location = {
      id: newId(),
      parentId: input.parentId ?? null,
      name: input.name.trim(),
      type: input.type,
      area: input.area,
      barcode: input.barcode ? normalizeBarcode(input.barcode) : null,
      sortOrder: 0,
      archived: false,
      updatedAt: nowIso(),
    };
    if (!loc.name) throw new Error("Location name is required.");
    this.db.run(
      `INSERT INTO locations(id, parent_id, name, type, area, barcode, sort_order, archived, updated_at)
       VALUES(?,?,?,?,?,?,?,?,?)`,
      [
        loc.id,
        loc.parentId,
        loc.name,
        loc.type,
        loc.area,
        loc.barcode,
        loc.sortOrder,
        0,
        loc.updatedAt,
      ],
    );
    this.markDirty();
    return loc;
  }

  updateLocation(
    id: string,
    patch: Partial<Pick<Location, "name" | "type" | "area" | "parentId" | "barcode" | "archived">>,
  ): Location {
    this.assertWritable();
    const current = this.getLocation(id);
    if (!current) throw new Error("Location not found.");
    const next = {
      ...current,
      ...patch,
      name: patch.name?.trim() ?? current.name,
      barcode:
        patch.barcode === undefined
          ? current.barcode
          : patch.barcode
            ? normalizeBarcode(patch.barcode)
            : null,
      updatedAt: nowIso(),
    };
    this.db.run(
      `UPDATE locations SET parent_id=?, name=?, type=?, area=?, barcode=?, archived=?, updated_at=? WHERE id=?`,
      [
        next.parentId,
        next.name,
        next.type,
        next.area,
        next.barcode,
        next.archived ? 1 : 0,
        next.updatedAt,
        id,
      ],
    );
    this.markDirty();
    return next;
  }

  listItems(opts?: { type?: ItemType; query?: string; includeArchived?: boolean }): Item[] {
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    if (!opts?.includeArchived) clauses.push("archived = 0");
    if (opts?.type) {
      clauses.push("type = ?");
      params.push(opts.type);
    }
    if (opts?.query) {
      clauses.push("(sku LIKE ? OR name LIKE ? OR IFNULL(barcode,'') LIKE ?)");
      const q = `%${opts.query}%`;
      params.push(q, q, q);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return this.db
      .all<ItemRow>(`SELECT * FROM items ${where} ORDER BY name`, params)
      .map(mapItem);
  }

  getItem(id: string): Item | undefined {
    const row = this.db.get<ItemRow>("SELECT * FROM items WHERE id = ?", [id]);
    return row ? mapItem(row) : undefined;
  }

  getItemBySku(sku: string): Item | undefined {
    const row = this.db.get<ItemRow>("SELECT * FROM items WHERE sku = ?", [slugSku(sku)]);
    return row ? mapItem(row) : undefined;
  }

  stockForItem(itemId: string): StockRow[] {
    return this.db.all<StockRow & { location_id: string; item_id: string; updated_at: string }>(
      `SELECT s.item_id as itemId, s.location_id as locationId, s.qty, s.updated_at as updatedAt
       FROM stock s WHERE s.item_id = ? ORDER BY s.qty DESC`,
      [itemId],
    ).map((row) => ({
      ...row,
      locationName: this.getLocation(row.locationId)?.name,
      locationPath: this.locationPath(row.locationId),
      locationBarcode: this.getLocation(row.locationId)?.barcode ?? null,
    }));
  }

  totalQty(itemId: string): number {
    return (
      this.db.get<{ t: number }>(
        "SELECT COALESCE(SUM(qty),0) as t FROM stock WHERE item_id = ?",
        [itemId],
      )?.t ?? 0
    );
  }

  itemWithStock(id: string): ItemWithStock | undefined {
    const item = this.getItem(id);
    if (!item) return undefined;
    const lots = this.stockForItem(id);
    const totalQty = lots.reduce((s, l) => s + l.qty, 0);
    const marginUsd =
      item.sellPriceUsd > 0 ? roundMoney(item.sellPriceUsd - item.costUsd) : null;
    return { ...item, lots, totalQty, marginUsd };
  }

  createItem(input: {
    sku: string;
    name: string;
    type: ItemType;
    barcode?: string | null;
    costUsd?: number;
    sellPriceUsd?: number;
    notes?: string | null;
  }): Item {
    this.assertWritable();
    const item: Item = {
      id: newId(),
      sku: slugSku(input.sku),
      name: input.name.trim(),
      type: input.type,
      barcode: input.barcode ? normalizeBarcode(input.barcode) : null,
      costUsd: roundMoney(input.costUsd ?? 0),
      sellPriceUsd: roundMoney(input.sellPriceUsd ?? 0),
      notes: input.notes?.trim() || null,
      archived: false,
      updatedAt: nowIso(),
    };
    if (!item.sku) throw new Error("SKU is required.");
    if (!item.name) throw new Error("Item name is required.");
    this.db.run(
      `INSERT INTO items(id, sku, name, type, barcode, cost_usd, sell_price_usd, notes, archived, updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
      [
        item.id,
        item.sku,
        item.name,
        item.type,
        item.barcode,
        item.costUsd,
        item.sellPriceUsd,
        item.notes,
        0,
        item.updatedAt,
      ],
    );
    this.markDirty();
    return item;
  }

  updateItem(
    id: string,
    patch: Partial<
      Pick<Item, "sku" | "name" | "type" | "barcode" | "costUsd" | "sellPriceUsd" | "notes" | "archived">
    >,
  ): Item {
    this.assertWritable();
    const current = this.getItem(id);
    if (!current) throw new Error("Item not found.");
    const next: Item = {
      ...current,
      ...patch,
      sku: patch.sku ? slugSku(patch.sku) : current.sku,
      name: patch.name?.trim() ?? current.name,
      barcode:
        patch.barcode === undefined
          ? current.barcode
          : patch.barcode
            ? normalizeBarcode(patch.barcode)
            : null,
      costUsd: patch.costUsd !== undefined ? roundMoney(patch.costUsd) : current.costUsd,
      sellPriceUsd:
        patch.sellPriceUsd !== undefined ? roundMoney(patch.sellPriceUsd) : current.sellPriceUsd,
      updatedAt: nowIso(),
    };
    this.db.run(
      `UPDATE items SET sku=?, name=?, type=?, barcode=?, cost_usd=?, sell_price_usd=?, notes=?, archived=?, updated_at=? WHERE id=?`,
      [
        next.sku,
        next.name,
        next.type,
        next.barcode,
        next.costUsd,
        next.sellPriceUsd,
        next.notes,
        next.archived ? 1 : 0,
        next.updatedAt,
        id,
      ],
    );
    this.markDirty();
    return next;
  }

  private bumpStock(
    itemId: string,
    locationId: string,
    delta: number,
  ): { qty: number; warning?: StockWarning } {
    const ts = nowIso();
    const row = this.db.get<{ qty: number }>(
      "SELECT qty FROM stock WHERE item_id = ? AND location_id = ?",
      [itemId, locationId],
    );
    const qty = (row?.qty ?? 0) + delta;
    if (row) {
      this.db.run(
        "UPDATE stock SET qty = ?, updated_at = ? WHERE item_id = ? AND location_id = ?",
        [qty, ts, itemId, locationId],
      );
    } else {
      this.db.run(
        "INSERT INTO stock(item_id, location_id, qty, updated_at) VALUES(?,?,?,?)",
        [itemId, locationId, qty, ts],
      );
    }
    const warning: StockWarning | undefined =
      qty < 0
        ? {
            code: "negative_stock",
            message: `${this.getItem(itemId)?.sku ?? "Item"} is negative at ${this.locationPath(locationId)} (${qty}).`,
          }
        : undefined;
    return { qty, warning };
  }

  private recordMovement(input: {
    type: MovementType;
    itemId?: string | null;
    spoolId?: string | null;
    fromLocationId?: string | null;
    toLocationId?: string | null;
    qty: number;
    note?: string | null;
    kitSaleId?: string | null;
  }): Movement {
    const mov: Movement = {
      id: newId(),
      type: input.type,
      itemId: input.itemId ?? null,
      spoolId: input.spoolId ?? null,
      fromLocationId: input.fromLocationId ?? null,
      toLocationId: input.toLocationId ?? null,
      qty: input.qty,
      note: input.note ?? null,
      kitSaleId: input.kitSaleId ?? null,
      createdAt: nowIso(),
    };
    this.db.run(
      `INSERT INTO movements(id, type, item_id, spool_id, from_location_id, to_location_id, qty, note, kit_sale_id, created_at)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
      [
        mov.id,
        mov.type,
        mov.itemId,
        mov.spoolId,
        mov.fromLocationId,
        mov.toLocationId,
        mov.qty,
        mov.note,
        mov.kitSaleId,
        mov.createdAt,
      ],
    );
    return mov;
  }

  receive(input: {
    itemId: string;
    locationId: string;
    qty: number;
    note?: string;
  }): MutationResult<Movement> {
    this.assertWritable();
    if (input.qty <= 0) throw new Error("Receive quantity must be greater than zero.");
    return this.db.transaction(() => {
      this.bumpStock(input.itemId, input.locationId, input.qty);
      const movement = this.recordMovement({
        type: "receive",
        itemId: input.itemId,
        toLocationId: input.locationId,
        qty: input.qty,
        note: input.note,
      });
      this.markDirty();
      return { data: movement, warnings: [] };
    });
  }

  adjust(input: {
    itemId: string;
    locationId: string;
    qty: number;
    note?: string;
  }): MutationResult<Movement> {
    this.assertWritable();
    return this.db.transaction(() => {
      const current =
        this.db.get<{ qty: number }>(
          "SELECT qty FROM stock WHERE item_id = ? AND location_id = ?",
          [input.itemId, input.locationId],
        )?.qty ?? 0;
      const delta = input.qty - current;
      const { warning } = this.bumpStock(input.itemId, input.locationId, delta);
      const movement = this.recordMovement({
        type: "adjust",
        itemId: input.itemId,
        toLocationId: input.locationId,
        qty: input.qty,
        note: input.note ?? `Set to ${input.qty} (was ${current})`,
      });
      this.markDirty();
      return { data: movement, warnings: warning ? [warning] : [] };
    });
  }

  move(input: {
    itemId: string;
    fromLocationId: string;
    toLocationId: string;
    qty: number;
    note?: string;
  }): MutationResult<Movement> {
    this.assertWritable();
    if (input.qty <= 0) throw new Error("Move quantity must be greater than zero.");
    if (input.fromLocationId === input.toLocationId) {
      throw new Error("Pick two different locations to move stock.");
    }
    return this.db.transaction(() => {
      const warnings: StockWarning[] = [];
      const from = this.bumpStock(input.itemId, input.fromLocationId, -input.qty);
      if (from.warning) warnings.push(from.warning);
      this.bumpStock(input.itemId, input.toLocationId, input.qty);
      const movement = this.recordMovement({
        type: "move",
        itemId: input.itemId,
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        qty: input.qty,
        note: input.note,
      });
      this.markDirty();
      return { data: movement, warnings };
    });
  }

  useOrScrap(
    type: "use" | "scrap",
    input: { itemId: string; locationId: string; qty: number; note?: string },
  ): MutationResult<Movement> {
    this.assertWritable();
    if (input.qty <= 0) throw new Error("Quantity must be greater than zero.");
    return this.db.transaction(() => {
      const { warning } = this.bumpStock(input.itemId, input.locationId, -input.qty);
      const movement = this.recordMovement({
        type,
        itemId: input.itemId,
        fromLocationId: input.locationId,
        qty: input.qty,
        note: input.note,
      });
      this.markDirty();
      return { data: movement, warnings: warning ? [warning] : [] };
    });
  }

  listMovements(limit = 200): Array<Movement & { itemName?: string; itemSku?: string }> {
    const rows = this.db.all<
      Movement & {
        item_id: string | null;
        spool_id: string | null;
        from_location_id: string | null;
        to_location_id: string | null;
        kit_sale_id: string | null;
        created_at: string;
      }
    >(
      `SELECT id, type, item_id as itemId, spool_id as spoolId, from_location_id as fromLocationId,
              to_location_id as toLocationId, qty, note, kit_sale_id as kitSaleId, created_at as createdAt
       FROM movements ORDER BY created_at DESC LIMIT ?`,
      [limit],
    );
    return rows.map((row) => {
      const item = row.itemId ? this.getItem(row.itemId) : undefined;
      return { ...row, itemName: item?.name, itemSku: item?.sku };
    });
  }

  binContents(locationId: string): BinContents {
    const location = this.getLocation(locationId);
    if (!location) throw new Error("Location not found.");
    const itemRows = this.db.all<{
      item_id: string;
      qty: number;
    }>("SELECT item_id, qty FROM stock WHERE location_id = ? ORDER BY qty DESC", [locationId]);
    const items = itemRows
      .map((row) => {
        const item = this.getItem(row.item_id);
        if (!item) return null;
        return { item, qty: row.qty, barcode: item.barcode };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    const spools = this.db
      .all<SpoolRow>("SELECT * FROM spools WHERE location_id = ? AND archived = 0 ORDER BY color_name", [
        locationId,
      ])
      .map(mapSpool);
    return { location, path: this.locationPath(locationId), items, spools };
  }

  listKits(includeArchived = false): Kit[] {
    const rows = this.db.all<KitRow>(
      `SELECT * FROM kits ${includeArchived ? "" : "WHERE archived = 0"} ORDER BY name`,
    );
    return rows.map(mapKit);
  }

  getKit(id: string): Kit | undefined {
    const row = this.db.get<KitRow>("SELECT * FROM kits WHERE id = ?", [id]);
    return row ? mapKit(row) : undefined;
  }

  kitBom(kitId: string): BomLine[] {
    return this.db
      .all<BomRow>("SELECT * FROM kit_bom WHERE kit_id = ? ORDER BY sort_order, id", [kitId])
      .map(mapBom);
  }

  allBomMap(): Map<string, BomLine[]> {
    const map = new Map<string, BomLine[]>();
    for (const line of this.db.all<BomRow>("SELECT * FROM kit_bom").map(mapBom)) {
      const list = map.get(line.kitId) ?? [];
      list.push(line);
      map.set(line.kitId, list);
    }
    return map;
  }

  stockMap(): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of this.db.all<{ item_id: string; t: number }>(
      "SELECT item_id, COALESCE(SUM(qty),0) as t FROM stock GROUP BY item_id",
    )) {
      map.set(row.item_id, row.t);
    }
    return map;
  }

  filamentGramsByMaterial(): { byMaterial: Map<string, number>; total: number } {
    const byMaterial = new Map<string, number>();
    let total = 0;
    for (const spool of this.listSpools()) {
      if (spool.isEmpty) continue;
      const grams = Math.max(0, spool.remainingGrams);
      total += grams;
      const key = spool.material.toUpperCase();
      byMaterial.set(key, (byMaterial.get(key) ?? 0) + grams);
    }
    return { byMaterial, total };
  }

  avgFilamentCostPerGram(): number {
    const spools = this.listSpools().filter((s) => !s.isEmpty && s.remainingGrams > 0);
    if (!spools.length) return 0;
    const totalGrams = spools.reduce((s, p) => s + p.remainingGrams, 0);
    const totalCost = spools.reduce(
      (s, p) => s + (p.costPerKgUsd / 1000) * p.remainingGrams,
      0,
    );
    return totalGrams ? totalCost / totalGrams : 0;
  }

  kitView(id: string): KitView | undefined {
    const kit = this.getKit(id);
    if (!kit) return undefined;
    const bom = this.kitBom(id);
    const leaves = flattenBom(id, this.allBomMap());
    const itemsById = new Map(this.listItems({ includeArchived: true }).map((i) => [i.id, i]));
    for (const leaf of leaves) {
      if (!leaf.itemId) continue;
      const item = itemsById.get(leaf.itemId);
      leaf.itemSku = item?.sku;
      leaf.itemName = item?.name;
    }
    const { byMaterial, total } = this.filamentGramsByMaterial();
    const canMake = canMakeFromStock(leaves, this.stockMap(), byMaterial, total);
    const cost = roundMoney(estimatedCost(leaves, itemsById, this.avgFilamentCostPerGram()));
    return {
      ...kit,
      bom,
      leaves,
      canMake,
      estimatedCostUsd: cost,
      marginUsd: roundMoney(kit.sellPriceUsd - cost),
    };
  }

  listKitViews(): KitView[] {
    return this.listKits()
      .map((k) => this.kitView(k.id))
      .filter((k): k is KitView => !!k);
  }

  createKit(input: {
    sku: string;
    name: string;
    barcode?: string | null;
    sellPriceUsd?: number;
    notes?: string | null;
  }): Kit {
    this.assertWritable();
    const kit: Kit = {
      id: newId(),
      sku: slugSku(input.sku),
      name: input.name.trim(),
      barcode: input.barcode ? normalizeBarcode(input.barcode) : null,
      sellPriceUsd: roundMoney(input.sellPriceUsd ?? 0),
      notes: input.notes?.trim() || null,
      archived: false,
      updatedAt: nowIso(),
    };
    if (!kit.sku || !kit.name) throw new Error("Kit SKU and name are required.");
    this.db.run(
      `INSERT INTO kits(id, sku, name, barcode, sell_price_usd, notes, archived, updated_at)
       VALUES(?,?,?,?,?,?,?,?)`,
      [kit.id, kit.sku, kit.name, kit.barcode, kit.sellPriceUsd, kit.notes, 0, kit.updatedAt],
    );
    this.markDirty();
    return kit;
  }

  updateKit(
    id: string,
    patch: Partial<Pick<Kit, "sku" | "name" | "barcode" | "sellPriceUsd" | "notes" | "archived">>,
  ): Kit {
    this.assertWritable();
    const current = this.getKit(id);
    if (!current) throw new Error("Kit not found.");
    const next: Kit = {
      ...current,
      ...patch,
      sku: patch.sku ? slugSku(patch.sku) : current.sku,
      name: patch.name?.trim() ?? current.name,
      barcode:
        patch.barcode === undefined
          ? current.barcode
          : patch.barcode
            ? normalizeBarcode(patch.barcode)
            : null,
      sellPriceUsd:
        patch.sellPriceUsd !== undefined ? roundMoney(patch.sellPriceUsd) : current.sellPriceUsd,
      updatedAt: nowIso(),
    };
    this.db.run(
      `UPDATE kits SET sku=?, name=?, barcode=?, sell_price_usd=?, notes=?, archived=?, updated_at=? WHERE id=?`,
      [
        next.sku,
        next.name,
        next.barcode,
        next.sellPriceUsd,
        next.notes,
        next.archived ? 1 : 0,
        next.updatedAt,
        id,
      ],
    );
    this.markDirty();
    return next;
  }

  setBom(kitId: string, lines: Omit<BomLine, "id" | "kitId">[]): BomLine[] {
    this.assertWritable();
    if (!this.getKit(kitId)) throw new Error("Kit not found.");
    const preview = new Map(this.allBomMap());
    preview.set(
      kitId,
      lines.map((l, i) => ({ ...l, id: `tmp-${i}`, kitId })),
    );
    flattenBom(kitId, preview);
    this.db.transaction(() => {
      this.db.run("DELETE FROM kit_bom WHERE kit_id = ?", [kitId]);
      lines.forEach((line, index) => {
        if (!line.componentItemId && !line.nestedKitId && !(line.filamentGrams ?? 0)) {
          throw new Error("Each BOM line needs a part, nested kit, or filament grams.");
        }
        this.db.run(
          `INSERT INTO kit_bom(id, kit_id, component_item_id, nested_kit_id, qty, filament_grams, filament_material, notes, sort_order)
           VALUES(?,?,?,?,?,?,?,?,?)`,
          [
            newId(),
            kitId,
            line.componentItemId,
            line.nestedKitId,
            line.qty,
            line.filamentGrams,
            line.filamentMaterial,
            line.notes,
            index,
          ],
        );
      });
      this.markDirty();
    });
    return this.kitBom(kitId);
  }

  addBomLine(
    kitId: string,
    line: Omit<BomLine, "id" | "kitId" | "sortOrder">,
  ): BomLine {
    const existing = this.kitBom(kitId);
    const next = [
      ...existing.map((row) => ({
        componentItemId: row.componentItemId,
        nestedKitId: row.nestedKitId,
        qty: row.qty,
        filamentGrams: row.filamentGrams,
        filamentMaterial: row.filamentMaterial,
        notes: row.notes,
        sortOrder: row.sortOrder,
      })),
      { ...line, sortOrder: existing.length },
    ];
    const saved = this.setBom(kitId, next);
    return saved[saved.length - 1]!;
  }

  removeBomLine(id: string): void {
    this.assertWritable();
    this.db.run("DELETE FROM kit_bom WHERE id = ?", [id]);
    this.markDirty();
  }

  autoAllocate(itemId: string, qty: number): StockAllocation[] {
    const lots = this.db.all<StockRow>(
      `SELECT item_id as itemId, location_id as locationId, qty, updated_at as updatedAt FROM stock WHERE item_id = ?`,
      [itemId],
    );
    const { allocations, short } = allocateFromLots(itemId, qty, lots);
    if (short > 0 && lots.length === 0) {
      throw new Error(
        `${this.getItem(itemId)?.sku ?? "Item"} has no bin yet. Receive it into a location first, or pick a bin on the sell screen.`,
      );
    }
    if (short > 0) {
      const fallbackLoc = this.listLocations()[0];
      if (!fallbackLoc) throw new Error("Create a location before selling.");
      allocations.push({ itemId, locationId: fallbackLoc.id, qty: short });
    }
    return allocations;
  }

  sellKit(input: {
    kitId: string;
    qty: number;
    note?: string;
    allocations?: StockAllocation[];
    filament?: FilamentPick[];
  }): MutationResult<KitSale> {
    this.assertWritable();
    if (input.qty <= 0) throw new Error("Sell quantity must be at least 1.");
    const view = this.kitView(input.kitId);
    if (!view) throw new Error("Kit not found.");

    const saleId = newId();
    return this.db.transaction(() => {
      const warnings: StockWarning[] = [];
      const allocations: StockAllocation[] = input.allocations ? [...input.allocations] : [];
      if (!input.allocations) {
        for (const leaf of view.leaves) {
          if (leaf.itemId && leaf.qty > 0) {
            allocations.push(...this.autoAllocate(leaf.itemId, leaf.qty * input.qty));
          }
        }
      }

      const neededGrams = view.leaves.reduce((s, l) => s + l.filamentGrams * input.qty, 0);
      const picks = input.filament ?? [];
      const pickedGrams = picks.reduce((s, p) => s + p.grams, 0);
      if (neededGrams > 0 && Math.abs(pickedGrams - neededGrams) > 0.05) {
        warnings.push({
          code: "insufficient_filament_pick",
          message: `This sale needs ${roundGrams(neededGrams)}g of filament. You picked ${roundGrams(pickedGrams)}g.`,
        });
      }

      let partCost = 0;
      for (const alloc of allocations) {
        const { warning } = this.bumpStock(alloc.itemId, alloc.locationId, -alloc.qty);
        if (warning) warnings.push(warning);
        partCost += (this.getItem(alloc.itemId)?.costUsd ?? 0) * alloc.qty;
        this.recordMovement({
          type: "sale",
          itemId: alloc.itemId,
          fromLocationId: alloc.locationId,
          qty: alloc.qty,
          note: input.note,
          kitSaleId: saleId,
        });
      }

      let filamentCost = 0;
      for (const pick of picks) {
        const usage = this.applySpoolUsage(
          pick.spoolId,
          pick.grams,
          `Kit sale: ${view.name}`,
          saleId,
        );
        filamentCost += (usage.spool.costPerKgUsd / 1000) * pick.grams;
        if (usage.warning) warnings.push(usage.warning);
      }

      const cost = roundMoney(partCost + filamentCost);
      const sellPrice = roundMoney(view.sellPriceUsd * input.qty);
      const sale: KitSale = {
        id: saleId,
        kitId: view.id,
        qty: input.qty,
        note: input.note ?? null,
        sellPriceUsd: sellPrice,
        costUsd: cost,
        marginUsd: roundMoney(sellPrice - cost),
        createdAt: nowIso(),
      };
      this.db.run(
        `INSERT INTO kit_sales(id, kit_id, qty, note, sell_price_usd, cost_usd, margin_usd, created_at)
         VALUES(?,?,?,?,?,?,?,?)`,
        [
          sale.id,
          sale.kitId,
          sale.qty,
          sale.note,
          sale.sellPriceUsd,
          sale.costUsd,
          sale.marginUsd,
          sale.createdAt,
        ],
      );
      this.markDirty();
      return { data: sale, warnings };
    });
  }

  listSpools(includeEmpty = true): Spool[] {
    const rows = this.db.all<SpoolRow>(
      `SELECT * FROM spools WHERE archived = 0 ${includeEmpty ? "" : "AND is_empty = 0"} ORDER BY material, color_name`,
    );
    return rows.map(mapSpool);
  }

  getSpool(id: string): Spool | undefined {
    const row = this.db.get<SpoolRow>("SELECT * FROM spools WHERE id = ?", [id]);
    return row ? mapSpool(row) : undefined;
  }

  createSpool(input: {
    material: string;
    colorName: string;
    startingGrams: number;
    remainingGrams?: number;
    brand?: string | null;
    colorHex?: string | null;
    barcode?: string | null;
    itemId?: string | null;
    locationId?: string | null;
    costPerKgUsd?: number;
    notes?: string | null;
  }): Spool {
    this.assertWritable();
    const remaining = input.remainingGrams ?? input.startingGrams;
    const spool: Spool = {
      id: newId(),
      itemId: input.itemId ?? null,
      locationId: input.locationId ?? null,
      barcode: input.barcode ? normalizeBarcode(input.barcode) : null,
      brand: input.brand?.trim() || null,
      material: input.material.trim().toUpperCase(),
      colorName: input.colorName.trim(),
      colorHex: input.colorHex ?? null,
      startingGrams: roundGrams(input.startingGrams),
      remainingGrams: roundGrams(remaining),
      costPerKgUsd: roundMoney(input.costPerKgUsd ?? 0),
      notes: input.notes?.trim() || null,
      openedAt: nowIso().slice(0, 10),
      isEmpty: remaining <= 0,
      archived: false,
      updatedAt: nowIso(),
    };
    if (!spool.material || !spool.colorName) {
      throw new Error("Filament material and color are required.");
    }
    this.db.run(
      `INSERT INTO spools(id, item_id, location_id, barcode, brand, material, color_name, color_hex, starting_grams, remaining_grams, cost_per_kg_usd, notes, opened_at, is_empty, archived, updated_at)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        spool.id,
        spool.itemId,
        spool.locationId,
        spool.barcode,
        spool.brand,
        spool.material,
        spool.colorName,
        spool.colorHex,
        spool.startingGrams,
        spool.remainingGrams,
        spool.costPerKgUsd,
        spool.notes,
        spool.openedAt,
        spool.isEmpty ? 1 : 0,
        0,
        spool.updatedAt,
      ],
    );
    this.markDirty();
    return spool;
  }

  updateSpool(
    id: string,
    patch: Partial<
      Pick<
        Spool,
        | "itemId"
        | "locationId"
        | "barcode"
        | "brand"
        | "material"
        | "colorName"
        | "colorHex"
        | "startingGrams"
        | "remainingGrams"
        | "costPerKgUsd"
        | "notes"
        | "isEmpty"
        | "archived"
      >
    >,
  ): Spool {
    this.assertWritable();
    const current = this.getSpool(id);
    if (!current) throw new Error("Spool not found.");
    const remaining =
      patch.remainingGrams !== undefined ? roundGrams(patch.remainingGrams) : current.remainingGrams;
    const next: Spool = {
      ...current,
      ...patch,
      material: patch.material ? patch.material.trim().toUpperCase() : current.material,
      colorName: patch.colorName?.trim() ?? current.colorName,
      barcode:
        patch.barcode === undefined
          ? current.barcode
          : patch.barcode
            ? normalizeBarcode(patch.barcode)
            : null,
      remainingGrams: remaining,
      isEmpty: patch.isEmpty ?? remaining <= 0,
      updatedAt: nowIso(),
    };
    this.db.run(
      `UPDATE spools SET item_id=?, location_id=?, barcode=?, brand=?, material=?, color_name=?, color_hex=?, starting_grams=?, remaining_grams=?, cost_per_kg_usd=?, notes=?, is_empty=?, archived=?, updated_at=? WHERE id=?`,
      [
        next.itemId,
        next.locationId,
        next.barcode,
        next.brand,
        next.material,
        next.colorName,
        next.colorHex,
        next.startingGrams,
        next.remainingGrams,
        next.costPerKgUsd,
        next.notes,
        next.isEmpty ? 1 : 0,
        next.archived ? 1 : 0,
        next.updatedAt,
        id,
      ],
    );
    this.markDirty();
    return next;
  }

  private applySpoolUsage(
    spoolId: string,
    grams: number,
    jobName: string | null,
    kitSaleId: string | null,
  ): { usage: SpoolUsage; spool: Spool; warning?: StockWarning } {
    const spool = this.getSpool(spoolId);
    if (!spool) throw new Error("Spool not found.");
    const before = spool.remainingGrams;
    const after = roundGrams(before - grams);
    const warning: StockWarning | undefined =
      after < 0
        ? {
            code: "negative_filament",
            message: `${spool.material} ${spool.colorName} would go to ${after}g.`,
          }
        : undefined;
    const usage: SpoolUsage = {
      id: newId(),
      spoolId,
      jobName,
      grams: roundGrams(grams),
      weightBefore: before,
      weightAfter: after,
      kitSaleId,
      createdAt: nowIso(),
    };
    this.db.run(
      `INSERT INTO spool_usage(id, spool_id, job_name, grams, weight_before, weight_after, kit_sale_id, created_at)
       VALUES(?,?,?,?,?,?,?,?)`,
      [
        usage.id,
        usage.spoolId,
        usage.jobName,
        usage.grams,
        usage.weightBefore,
        usage.weightAfter,
        usage.kitSaleId,
        usage.createdAt,
      ],
    );
    const updated = this.updateSpool(spoolId, {
      remainingGrams: after,
      isEmpty: after <= 0,
    });
    this.recordMovement({
      type: "use",
      spoolId,
      qty: grams,
      note: jobName,
      kitSaleId,
    });
    return { usage, spool: updated, warning };
  }

  logSpoolUsage(input: {
    spoolId: string;
    grams: number;
    jobName?: string;
  }): MutationResult<SpoolUsage> {
    this.assertWritable();
    if (input.grams <= 0) throw new Error("Grams used must be greater than zero.");
    return this.db.transaction(() => {
      const { usage, warning } = this.applySpoolUsage(
        input.spoolId,
        input.grams,
        input.jobName ?? null,
        null,
      );
      this.markDirty();
      return { data: usage, warnings: warning ? [warning] : [] };
    });
  }

  setSpoolRemaining(spoolId: string, grams: number, note?: string): MutationResult<Spool> {
    this.assertWritable();
    const spool = this.getSpool(spoolId);
    if (!spool) throw new Error("Spool not found.");
    const delta = roundGrams(spool.remainingGrams - grams);
    return this.db.transaction(() => {
      const warnings: StockWarning[] = [];
      if (delta > 0) {
        const result = this.applySpoolUsage(spoolId, delta, note ?? "Weight update", null);
        if (result.warning) warnings.push(result.warning);
        return { data: result.spool, warnings };
      }
      const updated = this.updateSpool(spoolId, {
        remainingGrams: grams,
        isEmpty: grams <= 0,
      });
      if (grams < 0) {
        warnings.push({
          code: "negative_filament",
          message: `${updated.material} ${updated.colorName} is at ${grams}g.`,
        });
      }
      this.markDirty();
      return { data: updated, warnings };
    });
  }

  spoolUsage(spoolId: string): SpoolUsage[] {
    return this.db.all<SpoolUsage>(
      `SELECT id, spool_id as spoolId, job_name as jobName, grams, weight_before as weightBefore,
              weight_after as weightAfter, kit_sale_id as kitSaleId, created_at as createdAt
       FROM spool_usage WHERE spool_id = ? ORDER BY created_at DESC`,
      [spoolId],
    );
  }

  lowStockFilament(): LowStockGroup[] {
    const settings = this.getSettings();
    const groups = new Map<
      string,
      { material: string; colorName: string; colorHex: string | null; total: number; count: number; id: string }
    >();
    for (const spool of this.listSpools(false)) {
      const key = `${spool.material}|${spool.colorName}`;
      const g = groups.get(key) ?? {
        material: spool.material,
        colorName: spool.colorName,
        colorHex: spool.colorHex,
        total: 0,
        count: 0,
        id: spool.id,
      };
      g.total += Math.max(0, spool.remainingGrams);
      g.count += 1;
      groups.set(key, g);
    }
    const out: LowStockGroup[] = [];
    for (const g of groups.values()) {
      let level: "critical" | "low" | null = null;
      if (g.total < settings.filamentCriticalGrams) level = "critical";
      else if (g.total < settings.filamentLowGrams) level = "low";
      if (!level) continue;
      out.push({
        material: g.material,
        colorName: g.colorName,
        colorHex: g.colorHex,
        totalGrams: g.total,
        spoolCount: g.count,
        level,
        sampleSpoolId: g.id,
      });
    }
    return out.sort((a, b) => a.totalGrams - b.totalGrams);
  }

  lookup(code: string): LookupHit {
    const trimmed = normalizeBarcode(code);
    if (!trimmed) return { kind: "none", code: trimmed };
    const loc = this.db.get<LocRow>(
      "SELECT * FROM locations WHERE barcode = ? AND archived = 0",
      [trimmed],
    );
    if (loc) {
      const location = mapLocation(loc);
      return {
        kind: "bin",
        location,
        path: this.locationPath(location.id),
        contents: this.binContents(location.id),
      };
    }
    const spool = this.db.get<SpoolRow>(
      "SELECT * FROM spools WHERE barcode = ? AND archived = 0",
      [trimmed],
    );
    if (spool) return { kind: "spool", spool: mapSpool(spool) };
    const item = this.db.get<ItemRow>(
      "SELECT * FROM items WHERE (barcode = ? OR sku = ?) AND archived = 0",
      [trimmed, slugSku(trimmed)],
    );
    if (item) {
      const withStock = this.itemWithStock(item.id);
      if (withStock) return { kind: "item", item: withStock };
    }
    const kit = this.db.get<KitRow>(
      "SELECT * FROM kits WHERE (barcode = ? OR sku = ?) AND archived = 0",
      [trimmed, slugSku(trimmed)],
    );
    if (kit) {
      const view = this.kitView(kit.id);
      if (view) return { kind: "kit", kit: view };
    }
    return { kind: "none", code: trimmed };
  }

  search(query: string): LookupHit[] {
    const q = query.trim();
    if (!q) return [];
    const exact = this.lookup(q);
    if (exact.kind !== "none") return [exact];
    const like = `%${q}%`;
    const hits: LookupHit[] = [];
    for (const row of this.db.all<LocRow>(
      "SELECT * FROM locations WHERE archived = 0 AND (name LIKE ? OR IFNULL(barcode,'') LIKE ?) LIMIT 8",
      [like, like],
    )) {
      const location = mapLocation(row);
      hits.push({
        kind: "bin",
        location,
        path: this.locationPath(location.id),
        contents: this.binContents(location.id),
      });
    }
    for (const item of this.listItems({ query: q }).slice(0, 8)) {
      const withStock = this.itemWithStock(item.id);
      if (withStock) hits.push({ kind: "item", item: withStock });
    }
    for (const kit of this.listKits().filter(
      (k) =>
        k.name.toLowerCase().includes(q.toLowerCase()) ||
        k.sku.includes(slugSku(q)) ||
        (k.barcode ?? "").includes(q),
    ).slice(0, 8)) {
      const view = this.kitView(kit.id);
      if (view) hits.push({ kind: "kit", kit: view });
    }
    for (const spool of this.listSpools().filter(
      (s) =>
        s.colorName.toLowerCase().includes(q.toLowerCase()) ||
        s.material.toLowerCase().includes(q.toLowerCase()) ||
        (s.barcode ?? "").includes(q) ||
        (s.brand ?? "").toLowerCase().includes(q.toLowerCase()),
    ).slice(0, 8)) {
      hits.push({ kind: "spool", spool });
    }
    return hits;
  }

  dashboard() {
    const items = this.listItems();
    const kits = this.listKitViews();
    const spools = this.listSpools(false);
    const locations = this.listLocations();
    const negative = items
      .map((i) => this.itemWithStock(i.id)!)
      .filter((i) => i.totalQty < 0);
    return {
      itemCount: items.length,
      kitCount: kits.length,
      spoolCount: spools.length,
      locationCount: locations.length,
      negativeCount: negative.length,
      lowFilament: this.lowStockFilament(),
      kits,
      recentMovements: this.listMovements(12),
      recentSales: this.db.all<KitSale & { kitName?: string }>(
        `SELECT ks.id, ks.kit_id as kitId, ks.qty, ks.note, ks.sell_price_usd as sellPriceUsd,
                ks.cost_usd as costUsd, ks.margin_usd as marginUsd, ks.created_at as createdAt, k.name as kitName
         FROM kit_sales ks JOIN kits k ON k.id = ks.kit_id
         ORDER BY ks.created_at DESC LIMIT 8`,
      ),
    };
  }

  labelCandidates(): Array<{
    id: string;
    kind: "item" | "kit" | "location" | "spool";
    barcode: string;
    title: string;
    subtitle: string;
  }> {
    const out: Array<{
      id: string;
      kind: "item" | "kit" | "location" | "spool";
      barcode: string;
      title: string;
      subtitle: string;
    }> = [];
    for (const item of this.listItems()) {
      if (!item.barcode) continue;
      out.push({
        id: item.id,
        kind: "item",
        barcode: item.barcode,
        title: item.name,
        subtitle: item.sku,
      });
    }
    for (const kit of this.listKits()) {
      if (!kit.barcode) continue;
      out.push({
        id: kit.id,
        kind: "kit",
        barcode: kit.barcode,
        title: kit.name,
        subtitle: kit.sku,
      });
    }
    for (const loc of this.listLocations()) {
      if (!loc.barcode) continue;
      out.push({
        id: loc.id,
        kind: "location",
        barcode: loc.barcode,
        title: loc.name,
        subtitle: this.locationPath(loc.id),
      });
    }
    for (const spool of this.listSpools()) {
      if (!spool.barcode) continue;
      out.push({
        id: spool.id,
        kind: "spool",
        barcode: spool.barcode,
        title: `${spool.material} ${spool.colorName}`,
        subtitle: spool.brand ?? "Spool",
      });
    }
    return out;
  }

  configureFirebase(config: FirebaseClientConfig | null, enabled: boolean): void {
    this.assertWritable();
    const settings = this.getSettings();
    settings.firebaseConfig = config;
    settings.cloudEnabled = enabled && !!config;
    this.putSettings(settings);
    this.markDirty();
  }
}

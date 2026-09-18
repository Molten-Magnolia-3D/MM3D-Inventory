export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = MEMORY;

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  firebase_uid TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES locations(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'hardware',
  barcode TEXT UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  barcode TEXT UNIQUE,
  cost_usd REAL NOT NULL DEFAULT 0,
  sell_price_usd REAL NOT NULL DEFAULT 0,
  notes TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock (
  item_id TEXT NOT NULL REFERENCES items(id),
  location_id TEXT NOT NULL REFERENCES locations(id),
  qty REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (item_id, location_id)
);

CREATE TABLE IF NOT EXISTS kits (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  sell_price_usd REAL NOT NULL DEFAULT 0,
  notes TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kit_bom (
  id TEXT PRIMARY KEY,
  kit_id TEXT NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  component_item_id TEXT REFERENCES items(id),
  nested_kit_id TEXT REFERENCES kits(id),
  qty REAL NOT NULL DEFAULT 1,
  filament_grams REAL,
  filament_material TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS spools (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES items(id),
  location_id TEXT REFERENCES locations(id),
  barcode TEXT UNIQUE,
  brand TEXT,
  material TEXT NOT NULL,
  color_name TEXT NOT NULL,
  color_hex TEXT,
  starting_grams REAL NOT NULL,
  remaining_grams REAL NOT NULL,
  cost_per_kg_usd REAL NOT NULL DEFAULT 0,
  notes TEXT,
  opened_at TEXT,
  is_empty INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spool_usage (
  id TEXT PRIMARY KEY,
  spool_id TEXT NOT NULL REFERENCES spools(id),
  job_name TEXT,
  grams REAL NOT NULL,
  weight_before REAL NOT NULL,
  weight_after REAL NOT NULL,
  kit_sale_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS movements (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  item_id TEXT REFERENCES items(id),
  spool_id TEXT REFERENCES spools(id),
  from_location_id TEXT REFERENCES locations(id),
  to_location_id TEXT REFERENCES locations(id),
  qty REAL NOT NULL,
  note TEXT,
  kit_sale_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kit_sales (
  id TEXT PRIMARY KEY,
  kit_id TEXT NOT NULL REFERENCES kits(id),
  qty INTEGER NOT NULL,
  note TEXT,
  sell_price_usd REAL NOT NULL,
  cost_usd REAL NOT NULL,
  margin_usd REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_location ON stock(location_id);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
CREATE INDEX IF NOT EXISTS idx_locations_barcode ON locations(barcode);
CREATE INDEX IF NOT EXISTS idx_kits_barcode ON kits(barcode);
CREATE INDEX IF NOT EXISTS idx_spools_barcode ON spools(barcode);
CREATE INDEX IF NOT EXISTS idx_kit_bom_kit ON kit_bom(kit_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spool_usage_spool ON spool_usage(spool_id);
`;

export const DEFAULT_SETTINGS = {
  filamentLowGrams: 300,
  filamentCriticalGrams: 100,
  cloudEnabled: false,
  firebaseConfig: null as null,
  lastSyncAt: null as null,
  dirty: false,
  rev: 0,
};

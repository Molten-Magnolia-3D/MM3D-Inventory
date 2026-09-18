export type ItemType = "part" | "product" | "consumable" | "filament";
export type LocationType = "building" | "room" | "shelf" | "bin" | "tote" | "area";
export type LocationArea = "hardware" | "filament";
export type MovementType = "receive" | "adjust" | "move" | "use" | "scrap" | "sale";

export interface User {
  id: string;
  email: string;
  firebaseUid?: string | null;
  createdAt: string;
}

export interface Location {
  id: string;
  parentId: string | null;
  name: string;
  type: LocationType;
  area: LocationArea;
  barcode: string | null;
  sortOrder: number;
  archived: boolean;
  updatedAt: string;
}

export interface LocationNode extends Location {
  children: LocationNode[];
  path: string;
}

export interface Item {
  id: string;
  sku: string;
  name: string;
  type: ItemType;
  barcode: string | null;
  costUsd: number;
  sellPriceUsd: number;
  notes: string | null;
  archived: boolean;
  updatedAt: string;
}

export interface StockRow {
  itemId: string;
  locationId: string;
  qty: number;
  updatedAt: string;
  locationName?: string;
  locationPath?: string;
  locationBarcode?: string | null;
}

export interface ItemWithStock extends Item {
  totalQty: number;
  lots: StockRow[];
  marginUsd: number | null;
}

export interface Kit {
  id: string;
  sku: string;
  name: string;
  barcode: string | null;
  sellPriceUsd: number;
  notes: string | null;
  archived: boolean;
  updatedAt: string;
}

export interface BomLine {
  id: string;
  kitId: string;
  componentItemId: string | null;
  nestedKitId: string | null;
  qty: number;
  filamentGrams: number | null;
  filamentMaterial: string | null;
  notes: string | null;
  sortOrder: number;
}

export interface LeafRequirement {
  itemId: string | null;
  itemSku?: string;
  itemName?: string;
  qty: number;
  filamentGrams: number;
  filamentMaterial: string | null;
  sourceKitIds: string[];
}

export interface KitView extends Kit {
  bom: BomLine[];
  leaves: LeafRequirement[];
  canMake: number;
  estimatedCostUsd: number;
  marginUsd: number;
}

export interface Spool {
  id: string;
  itemId: string | null;
  locationId: string | null;
  barcode: string | null;
  brand: string | null;
  material: string;
  colorName: string;
  colorHex: string | null;
  startingGrams: number;
  remainingGrams: number;
  costPerKgUsd: number;
  notes: string | null;
  openedAt: string | null;
  isEmpty: boolean;
  archived: boolean;
  updatedAt: string;
}

export interface SpoolUsage {
  id: string;
  spoolId: string;
  jobName: string | null;
  grams: number;
  weightBefore: number;
  weightAfter: number;
  kitSaleId: string | null;
  createdAt: string;
}

export interface Movement {
  id: string;
  type: MovementType;
  itemId: string | null;
  spoolId: string | null;
  fromLocationId: string | null;
  toLocationId: string | null;
  qty: number;
  note: string | null;
  kitSaleId: string | null;
  createdAt: string;
}

export interface KitSale {
  id: string;
  kitId: string;
  qty: number;
  note: string | null;
  sellPriceUsd: number;
  costUsd: number;
  marginUsd: number;
  createdAt: string;
}

export interface StockWarning {
  code: "negative_stock" | "negative_filament" | "insufficient_filament_pick";
  message: string;
}

export interface MutationResult<T = void> {
  data: T;
  warnings: StockWarning[];
}

export interface BinContents {
  location: Location;
  path: string;
  items: Array<{
    item: Item;
    qty: number;
    barcode: string | null;
  }>;
  spools: Spool[];
}

export type LookupHit =
  | { kind: "bin"; location: Location; path: string; contents: BinContents }
  | { kind: "item"; item: ItemWithStock }
  | { kind: "kit"; kit: KitView }
  | { kind: "spool"; spool: Spool }
  | { kind: "none"; code: string };

export interface StockAllocation {
  itemId: string;
  locationId: string;
  qty: number;
}

export interface FilamentPick {
  spoolId: string;
  grams: number;
}

export interface LowStockGroup {
  material: string;
  colorName: string;
  colorHex: string | null;
  totalGrams: number;
  spoolCount: number;
  level: "critical" | "low";
  sampleSpoolId: string;
}

export interface AppSettings {
  filamentLowGrams: number;
  filamentCriticalGrams: number;
  cloudEnabled: boolean;
  firebaseConfig: FirebaseClientConfig | null;
  lastSyncAt: string | null;
  dirty: boolean;
  rev: number;
}

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export interface DeviceInfo {
  id: string;
  hostname: string;
  platform?: string;
}

export interface DeviceLock {
  deviceId: string;
  hostname: string;
  heartbeatAt: string;
  holder: boolean;
}

export interface Snapshot {
  rev: number;
  updatedAt: string;
  sqliteBase64: string;
}

export const ITEM_TYPES: ItemType[] = ["part", "product", "consumable", "filament"];
export const LOCATION_TYPES: LocationType[] = [
  "building",
  "room",
  "shelf",
  "bin",
  "tote",
  "area",
];
export const MOVEMENT_TYPES: MovementType[] = [
  "receive",
  "adjust",
  "move",
  "use",
  "scrap",
  "sale",
];
export const BASE_MATERIALS = ["PLA", "PETG", "ABS", "ASA", "TPU", "PA", "PC"];

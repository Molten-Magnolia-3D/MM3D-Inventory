import path from "node:path";
import { Inventory } from "../core/inventory";

export function wasmLocator(file: string): string {
  return path.join(process.cwd(), "node_modules", "sql.js", "dist", file);
}

export async function freshInventory(): Promise<Inventory> {
  return Inventory.create(null, () => undefined, wasmLocator);
}

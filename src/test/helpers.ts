import fs from "node:fs";
import path from "node:path";
import { Inventory } from "../core/inventory";

export function wasmLocator(file: string): string {
  return path.join(process.cwd(), "node_modules", "sql.js", "dist", file);
}

export async function freshInventory(): Promise<Inventory> {
  const wasm = fs.readFileSync(path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm"));
  return Inventory.create(null, () => undefined, wasmLocator, wasm);
}

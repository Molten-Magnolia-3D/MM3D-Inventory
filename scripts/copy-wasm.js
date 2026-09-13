import fs from "node:fs";
import path from "node:path";

const src = path.join("node_modules", "sql.js", "dist", "sql-wasm.wasm");
const destDir = "public";
const dest = path.join(destDir, "sql-wasm.wasm");

if (!fs.existsSync(src)) {
  console.warn("sql.js wasm not found yet; skipping copy");
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log("copied sql-wasm.wasm to public/");

import fs from "node:fs";
import path from "node:path";

const dist = path.join("node_modules", "sql.js", "dist");
const destDir = "public";
fs.mkdirSync(destDir, { recursive: true });

for (const file of [
  "sql-wasm.wasm",
  "sql-wasm-browser.wasm",
  "sql-wasm-browser.js",
]) {
  const src = path.join(dist, file);
  if (!fs.existsSync(src)) {
    console.warn("missing", src);
    continue;
  }
  fs.copyFileSync(src, path.join(destDir, file));
  console.log("copied", file, "to public/");
}

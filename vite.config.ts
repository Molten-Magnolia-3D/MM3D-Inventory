import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

function sqlJsDefaultExport(): Plugin {
  return {
    name: "sql-js-default-export",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("sql-wasm") || !id.endsWith(".js")) return null;
      if (code.includes("export default initSqlJs")) return null;
      return {
        code: `${code}\nexport default initSqlJs;\n`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [sqlJsDefaultExport(), react()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  optimizeDeps: {
    exclude: ["sql.js"],
  },
  assetsInclude: ["**/*.wasm"],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

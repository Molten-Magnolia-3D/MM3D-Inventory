import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { version } from "./package.json";

function emitVersionJson(): Plugin {
  const payload = `${JSON.stringify({ version }, null, 2)}\n`;
  function serveVersion(req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (body: string) => void }, next: () => void) {
    const pathname = req.url?.split("?")[0];
    if (pathname !== "/version.json") {
      next();
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(payload);
  }
  return {
    name: "mm3d-version-json",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "version.json", source: payload });
    },
    configureServer(server) {
      server.middlewares.use(serveVersion);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveVersion);
    },
  };
}

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
  plugins: [sqlJsDefaultExport(), emitVersionJson(), react()],
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
    include: ["src/**/*.test.ts", "electron/**/*.test.ts"],
  },
});

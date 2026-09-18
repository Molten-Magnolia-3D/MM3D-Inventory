import path from "node:path";
import { describe, expect, it } from "vitest";
import { fileInDist } from "./paths.js";

describe("renderer protocol paths", () => {
  const dist = path.resolve("/tmp/mm3d-fake-dist");

  it("joins a leading slash onto dist instead of treating it as an absolute path", () => {
    const resolved = fileInDist("/sql-wasm-browser.wasm", dist);
    expect(resolved).toBe(path.resolve(dist, "sql-wasm-browser.wasm"));
    expect(resolved).not.toBe(path.resolve("/sql-wasm-browser.wasm"));
  });

  it("rejects path traversal", () => {
    expect(fileInDist("/../secret.txt", dist)).toBeNull();
    expect(fileInDist("/assets/../../secret.txt", dist)).toBeNull();
  });

  it("maps index and hashed assets", () => {
    expect(fileInDist("/index.html", dist)).toBe(path.resolve(dist, "index.html"));
    expect(fileInDist("/assets/index-abc.js", dist)).toBe(
      path.resolve(dist, "assets", "index-abc.js"),
    );
  });
});

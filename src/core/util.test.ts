import { describe, expect, it } from "vitest";
import { asUint8Array, itemLabel, sqlAssetUrl, withTimeout } from "./util";

describe("boot helpers", () => {
  it("coerces IPC Buffer clones into Uint8Array", () => {
    expect(asUint8Array(null)).toBeNull();
    expect(Array.from(asUint8Array(new Uint8Array([1, 2, 3]))!)).toEqual([1, 2, 3]);
    expect(Array.from(asUint8Array(new Uint8Array([9, 8]).buffer)!)).toEqual([9, 8]);
    expect(Array.from(asUint8Array([4, 5])!)).toEqual([4, 5]);
    expect(Array.from(asUint8Array({ type: "Buffer", data: [7, 8, 9] })!)).toEqual([7, 8, 9]);
  });

  it("resolves wasm next to the page, not at the filesystem root", () => {
    expect(sqlAssetUrl("sql-wasm-browser.wasm", "file:///C:/app/dist/index.html")).toBe(
      "file:///C:/app/dist/sql-wasm-browser.wasm",
    );
    expect(sqlAssetUrl("/sql-wasm-browser.wasm", "file:///C:/app/dist/index.html")).not.toBe(
      "file:///sql-wasm-browser.wasm",
    );
    expect(sqlAssetUrl("sql-wasm-browser.wasm", "mm3d://app/index.html")).toBe(
      "mm3d://app/sql-wasm-browser.wasm",
    );
    expect(sqlAssetUrl("sql-wasm-browser.wasm", "http://127.0.0.1:5173/#/login")).toBe(
      "http://127.0.0.1:5173/sql-wasm-browser.wasm",
    );
    expect(
      sqlAssetUrl(
        "sql-wasm-browser.wasm",
        "https://molten-magnolia-3d.github.io/MM3D-Inventory/#/items",
      ),
    ).toBe("https://molten-magnolia-3d.github.io/MM3D-Inventory/sql-wasm-browser.wasm");
  });

  it("times out a hanging promise", async () => {
    await expect(withTimeout(new Promise(() => undefined), 20, "gave up")).rejects.toThrow(/gave up/);
  });

  it("joins name and variant for labels", () => {
    expect(itemLabel({ name: "Memorabilia mug" })).toBe("Memorabilia mug");
    expect(itemLabel({ name: "Memorabilia mug", variant: "VMA-231 · 11 oz" })).toBe(
      "Memorabilia mug · VMA-231 · 11 oz",
    );
  });
});

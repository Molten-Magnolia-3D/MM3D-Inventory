import { describe, expect, it } from "vitest";
import {
  DOWNLOAD_PAGE_URL,
  PHONE_APP_URL,
  latestReleaseAssetUrl,
  phoneZipLatestUrl,
  phoneZipUrl,
  versionedReleaseAssetUrl,
  windowsPortableLatestUrl,
  windowsPortableUrl,
  windowsSetupLatestUrl,
  windowsSetupUrl,
} from "./downloads";

describe("download URLs", () => {
  it("points the phone app at the GitHub Pages URL, not a zip installer", () => {
    expect(PHONE_APP_URL).toBe("https://molten-magnolia-3d.github.io/MM3D-Inventory/");
    expect(DOWNLOAD_PAGE_URL).toBe("https://molten-magnolia-3d.github.io/MM3D-Inventory/download.html");
  });

  it("builds versioned file URLs that download instead of opening the release page", () => {
    expect(versionedReleaseAssetUrl("MM3D-Inventory-Setup-1.0.29.exe", "1.0.29")).toBe(
      "https://github.com/Molten-Magnolia-3D/MM3D-Inventory/releases/download/v1.0.29/MM3D-Inventory-Setup-1.0.29.exe",
    );
    expect(windowsSetupUrl("1.0.29")).toContain("/releases/download/v1.0.29/MM3D-Inventory-Setup-1.0.29.exe");
    expect(windowsPortableUrl("1.0.29")).toContain("/releases/download/v1.0.29/MM3D-Inventory-Portable-1.0.29.exe");
    expect(phoneZipUrl("1.0.29")).toContain("/releases/download/v1.0.29/MM3D-Inventory-Phone-1.0.29.zip");
    expect(windowsSetupUrl("1.0.29")).not.toContain("/releases/latest");
  });

  it("builds always-latest aliases that skip the collapsed Assets list", () => {
    expect(latestReleaseAssetUrl("MM3D-Inventory-Setup.exe")).toBe(
      "https://github.com/Molten-Magnolia-3D/MM3D-Inventory/releases/latest/download/MM3D-Inventory-Setup.exe",
    );
    expect(windowsSetupLatestUrl()).toMatch(/\/releases\/latest\/download\/MM3D-Inventory-Setup\.exe$/);
    expect(windowsPortableLatestUrl()).toMatch(/\/releases\/latest\/download\/MM3D-Inventory-Portable\.exe$/);
    expect(phoneZipLatestUrl()).toMatch(/\/releases\/latest\/download\/MM3D-Inventory-Phone\.zip$/);
  });
});

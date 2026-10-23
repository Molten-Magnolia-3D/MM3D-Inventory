export const GITHUB_REPO = "Molten-Magnolia-3D/MM3D-Inventory";
export const PHONE_APP_URL = "https://molten-magnolia-3d.github.io/MM3D-Inventory/";
export const DOWNLOAD_PAGE_PATH = "./download.html";
export const DOWNLOAD_PAGE_URL = `${PHONE_APP_URL}download.html`;

export function versionedReleaseAssetUrl(filename: string, version: string): string {
  return `https://github.com/${GITHUB_REPO}/releases/download/v${version}/${filename}`;
}

export function latestReleaseAssetUrl(filename: string): string {
  return `https://github.com/${GITHUB_REPO}/releases/latest/download/${filename}`;
}

export function windowsSetupUrl(version: string): string {
  return versionedReleaseAssetUrl(`MM3D-Inventory-Setup-${version}.exe`, version);
}

export function windowsPortableUrl(version: string): string {
  return versionedReleaseAssetUrl(`MM3D-Inventory-Portable-${version}.exe`, version);
}

export function phoneZipUrl(version: string): string {
  return versionedReleaseAssetUrl(`MM3D-Inventory-Phone-${version}.zip`, version);
}

export function windowsSetupLatestUrl(): string {
  return latestReleaseAssetUrl("MM3D-Inventory-Setup.exe");
}

export function windowsPortableLatestUrl(): string {
  return latestReleaseAssetUrl("MM3D-Inventory-Portable.exe");
}

export function phoneZipLatestUrl(): string {
  return latestReleaseAssetUrl("MM3D-Inventory-Phone.zip");
}

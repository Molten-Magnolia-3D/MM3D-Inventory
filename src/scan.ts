import type { LookupHit } from "./core/types";

export function normalizeScannedCode(raw: string): string {
  return raw.replace(/\u0000/g, "").trim();
}

export function hitRoute(hit: LookupHit): string | null {
  if (hit.kind === "bin") return `/locations?bin=${hit.location.id}`;
  if (hit.kind === "item") return `/items/${hit.item.id}`;
  if (hit.kind === "kit") return `/kits/${hit.kit.id}`;
  if (hit.kind === "spool") return `/filament/${hit.spool.id}`;
  return null;
}

export function cameraScanAvailable(isElectron: boolean): boolean {
  if (isElectron) return false;
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

import { version } from "../package.json";

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (window.mm3d?.isElectron) return;
  if (!("serviceWorker" in navigator)) return;
  const url = new URL("./sw.js", window.location.href);
  url.searchParams.set("v", version);
  void navigator.serviceWorker.register(url.toString());
}

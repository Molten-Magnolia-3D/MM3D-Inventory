import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Inventory } from "./core/inventory";
import type { DeviceLock, User } from "./core/types";
import { bytesFromSnapshot, FirebaseCloud, syncNow, type CloudBackend } from "./core/sync";
import { asUint8Array, withTimeout } from "./core/util";
import { createPlatform, type Platform } from "./platform";

interface Ctx {
  ready: boolean;
  error: string | null;
  inv: Inventory | null;
  user: User | null;
  platform: Platform;
  lock: DeviceLock | null;
  online: boolean;
  tick: number;
  refresh: () => void;
  persist: () => Promise<void>;
  sync: (forceTakeover?: boolean) => Promise<void>;
  cloudLogin: (email: string, password: string, mode: "login" | "register") => Promise<void>;
}

const InventoryContext = createContext<Ctx | null>(null);

function getCloudBackend(inv: Inventory): CloudBackend | null {
  const settings = inv.getSettings();
  if (!settings.cloudEnabled || !settings.firebaseConfig) return null;
  return new FirebaseCloud(settings.firebaseConfig);
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const platform = useMemo(() => createPlatform(), []);
  const [inv, setInv] = useState<Inventory | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [lock, setLock] = useState<DeviceLock | null>(null);
  const [online, setOnline] = useState(navigator.onLine);

  const persist = useCallback(async () => {
    if (!inv) return;
    await platform.saveDb(inv.exportBytes());
  }, [inv, platform]);

  const refresh = useCallback(() => {
    setTick((n) => n + 1);
    void persist();
  }, [persist]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bytes, wasmBinary] = await withTimeout(
          Promise.all([platform.loadDb(), platform.loadWasm()]),
          15_000,
          "Timed out reading the shop ledger files from disk.",
        );
        const created = await withTimeout(
          Inventory.create(
            asUint8Array(bytes),
            (data) => platform.saveDb(data),
            (file) => platform.locateWasm(file),
            wasmBinary,
          ),
          25_000,
          "Timed out opening the shop ledger. If this keeps happening, reinstall the app.",
        );
        if (!cancelled) {
          setInv(created);
          setReady(true);
        }
      } catch (err) {
        console.error("MM3D failed to open database", err);
        if (!cancelled) setError((err as Error).message || String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [platform]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const sync = useCallback(
    async (forceTakeover = false) => {
      if (!inv) return;
      const settings = inv.getSettings();
      if (!settings.cloudEnabled) return;
      const cloud = getCloudBackend(inv);
      if (!cloud) return;
      const device = await platform.deviceInfo();
      try {
        const result = await syncNow(inv, cloud, device, { takeover: forceTakeover });
        setLock(result.lock);
        if (result.pulled) {
          const remote = await cloud.pullSnapshot();
          if (remote) {
            const wasmBinary = await platform.loadWasm();
            const next = await Inventory.create(
              bytesFromSnapshot(remote),
              (data) => platform.saveDb(data),
              (file) => platform.locateWasm(file),
              wasmBinary,
            );
            setInv(next);
          }
        }
        await persist();
        setTick((n) => n + 1);
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [inv, persist, platform],
  );

  const cloudLogin = useCallback(
    async (email: string, password: string, mode: "login" | "register") => {
      if (!inv) return;
      const cloud = getCloudBackend(inv);
      if (!cloud || !navigator.onLine) return;
      try {
        if (mode === "register") {
          try {
            await cloud.register(email, password);
          } catch {
            await cloud.login(email, password);
          }
        } else {
          await cloud.login(email, password);
        }
      } catch (err) {
        throw new Error(
          `Local login worked, but cloud sign-in failed: ${(err as Error).message}. You can keep working offline.`,
        );
      }
    },
    [inv],
  );

  useEffect(() => {
    if (!inv) return;
    const settings = inv.getSettings();
    if (settings.cloudEnabled && online) void sync();
    const id = window.setInterval(() => {
      if (inv.getSettings().cloudEnabled && navigator.onLine) void sync();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [inv, online, sync]);

  const user = inv?.currentUser() ?? null;

  const value: Ctx = {
    ready,
    error,
    inv,
    user,
    platform,
    lock,
    online,
    tick,
    refresh,
    persist,
    sync,
    cloudLogin,
  };

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory(): Ctx {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory outside provider");
  return ctx;
}

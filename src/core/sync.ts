import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { Inventory } from "./inventory";
import type { DeviceInfo, DeviceLock, FirebaseClientConfig, Snapshot } from "./types";
import { bytesToBase64, base64ToBytes, nowIso } from "./util";

const LOCK_STALE_MS = 2 * 60 * 1000;

export interface CloudBackend {
  login(email: string, password: string): Promise<{ uid: string }>;
  register(email: string, password: string): Promise<{ uid: string }>;
  logout(): Promise<void>;
  pullSnapshot(): Promise<Snapshot | null>;
  pushSnapshot(snapshot: Snapshot): Promise<void>;
  acquireLock(device: DeviceInfo): Promise<{ ok: boolean; lock: DeviceLock }>;
  heartbeat(device: DeviceInfo): Promise<void>;
  releaseLock(device: DeviceInfo): Promise<void>;
}

export class MemoryCloud implements CloudBackend {
  snapshot: Snapshot | null = null;
  lock: DeviceLock | null = null;
  uid = "local";

  async login(): Promise<{ uid: string }> {
    return { uid: this.uid };
  }
  async register(): Promise<{ uid: string }> {
    return { uid: this.uid };
  }
  async logout(): Promise<void> {}
  async pullSnapshot(): Promise<Snapshot | null> {
    return this.snapshot;
  }
  async pushSnapshot(snapshot: Snapshot): Promise<void> {
    this.snapshot = snapshot;
  }
  async acquireLock(device: DeviceInfo): Promise<{ ok: boolean; lock: DeviceLock }> {
    const now = Date.now();
    if (
      this.lock &&
      this.lock.deviceId !== device.id &&
      now - Date.parse(this.lock.heartbeatAt) < LOCK_STALE_MS
    ) {
      return { ok: false, lock: { ...this.lock, holder: false } };
    }
    this.lock = {
      deviceId: device.id,
      hostname: device.hostname,
      heartbeatAt: nowIso(),
      holder: true,
    };
    return { ok: true, lock: this.lock };
  }
  async heartbeat(device: DeviceInfo): Promise<void> {
    if (this.lock?.deviceId === device.id) {
      this.lock.heartbeatAt = nowIso();
    }
  }
  async releaseLock(device: DeviceInfo): Promise<void> {
    if (!this.lock) return;
    if (!device.id || this.lock.deviceId === device.id) this.lock = null;
  }
}

export class FirebaseCloud implements CloudBackend {
  private app: FirebaseApp;
  private auth: Auth;
  private db: Firestore;

  constructor(config: FirebaseClientConfig) {
    this.app =
      getApps().find((app) => app.name === "mm3d-inventory") ??
      initializeApp(config, "mm3d-inventory");
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
  }

  private uid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error("Not signed in to cloud.");
    return uid;
  }

  async login(email: string, password: string): Promise<{ uid: string }> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    return { uid: cred.user.uid };
  }

  async register(email: string, password: string): Promise<{ uid: string }> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    return { uid: cred.user.uid };
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  async pullSnapshot(): Promise<Snapshot | null> {
    const snap = await getDoc(doc(this.db, "users", this.uid(), "data", "snapshot"));
    if (!snap.exists()) return null;
    const data = snap.data() as Snapshot;
    return data;
  }

  async pushSnapshot(snapshot: Snapshot): Promise<void> {
    await setDoc(doc(this.db, "users", this.uid(), "data", "snapshot"), {
      ...snapshot,
      updatedAt: nowIso(),
      serverTime: serverTimestamp(),
    });
  }

  async acquireLock(device: DeviceInfo): Promise<{ ok: boolean; lock: DeviceLock }> {
    const ref = doc(this.db, "users", this.uid(), "data", "lock");
    const snap = await getDoc(ref);
    const existing = snap.exists() ? (snap.data() as DeviceLock) : null;
    const stale =
      !existing ||
      existing.deviceId === device.id ||
      Date.now() - Date.parse(existing.heartbeatAt) >= LOCK_STALE_MS;
    if (!stale && existing) {
      return { ok: false, lock: { ...existing, holder: false } };
    }
    const lock: DeviceLock = {
      deviceId: device.id,
      hostname: device.hostname,
      heartbeatAt: nowIso(),
      holder: true,
    };
    await setDoc(ref, lock);
    return { ok: true, lock };
  }

  async heartbeat(device: DeviceInfo): Promise<void> {
    await setDoc(doc(this.db, "users", this.uid(), "data", "lock"), {
      deviceId: device.id,
      hostname: device.hostname,
      heartbeatAt: nowIso(),
      holder: true,
    });
  }

  async releaseLock(device: DeviceInfo): Promise<void> {
    const ref = doc(this.db, "users", this.uid(), "data", "lock");
    if (!device.id) {
      await setDoc(ref, {
        deviceId: "",
        hostname: "",
        heartbeatAt: new Date(0).toISOString(),
        holder: false,
      });
      return;
    }
    const snap = await getDoc(ref);
    if (snap.exists() && (snap.data() as DeviceLock).deviceId === device.id) {
      await setDoc(ref, {
        deviceId: "",
        hostname: "",
        heartbeatAt: new Date(0).toISOString(),
        holder: false,
      });
    }
  }
}

export function snapshotFromInventory(inv: Inventory): Snapshot {
  return {
    rev: inv.getSettings().rev,
    updatedAt: nowIso(),
    sqliteBase64: bytesToBase64(inv.exportBytes()),
  };
}

export function bytesFromSnapshot(snapshot: Snapshot): Uint8Array {
  return base64ToBytes(snapshot.sqliteBase64);
}

export async function syncNow(
  inv: Inventory,
  cloud: CloudBackend,
  device: DeviceInfo,
  opts?: { takeover?: boolean },
): Promise<{ pulled: boolean; pushed: boolean; lock: DeviceLock }> {
  if (opts?.takeover) {
    await cloud.releaseLock({ id: "", hostname: "" });
  }
  const acquired = await cloud.acquireLock(device);
  if (!acquired.ok) {
    inv.readOnly = true;
    inv.readOnlyReason = `In use on ${acquired.lock.hostname}. One PC at a time — take over from Settings if this is stale.`;
    const remote = await cloud.pullSnapshot();
    return { pulled: !!remote, pushed: false, lock: acquired.lock };
  }
  inv.readOnly = false;
  inv.readOnlyReason = null;
  const remote = await cloud.pullSnapshot();
  const local = inv.getSettings();
  let pulled = false;
  let pushed = false;
  if (remote && remote.rev > local.rev && !local.dirty) {
    pulled = true;
  } else {
    await cloud.pushSnapshot(snapshotFromInventory(inv));
    const settings = inv.getSettings();
    settings.dirty = false;
    settings.lastSyncAt = nowIso();
    inv.putSettings(settings);
    pushed = true;
  }
  return { pulled, pushed, lock: acquired.lock };
}

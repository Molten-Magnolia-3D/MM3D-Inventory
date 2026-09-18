export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function roundGrams(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

export function normalizeBarcode(code: string): string {
  return code.trim();
}

export function slugSku(value: string): string {
  return value.trim().toUpperCase();
}

export function formatUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function formatQty(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1000) / 1000);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Coerce IPC Buffer clones, ArrayBuffers, and typed arrays into Uint8Array. */
export function asUint8Array(data: unknown): Uint8Array | null {
  if (data == null) return null;
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
  if (Array.isArray(data)) return new Uint8Array(data as number[]);
  if (typeof data === "object" && data !== null && "data" in data) {
    const inner = (data as { data: unknown }).data;
    if (inner instanceof Uint8Array) return inner;
    if (Array.isArray(inner)) return new Uint8Array(inner as number[]);
  }
  return null;
}

export function sqlAssetUrl(file: string, baseHref?: string): string {
  const name = file.replace(/^(\.\/|\/)+/, "");
  const base = baseHref ?? (typeof window !== "undefined" ? window.location.href : "./");
  try {
    return new URL(name, base).toString();
  } catch {
    return `./${name}`;
  }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

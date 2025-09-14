// src/lib/storage.ts
// LocalStorage utilities with atomic writes, backups, and typed errors.

export const schemaVersion = 1 as const;

export type StorageErrorCode = "parse-failed" | "write-failed";
export class StorageError extends Error {
  code: StorageErrorCode;
  key: string;
  constructor(code: StorageErrorCode, key: string, message?: string, cause?: unknown) {
    super(message ?? code);
    this.code = code;
    this.key = key;
    if (cause && (globalThis as any).Error?.captureStackTrace) {
      (this as any).cause = cause;
    }
  }
}

const hasLS = () => typeof window !== "undefined" && !!window.localStorage;

/** Read JSON value. Falls back to <key>.bak on parse failure. Throws on both failures. */
export function readWithBackup<T>(key: string): T | null {
  if (!hasLS()) return null;
  const raw = window.localStorage.getItem(key);
  if (raw == null) return null;

  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    const bak = window.localStorage.getItem(`${key}.bak`);
    if (bak != null) {
      try {
        return JSON.parse(bak) as T;
      } catch (e2) {
        throw new StorageError("parse-failed", key, `Failed to parse "${key}" and backup`, e2);
      }
    }
    throw new StorageError("parse-failed", key, `Failed to parse "${key}"`, e);
  }
}

/** Atomically write JSON and keep previous in <key>.bak. */
export function atomicJSONWrite(key: string, value: unknown): void {
  if (!hasLS()) return;
  let json: string;
  try {
    json = JSON.stringify(value);
  } catch (e) {
    throw new StorageError("write-failed", key, `Stringify failed for "${key}"`, e);
  }

  try {
    const prev = window.localStorage.getItem(key);
    if (prev != null) window.localStorage.setItem(`${key}.bak`, prev);
    window.localStorage.setItem(key, json);
  } catch (e) {
    throw new StorageError("write-failed", key, `localStorage write failed for "${key}"`, e);
  }
}

export function remove(key: string): void {
  if (!hasLS()) return;
  try {
    window.localStorage.removeItem(key);
    window.localStorage.removeItem(`${key}.bak`);
  } catch (e) { /* noop */ }
}

export function clearAllWithPrefix(prefix: string): void {
  if (!hasLS()) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach(k => window.localStorage.removeItem(k));
  } catch (e) { /* noop */ }
}

/* --------------------------- rollover helpers --------------------------- */

const LAST_ROLLOVER_KEY = "sys.lastRolloverDayKey.v1";

/** Return last rollover day key (local midnight epoch ms) or null. */
export function getLastRolloverDayKey(): number | null {
  const v = readWithBackup<number | null>(LAST_ROLLOVER_KEY);
  return typeof v === "number" ? v : null;
}

/** Persist last rollover day key. */
export function setLastRolloverDayKey(dayKey: number): void {
  atomicJSONWrite(LAST_ROLLOVER_KEY, dayKey);
}

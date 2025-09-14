// src/stores/storage.ts
// Minimal app-state store with localStorage persistence + JSON KV.

type RootState = Record<string, any>;
const APP_STATE_KEY = "__app_state__";

// ---------- bootstrap ----------
let state: RootState = ((): RootState => {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(APP_STATE_KEY) : null;
    return raw ? (JSON.parse(raw) as RootState) : {};
  } catch {
    return {};
  }
})();

function persist() {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
    }
  } catch { /* noop */ }
}

// ---------- public API ----------
export function getState(): RootState {
  return state;
}

export function update(fn: (draft: RootState) => void): void {
  const draft = state;
  fn(draft);
  state = draft;
  persist();
}

// Lightweight JSON KV for misc values (e.g., lastRolloverDayKey)
export function readJSON<T>(key: string, def: T): T {
  const kv = (state.__kv__ ?? {}) as Record<string, any>;
  return (key in kv ? (kv[key] as T) : def);
}

export function writeJSON(key: string, val: any): void {
  if (!state.__kv__) state.__kv__ = {};
  state.__kv__[key] = val;
  persist();
}

// ---------- optional utilities ----------

export const STORAGE_KEYS = {
  date: "ui.date.v3",
  view: "ui.view.v1",
  mode: "ui.mode.v1",
  settings: "app.settings.v1",
} as const;

export const VERSIONS = {
  date: 3,
  view: 1,
  mode: 1,
  settings: 1,
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
type Wrapped<T> = { _v?: number; payload: T };

function readRaw(key: StorageKey): Wrapped<unknown> | undefined {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    if (!raw) return undefined;
    return JSON.parse(raw) as Wrapped<unknown>;
  } catch {
    return undefined;
  }
}

function writeRaw<T>(key: StorageKey, value: T, version?: number) {
  try {
    const wrapped = typeof version === "number" ? { _v: version, payload: value } : (value as unknown);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(wrapped));
    }
  } catch { /* noop */ }
}

/** Point-in-time export of registered UI keys (manual backup). */
export function snapshot(): Record<StorageKey, unknown> {
  const out = {} as Record<StorageKey, unknown>;
  (Object.values(STORAGE_KEYS) as StorageKey[]).forEach((k) => {
    const w = readRaw(k);
    out[k] = w?.payload ?? w ?? null;
  });
  return out;
}

/** Restore from `snapshot()`. Overwrites existing values for those keys. */
export function restoreSnapshot(data: Partial<Record<StorageKey, unknown>>) {
  (Object.entries(data) as [StorageKey, unknown][]).forEach(([k, payload]) => {
    const version =
      k === STORAGE_KEYS.date ? VERSIONS.date :
      k === STORAGE_KEYS.view ? VERSIONS.view :
      k === STORAGE_KEYS.mode ? VERSIONS.mode :
      k === STORAGE_KEYS.settings ? VERSIONS.settings : undefined;
    writeRaw(k, { payload }, version);
  });
}

/** Remove all registered UI keys. */
export function clearAll() {
  (Object.values(STORAGE_KEYS) as StorageKey[]).forEach((k) => {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(k);
    } catch { /* noop */ }
  });
}

// compat re-exports for stores expecting readWithBackup/atomicJSONWrite

// compat re-exports for stores expecting readWithBackup/atomicJSONWrite

// compat re-exports for stores expecting readWithBackup/atomicJSONWrite
export { readWithBackup, atomicJSONWrite } from "@/lib/storage";

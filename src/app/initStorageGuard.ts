// Simple runtime checks for client-side storage.
// Use before mounting the app to decide whether to enable persistence.

/** Returns true if localStorage is usable (quota, privacy mode, or policy can disable it). */
export function storageHealthy(): boolean {
  try {
    const k = "__probe_localstorage__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/** Log a single warning when persistence is unavailable. Call once at app start. */
export function warnIfStorageUnavailable(): void {
  if (!storageHealthy()) {
    // Keep it non-fatal. Stores should conditionally disable persist when this is false.
    // Example usage: only wrap stores with `persist` if storageHealthy() is true.
    // Or provide a fallback in-memory store for this session.
    console.warn(
      "Persistence disabled: localStorage is not available in this environment."
    );
  }
}

/** Safe JSON helpers to avoid crashing on corrupted persisted data. */
export const safeJSON = {
  parse<T>(value: string | null, fallback: T): T {
    if (value == null) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  },
  stringify<T>(value: T): string {
    try {
      return JSON.stringify(value);
    } catch {
      // Last resort; callers should handle empty string as a signal to skip write.
      return "";
    }
  },
};

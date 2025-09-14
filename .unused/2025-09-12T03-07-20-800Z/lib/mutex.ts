// src/lib/mutex.ts
// Prevents multi-tab duplication (e.g., rollover) using localStorage locks.

const hasLS = () => typeof window !== "undefined" && !!window.localStorage;

export async function withLocalStorageMutex<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T> | T
): Promise<T | null> {
  if (!hasLS()) return fn();

  const now = Date.now();
  const lockKey = `${key}.lock`;
  const raw = window.localStorage.getItem(lockKey);
  const existing = raw ? Number(raw) : 0;

  // If lock is still valid, skip execution
  if (existing && now - existing < ttlMs) return null;

  try {
    // Acquire lock
    window.localStorage.setItem(lockKey, String(now));

    // Run critical section
    return await fn();
  } finally {
    // Release lock
    try { window.localStorage.removeItem(lockKey); } catch (e) { 
  }
}

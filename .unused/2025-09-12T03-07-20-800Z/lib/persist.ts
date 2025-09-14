// src/lib/persist.ts
// Debounced, coalesced persistence + simple restore.

import { atomicJSONWrite, readWithBackup } from "@/lib/storage";

type Options = { debounceMs?: number };

const timers = new Map<string, number>();
const pending = new Map<string, unknown>();

function writeNow(key: string) {
  if (!pending.has(key)) return;
  const payload = pending.get(key);
  try { atomicJSONWrite(key, payload); } catch { /* noop */ }
  pending.delete(key);
  const t = timers.get(key);
  if (t) { clearTimeout(t); timers.delete(key); }
}

/** Debounced persist to localStorage via atomicJSONWrite. Coalesces rapid writes. */
export function persist(key: string, data: unknown, opts: Options = {}): void {
  const delay = Math.max(0, opts.debounceMs ?? 250);
  pending.set(key, data);
  const prev = timers.get(key);
  if (prev) clearTimeout(prev);
  const handle = window.setTimeout(() => writeNow(key), delay);
  timers.set(key, handle);
}

/** Force-write all pending keys or a specific key. */
export function flushPersist(key?: string): void {
  if (key) { writeNow(key); return; }
  Array.from(pending.keys()).forEach(writeNow);
}

/** Read last persisted value (with .bak fallback). */
export function restore<T = unknown>(key: string): T | null {
  return readWithBackup<T>(key);
}

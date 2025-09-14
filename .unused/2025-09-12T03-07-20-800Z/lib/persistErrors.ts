// src/lib/persistErrors.ts
export type PersistError = { key: string; message: string; payload?: unknown };
let latest: PersistError | null = null;
const listeners = new Set<() => void>();
export function reportPersistError(err: PersistError) { latest = err; listeners.forEach(f => f()); }
export function getLatestPersistError() { return latest; }
export function subscribePersistError(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }

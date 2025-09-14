// src/migrations/index.ts
// Ordered migration runner. Idempotent. Safe on higher/unknown versions.

export const CURRENT_SCHEMA_VERSION = 1;

type AnyState = Record<string, any>;
type Migration<T extends AnyState> = (state: T) => T;

/** Registry of target-version → migration(from previous version → target). */
const MIGRATIONS: Record<number, Migration<any>> = {
  // Example 0 → 1 no-op scaffold
  1: (s: AnyState) => ({ ...s }),
};

/** Optional helper to register future migrations at startup. */
export function registerMigration<T extends AnyState>(targetVersion: number, fn: Migration<T>) {
  MIGRATIONS[targetVersion] = fn as Migration<any>;
}

/** Get embedded schema version, default 0 if absent. */
function versionOf(s: AnyState | null | undefined): number {
  const v = s && typeof s._schemaVersion === "number" ? s._schemaVersion : 0;
  return Number.isFinite(v) ? v : 0;
}

/**
 * Run migrations up to CURRENT_SCHEMA_VERSION.
 * - Idempotent: skips already-applied versions.
 * - Safe fallback: if stored version > CURRENT, returns raw unchanged.
 * - Stops if a target version has no registered migration.
 */
export function runMigrations<T extends AnyState>(raw: T | null | undefined): T {
  let state: AnyState = raw ?? {};
  const from = versionOf(state);

  // Do not downgrade unknown higher versions
  if (from > CURRENT_SCHEMA_VERSION) return state as T;

  for (let target = from + 1; target <= CURRENT_SCHEMA_VERSION; target++) {
    const mig = MIGRATIONS[target];
    if (!mig) {
      // Unknown gap → stop safely with current state/version
      break;
    }
    // Guard idempotency if caller passed a state already marked
    if (versionOf(state) >= target) continue;

    const next = mig(state as T) ?? state;
    state = next;
    state._schemaVersion = target;
  }

  // Ensure version field exists even if no migrations ran
  if (state._schemaVersion == null) state._schemaVersion = from;

  return state as T;
}

// tests/storage.persistence.test.ts
// Validates storage: corrupted JSON recovery, atomic write fallback, migration crash recovery.

import * as storage from "@/lib/storage";
import { runMigrations } from "@/migrations";

describe("storage.persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("recovers from corrupted JSON", () => {
    localStorage.setItem("tasks.v1", "{not-json");
    const data = storage.readWithBackup("tasks.v1");
    expect(data).toBeNull();
    const bak = localStorage.getItem("tasks.v1.bak");
    expect(bak).toContain("{not-json");
  });

  it("atomicJSONWrite writes and backs up old value", () => {
    storage.atomicJSONWrite("foo", { a: 1 });
    expect(JSON.parse(localStorage.getItem("foo")!)).toEqual({ a: 1 });

    // overwrite → old value goes to .bak
    storage.atomicJSONWrite("foo", { a: 2 });
    expect(JSON.parse(localStorage.getItem("foo")!)).toEqual({ a: 2 });
    expect(localStorage.getItem("foo.bak")).toContain('"a":1');
  });

  it("migration crash falls back safely", () => {
    const bad = { _schemaVersion: 99 }; // higher than known
    localStorage.setItem("journal.v1", JSON.stringify(bad));

    const migrated = (() => {
      try {
        return runMigrations<any>(bad);
      } catch (e) {
        return null;
      }
    })();

    expect(migrated).toBeNull();
  });
});

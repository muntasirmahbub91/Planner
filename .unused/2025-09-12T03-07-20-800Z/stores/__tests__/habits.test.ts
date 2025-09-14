// src/stores/tests/habits.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

// Expected store API based on typical planner specs:
// - makeHabitsStore({ storageKey? })
// - add({ name: string, cadence?: "daily"|"weekly", active?: boolean }) -> { ok: boolean, id?, reason? }
// - list(filter?: "active"|"archived") -> Habit[]
// - get(id) -> Habit | null
// - update(id, patch) -> { ok: boolean, reason? }   // e.g., rename
// - delete(id) -> { ok: boolean, reason? }
// - archive(id) / unarchive(id) -> { ok: boolean, reason? }
// - toggleCheckin(id, dayStartMs) -> { ok: boolean }  // for weekly cadence, toggles the week bucket
// - isChecked?(id, dayStartMs) -> boolean             // optional; if absent, use countForRange
// - countForRange?(id, { from: number, to: number }) -> number
// - streak?(id, upToDayStartMs) -> { current: number; longest: number }
// If your export names differ, adjust imports accordingly.
import { makeHabitsStore } from "@/stores/habits";

import { weekStartMs, shiftDays, toDayStartMs } from "@/lib/time";

type Cadence = "daily" | "weekly";
interface Habit {
  id: string;
  name: string;
  cadence: Cadence;
  active: boolean;
}

// Helpers
const d = (y: number, m: number, day: number) =>
  new Date(y, m, day, 0, 0, 0, 0).getTime();

function toggle(habits: any, id: string, day: number) {
  if (typeof habits.toggleCheckin === "function") return habits.toggleCheckin(id, day);
  if (typeof habits.toggle === "function") return habits.toggle(id, day);
  throw new Error("No toggle API found on habits store");
}

function checked(habits: any, id: string, day: number) {
  if (typeof habits.isChecked === "function") return !!habits.isChecked(id, day);
  if (typeof habits.countForRange === "function")
    return (habits.countForRange(id, { from: day, to: day }) ?? 0) > 0;
  // Fallback: assume unchecked if no API
  return false;
}

describe("habits store", () => {
  let habits: ReturnType<typeof makeHabitsStore>;
  const DAY_A = d(2025, 0, 15); // Wed, Jan 15, 2025
  const DAY_B = shiftDays(DAY_A, 1);
  const DAY_C = shiftDays(DAY_A, 2);
  const DAY_D = shiftDays(DAY_A, 3);

  // Freeze Date.now to a stable baseline if any logic depends on "now"
  const NOW = d(2025, 0, 20);
  let restoreNow: () => void;

  beforeEach(() => {
    try {
      localStorage.clear?.();
    } catch {}
    const origNow = Date.now;
    vi.spyOn(Date, "now").mockImplementation(() => NOW);
    restoreNow = () => (Date.now as any).mockRestore?.() ?? (Date.now = origNow);

    habits = makeHabitsStore({ storageKey: "__test.habits__" });
    (habits as any).clearAll?.();
  });

  afterEach(() => {
    restoreNow?.();
  });

  it("adds habits and lists by status", () => {
    const h1 = habits.add({ name: "Hydrate", cadence: "daily", active: true });
    const h2 = habits.add({ name: "Weekly Review", cadence: "weekly", active: true });
    expect(h1.ok && h2.ok).toBe(true);

    const id1 = (h1 as any).id ?? (h1 as any).value?.id;
    const id2 = (h2 as any).id ?? (h2 as any).value?.id;

    // Archive second
    const ar = habits.archive(id2);
    expect(ar.ok ?? true).toBe(true);

    const actives = habits.list("active") as Habit[];
    const archived = habits.list("archived") as Habit[];

    expect(actives.some((x) => x.id === id1)).toBe(true);
    expect(actives.some((x) => x.id === id2)).toBe(false);
    expect(archived.some((x) => x.id === id2)).toBe(true);
  });

  it("toggles daily check-ins and is idempotent", () => {
    const r = habits.add({ name: "Read", cadence: "daily", active: true });
    expect(r.ok).toBe(true);
    const id = (r as any).id ?? (r as any).value?.id;

    // Toggle on for DAY_A
    expect(toggle(habits as any, id, DAY_A).ok ?? true).toBe(true);
    expect(checked(habits as any, id, DAY_A)).toBe(true);

    // Toggle again off
    expect(toggle(habits as any, id, DAY_A).ok ?? true).toBe(true);
    expect(checked(habits as any, id, DAY_A)).toBe(false);

    // Toggle on for two more days
    toggle(habits as any, id, DAY_B);
    toggle(habits as any, id, DAY_C);

    if (typeof (habits as any).countForRange === "function") {
      const n = (habits as any).countForRange(id, { from: DAY_A, to: DAY_C });
      // Only B and C should be counted now
      expect(n).toBe(2);
    }
  });

  it("computes daily streaks over consecutive days", () => {
    const r = habits.add({ name: "Meditate", cadence: "daily", active: true });
    expect(r.ok).toBe(true);
    const id = (r as any).id ?? (r as any).value?.id;

    // Mark three consecutive days: A, B, C
    toggle(habits as any, id, DAY_A);
    toggle(habits as any, id, DAY_B);
    toggle(habits as any, id, DAY_C);

    if (typeof (habits as any).streak === "function") {
      const s1 = (habits as any).streak(id, DAY_C);
      expect(s1.current).toBeGreaterThanOrEqual(3);
      expect(s1.longest).toBeGreaterThanOrEqual(3);

      // Break the streak by unchecking B
      toggle(habits as any, id, DAY_B); // off
      const s2 = (habits as any).streak(id, DAY_C);
      expect(s2.current).toBe(1); // only C remains checked at the tail
      expect(s2.longest).toBeGreaterThanOrEqual(2); // A..B or A..C before break
    }
  });

  it("weekly cadence groups by week; multiple day check-ins in same week count as one; streak counts weeks", () => {
    const r = habits.add({ name: "Weekly Plan", cadence: "weekly", active: true });
    expect(r.ok).toBe(true);
    const id = (r as any).id ?? (r as any).value?.id;

    // Use Monday-week boundary
    const W0 = weekStartMs(DAY_A, "Mon");         // week of DAY_A
    const W1 = shiftDays(W0, 7);
    const W2 = shiftDays(W0, 14);

    // Mark two different days inside W0
    toggle(habits as any, id, shiftDays(W0, 1));  // Tue
    toggle(habits as any, id, shiftDays(W0, 3));  // Thu

    // Mark one day in W1 and W2
    toggle(habits as any, id, shiftDays(W1, 2));
    toggle(habits as any, id, shiftDays(W2, 4));

    // Same-week double-mark should count as one for the range
    if (typeof (habits as any).countForRange === "function") {
      const cntW0 = (habits as any).countForRange(id, { from: W0, to: shiftDays(W0, 6) });
      expect(cntW0).toBe(1);

      const cntAll = (habits as any).countForRange(id, { from: W0, to: shiftDays(W2, 6) });
      expect(cntAll).toBe(3); // W0, W1, W2
    }

    if (typeof (habits as any).streak === "function") {
      const s = (habits as any).streak(id, shiftDays(W2, 6));
      expect(s.current).toBeGreaterThanOrEqual(3);
      expect(s.longest).toBeGreaterThanOrEqual(3);
    }
  });

  it("update renames a habit", () => {
    const r = habits.add({ name: "Old Name", cadence: "daily", active: true });
    expect(r.ok).toBe(true);
    const id = (r as any).id ?? (r as any).value?.id;

    const up = habits.update(id, { name: "New Name" });
    expect(up.ok ?? true).toBe(true);
    expect((habits.get(id) as Habit | null)?.name).toBe("New Name");
  });

  it("unarchive respects status and delete removes habit and data", () => {
    const r = habits.add({ name: "Temp", cadence: "daily", active: false });
    expect(r.ok).toBe(true);
    const id = (r as any).id ?? (r as any).value?.id;

    // Unarchive should succeed if no caps enforced by your design
    const ua = habits.unarchive(id);
    expect(ua.ok ?? true).toBe(true);
    expect(habits.list("active").some((h: Habit) => h.id === id)).toBe(true);

    // Add a check-in then delete
    toggle(habits as any, id, toDayStartMs(DAY_D));
    const del = habits.delete(id);
    expect(del.ok ?? true).toBe(true);

    expect(habits.get(id)).toBeFalsy();
    expect(habits.list("active").some((h: Habit) => h.id === id)).toBe(false);

    if (typeof (habits as any).countForRange === "function") {
      const n = (habits as any).countForRange(id, { from: DAY_A, to: DAY_D });
      expect(n).toBe(0);
    }
  });
});

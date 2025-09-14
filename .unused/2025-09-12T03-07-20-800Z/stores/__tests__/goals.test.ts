// src/stores/tests/goals.test.ts
import { describe, it, expect, beforeEach } from "vitest";

// Expected store API based on components:
// - makeGoalsStore({ storageKey? })
// - week: { list(weekStartMs), addIfFree(weekStartMs, text, max?), edit(id, text), remove(id) }
// - quarter: { list(quarterStartMs), addIfFree(quarterStartMs, text, max?), edit(id, text), remove(id), archive?(id), unarchive?(id) }
import { makeGoalsStore } from "@/stores/goals";

import { weekStartMs, shiftDays, yearStartMs, shiftMonths, monthStartMs } from "@/lib/time";

type WeeklyGoal = { id: string; text: string };
type QuarterlyGoal = { id: string; text: string; archived?: boolean };

// Helpers
const d = (y: number, m: number, day: number) =>
  new Date(y, m, day, 0, 0, 0, 0).getTime();

describe("goals store - weekly intentions", () => {
  // Wed Jan 15, 2025 anchor
  const ANCHOR = d(2025, 0, 15);

  let goals: ReturnType<typeof makeGoalsStore>;
  let WEEK_START_SAT: number;
  let NEXT_WEEK_START_SAT: number;

  beforeEach(() => {
    try {
      localStorage.clear?.();
    } catch {}
    goals = makeGoalsStore({ storageKey: "__test.goals__" });
    (goals as any).clearAll?.();

    WEEK_START_SAT = weekStartMs(ANCHOR, "Sat");
    NEXT_WEEK_START_SAT = shiftDays(WEEK_START_SAT, 7);
  });

  it("adds up to 3 weekly intentions and enforces cap", () => {
    const r1 = goals.week.addIfFree(WEEK_START_SAT, "Intention 1", 3);
    const r2 = goals.week.addIfFree(WEEK_START_SAT, "Intention 2", 3);
    const r3 = goals.week.addIfFree(WEEK_START_SAT, "Intention 3", 3);
    const r4 = goals.week.addIfFree(WEEK_START_SAT, "Overflow", 3); // should fail

    expect(r1.ok && r2.ok && r3.ok).toBe(true);
    expect(r4.ok).toBe(false);

    const list = goals.week.list(WEEK_START_SAT) as WeeklyGoal[];
    expect(list.length).toBe(3);
    expect(list.some((g) => g.text.includes("Intention 1"))).toBe(true);
  });

  it("edits and removes weekly intentions", () => {
    const r = goals.week.addIfFree(WEEK_START_SAT, "Edit me", 3);
    expect(r.ok).toBe(true);
    const id = (r as any).id ?? (r as any).value?.id;

    const e = goals.week.edit(id, "Edited");
    expect(e.ok ?? true).toBe(true);

    const afterEdit = goals.week.list(WEEK_START_SAT) as WeeklyGoal[];
    expect(afterEdit.find((g) => g.id === id)?.text).toBe("Edited");

    const del = goals.week.remove(id);
    expect(del.ok ?? true).toBe(true);

    const afterDel = goals.week.list(WEEK_START_SAT) as WeeklyGoal[];
    expect(afterDel.some((g) => g.id === id)).toBe(false);
  });

  it("keeps weeks isolated by start key", () => {
    goals.week.addIfFree(WEEK_START_SAT, "This week", 3);
    goals.week.addIfFree(NEXT_WEEK_START_SAT, "Next week", 3);

    const a = goals.week.list(WEEK_START_SAT) as WeeklyGoal[];
    const b = goals.week.list(NEXT_WEEK_START_SAT) as WeeklyGoal[];

    expect(a.some((g) => /This week/.test(g.text))).toBe(true);
    expect(a.some((g) => /Next week/.test(g.text))).toBe(false);
    expect(b.some((g) => /Next week/.test(g.text))).toBe(true);
  });
});

describe("goals store - quarterly intentions", () => {
  // Q1 2025 starts Jan 1; Q2 starts Apr 1
  const Y_START = yearStartMs(d(2025, 6, 10));
  const Q1 = monthStartMs(shiftMonths(Y_START, 0));  // Jan 1, 2025
  const Q2 = monthStartMs(shiftMonths(Y_START, 3));  // Apr 1, 2025

  let goals: ReturnType<typeof makeGoalsStore>;

  beforeEach(() => {
    try {
      localStorage.clear?.();
    } catch {}
    goals = makeGoalsStore({ storageKey: "__test.goals__" });
    (goals as any).clearAll?.();
  });

  it("adds up to 3 quarterly intentions and enforces cap", () => {
    const r1 = goals.quarter.addIfFree(Q1, "Q1 Goal A", 3);
    const r2 = goals.quarter.addIfFree(Q1, "Q1 Goal B", 3);
    const r3 = goals.quarter.addIfFree(Q1, "Q1 Goal C", 3);
    const r4 = goals.quarter.addIfFree(Q1, "Q1 Goal D", 3); // should fail

    expect(r1.ok && r2.ok && r3.ok).toBe(true);
    expect(r4.ok).toBe(false);

    const list = goals.quarter.list(Q1) as QuarterlyGoal[];
    expect(list.length).toBe(3);
  });

  it("keeps quarters isolated by start key", () => {
    goals.quarter.addIfFree(Q1, "Q1 only", 3);
    goals.quarter.addIfFree(Q2, "Q2 only", 3);

    const a = goals.quarter.list(Q1) as QuarterlyGoal[];
    const b = goals.quarter.list(Q2) as QuarterlyGoal[];

    expect(a.some((g) => /Q1 only/.test(g.text))).toBe(true);
    expect(a.some((g) => /Q2 only/.test(g.text))).toBe(false);
    expect(b.some((g) => /Q2 only/.test(g.text))).toBe(true);
  });

  it("edits and removes quarterly intentions when not archived", () => {
    const r = goals.quarter.addIfFree(Q1, "Change me", 3);
    expect(r.ok).toBe(true);
    const id = (r as any).id ?? (r as any).value?.id;

    expect((goals.quarter.edit(id, "Changed").ok ?? true)).toBe(true);
    const afterEdit = goals.quarter.list(Q1) as QuarterlyGoal[];
    expect(afterEdit.find((g) => g.id === id)?.text).toBe("Changed");

    expect((goals.quarter.remove(id).ok ?? true)).toBe(true);
    const afterDel = goals.quarter.list(Q1) as QuarterlyGoal[];
    expect(afterDel.some((g) => g.id === id)).toBe(false);
  });

  it("blocks edit/remove when archived (if archive API exists)", () => {
    const r = goals.quarter.addIfFree(Q1, "Freeze me", 3);
    expect(r.ok).toBe(true);
    const id = (r as any).id ?? (r as any).value?.id;

    // Optional archive API
    if (typeof goals.quarter.archive === "function") {
      const ar = goals.quarter.archive(id);
      expect(ar.ok ?? true).toBe(true);

      const e = goals.quarter.edit(id, "Should fail");
      const rm = goals.quarter.remove(id);

      expect(e.ok).toBe(false);
      expect(rm.ok).toBe(false);

      const cur = goals.quarter.list(Q1).find((g: QuarterlyGoal) => g.id === id)!;
      expect(cur.archived).toBe(true);
      expect(cur.text).toBe("Freeze me");

      if (typeof goals.quarter.unarchive === "function") {
        const ua = goals.quarter.unarchive(id);
        expect(ua.ok ?? true).toBe(true);

        const e2 = goals.quarter.edit(id, "Now editable");
        expect(e2.ok ?? true).toBe(true);
        const cur2 = goals.quarter.list(Q1).find((g: QuarterlyGoal) => g.id === id)!;
        expect(cur2.text).toBe("Now editable");
      }
    } else {
      // If no archive API is provided, at least the object should expose archived flag defaulting to false.
      const cur = goals.quarter.list(Q1).find((g: QuarterlyGoal) => g.id === id)!;
      expect(!!cur.archived).toBe(false);
    }
  });
});

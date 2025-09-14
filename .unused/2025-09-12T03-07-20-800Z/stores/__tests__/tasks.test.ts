// src/stores/tests/tasks.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import * as tasks from "../tasks";
import * as storage from "../storage";
import { toDayStartMs, shiftDays } from "../../lib/time";

function resetState() {
  // Hard reset the entire app state tree to a minimal shape the stores expect.
  storage.update((root: any) => {
    for (const k of Object.keys(root)) delete (root as any)[k];
    root.tasks = { tasks: {}, eisenhowerOrder: { ui: [], u: [], i: [], none: [] } };
    // other slices left empty; tasks store will lazily init if needed
  });
}

function addActive(text: string, day: number) {
  const r = tasks.add({ text, date: day });
  if (!r.ok || !r.data) throw new Error("seed add failed");
  return r.data!;
}

function addCompleted(text: string, day: number) {
  const t = addActive(text, day);
  const r = tasks.complete(t.id);
  if (!r.ok) throw new Error("seed complete failed");
  return t;
}

describe("tasks store — day cap and replacement semantics", () => {
  const D = toDayStartMs(Date.now());

  beforeEach(() => resetState());

  it("blocks add when 3 active and 0 completed", () => {
    addActive("A1", D);
    addActive("A2", D);
    addActive("A3", D);
    const r = tasks.add({ text: "A4", date: D });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("cap");
  });

  it("archives oldest completed to backlog when adding into a full day with completed present", () => {
    // Make day have: 3 active + 1 completed
    addActive("A1", D);
    addActive("A2", D);
    const c1 = addCompleted("C1", D); // completedAt older
    addActive("A3", D);               // restore active count to 3

    // Sanity
    let byDay = tasks.listByDay(D);
    let counts = countStates(byDay);
    expect(counts.active).toBe(3);
    expect(counts.completed).toBe(1);

    // Add new task → should archive oldest completed (c1) to backlog and insert new active
    const r = tasks.add({ text: "NEW", date: D });
    expect(r.ok).toBe(true);

    // Oldest completed moved to backlog (date === null), remained completed
    const c1After = tasks.get(c1.id)!;
    expect(c1After.date).toBeNull();
    expect(c1After.state).toBe("completed");

    // Day still has exactly 3 active rows
    byDay = tasks.listByDay(D);
    counts = countStates(byDay);
    expect(counts.active).toBe(3);
  });

  it("uncomplete is blocked if it would exceed 3 active", () => {
    // 3 active + 1 completed present
    addActive("A1", D);
    addActive("A2", D);
    addActive("A3", D);
    const c = addCompleted("C", D);

    const res = tasks.uncomplete(c.id);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("cap");
  });

  it("setDate uses same replacement rule when moving into a full day", () => {
    // Day D full with 3 active + 1 completed
    addActive("A1", D);
    addActive("A2", D);
    const c1 = addCompleted("C1", D);
    addActive("A3", D);

    // Prepare a task on another day to move in
    const D2 = shiftDays(D, 1);
    const mover = addActive("Mover", D2);

    const res = tasks.setDate(mover.id, D);
    expect(res.ok).toBe(true);

    // Oldest completed archived to backlog
    const c1After = tasks.get(c1.id)!;
    expect(c1After.date).toBeNull();
    expect(c1After.state).toBe("completed");

    // Mover is now active on D and D still has 3 active
    const byDay = tasks.listByDay(D);
    const counts = countStates(byDay);
    expect(counts.active).toBe(3);
  });

  it("completed tasks are read-only for text edits", () => {
    const t = addCompleted("Done", D);
    const res = tasks.setText(t.id, "New text");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("completed-immutable");
  });
});

describe("tasks store — rollover", () => {
  const TODAY = toDayStartMs(Date.now());
  const YESTERDAY = shiftDays(TODAY, -1);

  beforeEach(() => resetState());

  it("moves INCOMPLETE dated tasks to backlog and preserves completed", () => {
    const a1 = addActive("A1", YESTERDAY);
    const a2 = addActive("A2", YESTERDAY);
    const c1 = addCompleted("C1", YESTERDAY);

    const res = tasks.rolloverMove(YESTERDAY);
    expect(res.ok).toBe(true);
    const moved = res.data?.movedIds ?? [];
    // Two active moved
    expect(moved.sort()).toEqual([a1.id, a2.id].sort());

    // After rollover: A1/A2 in backlog, completed remains on yesterday
    const a1After = tasks.get(a1.id)!;
    const a2After = tasks.get(a2.id)!;
    const c1After = tasks.get(c1.id)!;

    expect(a1After.date).toBeNull();
    expect(a2After.date).toBeNull();
    expect(c1After.date).toBe(YESTERDAY);
    expect(c1After.state).toBe("completed");
  });
});

// ------------- helpers -------------
function countStates(list: tasks.Task[]) {
  let active = 0, completed = 0;
  for (const t of list) {
    if (t.state === "active") active++;
    if (t.state === "completed") completed++;
  }
  return { active, completed };
}

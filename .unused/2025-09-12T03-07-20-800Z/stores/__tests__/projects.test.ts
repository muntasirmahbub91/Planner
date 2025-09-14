// src/stores/tests/projects.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import * as projects from "../projects";
import * as tasks from "../tasks";
import * as storage from "../storage";
import { toDayStartMs } from "../../lib/time";

function resetState() {
  storage.update((root: any) => {
    for (const k of Object.keys(root)) delete (root as any)[k];
    root.projects = { projects: {} };
    root.tasks = { tasks: {}, eisenhowerOrder: { ui: [], u: [], i: [], none: [] } };
  });
}

function addActiveTask(text: string, day: number) {
  const r = tasks.add({ text, date: day });
  if (!r.ok || !r.data) throw new Error("seed add failed");
  return r.data!;
}

function addCompletedTask(text: string, day: number) {
  const t = addActiveTask(text, day);
  const r = tasks.complete(t.id);
  if (!r.ok) throw new Error("seed complete failed");
  return t;
}

describe("projects store — caps and archive", () => {
  beforeEach(() => resetState());

  it("adds up to 3 active projects then blocks with cap", () => {
    expect(projects.add("P1").ok).toBe(true);
    expect(projects.add("P2").ok).toBe(true);
    expect(projects.add("P3").ok).toBe(true);
    const r = projects.add("P4");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("cap");
  });

  it("archive makes project inactive and immutable to archive again", () => {
    const p = projects.add("X").data!;
    const r1 = projects.archive(p.id);
    expect(r1.ok).toBe(true);
    const r2 = projects.archive(p.id);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.reason).toBe("archived-immutable");
  });
});

describe("projects ↔ tasks sync — respects day cap and replacement", () => {
  const D = toDayStartMs(Date.now());

  beforeEach(() => resetState());

  it("propagates cap when day has 3 active and 0 completed", () => {
    // Day full with 3 active tasks
    addActiveTask("A1", D);
    addActiveTask("A2", D);
    addActiveTask("A3", D);

    const p = projects.add("FromProject").data!;
    const res = projects.syncToTasks(p.id, D);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("cap");
  });

  it("replaces oldest completed to schedule when day is full but has completed", () => {
    // 3 active + 1 completed
    addActiveTask("A1", D);
    addActiveTask("A2", D);
    const cOld = addCompletedTask("C1-old", D); // oldest completed
    addActiveTask("A3", D);

    const p = projects.add("FromProject").data!;
    const res = projects.syncToTasks(p.id, D);
    expect(res.ok).toBe(true);

    // Completed was archived to backlog
    const cAfter = tasks.get(cOld.id)!;
    expect(cAfter.state).toBe("completed");
    expect(cAfter.date).toBeNull();

    // Day still has 3 active rows
    const byDay = tasks.listByDay(D);
    const activeCount = byDay.filter(t => t.state === "active").length;
    expect(activeCount).toBe(3);
  });
});

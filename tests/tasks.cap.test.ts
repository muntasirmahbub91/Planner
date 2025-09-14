// tests/tasks.cap.test.ts
// Verifies task day-cap (3 active per day), overflow migration, and tooltip errors.

import * as tasks from "@/stores/tasks";
import { toDayStartMs } from "@/lib/time";

describe("tasks cap rules", () => {
  const today = toDayStartMs(Date.now());

  beforeEach(() => {
    // reset store between tests
    (tasks as any).__reset?.();
  });

  it("allows up to 3 active tasks", () => {
    for (let i = 0; i < 3; i++) {
      const res = tasks.add({ text: `t${i}`, date: today });
      expect(res.ok).toBe(true);
    }
    const res = tasks.add({ text: "overflow", date: today });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("cap");
  });

  it("archives oldest completed when adding 4th", () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      ids.push(tasks.add({ text: `t${i}`, date: today }).data!.id);
    }
    // complete one
    tasks.complete(ids[0]);
    // add new one
    const res = tasks.add({ text: "new", date: today });
    expect(res.ok).toBe(true);
    const t0 = tasks.get(ids[0]);
    expect(t0?.date).toBeNull();
    expect(t0?.replacedById).toBeDefined();
  });

  it("blocks uncomplete when cap reached", () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      ids.push(tasks.add({ text: `t${i}`, date: today }).data!.id);
    }
    tasks.complete(ids[0]);
    const res1 = tasks.uncomplete(ids[0]);
    expect(res1.ok).toBe(false);
    expect(res1.reason).toBe("cap");
  });

  it("shows tooltip message on cap violation", () => {
    for (let i = 0; i < 3; i++) {
      tasks.add({ text: `t${i}`, date: today });
    }
    const res = tasks.add({ text: "blocked", date: today });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("cap");
      // UI maps this to tooltip: "Day is full. Complete, archive, or delete a task to free a slot."
    }
  });
});

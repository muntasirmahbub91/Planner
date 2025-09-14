// tests/rollover.job.test.ts
// Validates rollover job: midnight trigger, manual jump, multi-tab mutex, rollback.

import { runRollover } from "@/jobs/rollover";
import { withLocalStorageMutex } from "@/lib/mutex";
import * as storage from "@/lib/storage";
import * as tasks from "@/stores/tasks";
import { toDayStartMs, shiftDays } from "@/lib/time";

jest.mock("@/lib/mutex", () => ({
  withLocalStorageMutex: jest.fn((key, ttl, fn) => fn())
}));

describe("rollover job", () => {
  beforeEach(() => {
    (tasks as any).__reset?.();
    localStorage.clear();
  });

  it("runs across midnight only once", () => {
    const today = toDayStartMs(Date.now());
    const yesterday = shiftDays(today, -1);

    tasks.add({ text: "a", date: yesterday });
    runRollover(today);
    const moved = tasks.listBacklog().some(t => t.rolledFromDate === yesterday);
    expect(moved).toBe(true);

    // second call same day → no-op
    runRollover(today);
    const backlogCount = tasks.listBacklog().length;
    runRollover(today);
    expect(tasks.listBacklog().length).toBe(backlogCount);
  });

  it("handles manual date jump", () => {
    const today = toDayStartMs(Date.now());
    const jump = shiftDays(today, -5);
    tasks.add({ text: "b", date: jump });
    runRollover(today);
    const rolled = tasks.listBacklog().some(t => t.rolledFromDate === jump);
    expect(rolled).toBe(true);
  });

  it("uses multi-tab mutex", () => {
    const spy = jest.spyOn(require("@/lib/mutex"), "withLocalStorageMutex");
    const today = toDayStartMs(Date.now());
    runRollover(today);
    expect(spy).toHaveBeenCalled();
  });

  it("rolls back on partial failure", () => {
    const today = toDayStartMs(Date.now());
    const yesterday = shiftDays(today, -1);
    const t = tasks.add({ text: "c", date: yesterday }).data!;

    // simulate failure inside rollover
    const orig = tasks.rolloverMove;
    (tasks as any).rolloverMove = () => { throw new Error("fail"); };

    expect(() => runRollover(today)).toThrow();

    // rollback → task still has yesterday date
    const stillThere = tasks.get(t.id);
    expect(stillThere?.date).toBe(yesterday);

    (tasks as any).rolloverMove = orig;
  });
});

// tests/undo.contract.test.ts
// Validates undo/redo contract: TTL expiry, compound undo, redo idempotency.

import * as undo from "@/lib/undo";
import * as tasks from "@/stores/tasks";
import { toDayStartMs } from "@/lib/time";

describe("undo contract", () => {
  beforeEach(() => {
    (undo as any).__reset?.();
    (tasks as any).__reset?.();
  });

  it("expires after TTL", () => {
    undo.record({ kind: "deleteTask", snapshot: { id: "x", text: "a" } } as any, 5);
    expect(undo.canUndo()).toBe(true);
    jest.advanceTimersByTime(10);
    expect(undo.canUndo()).toBe(false);
  });

  it("compound undo across multiple stores", () => {
    const day = toDayStartMs(Date.now());
    const t1 = tasks.add({ text: "A", date: day }).data!;
    const t2 = tasks.add({ text: "B", date: day }).data!;
    expect(t1 && t2).toBeTruthy();

    undo.withCompoundUndo(() => {
      tasks.deleteHard(t1.id);
      tasks.deleteHard(t2.id);
    }, { label: "Delete two" });

    expect(tasks.get(t1.id)?.state).toBe("deleted");
    expect(tasks.get(t2.id)?.state).toBe("deleted");

    undo.undo();
    expect(tasks.get(t1.id)?.state).not.toBe("deleted");
    expect(tasks.get(t2.id)?.state).not.toBe("deleted");
  });

  it("redo is idempotent", () => {
    const day = toDayStartMs(Date.now());
    const t = tasks.add({ text: "C", date: day }).data!;
    tasks.deleteHard(t.id);

    expect(tasks.get(t.id)?.state).toBe("deleted");

    undo.undo();
    expect(tasks.get(t.id)?.state).not.toBe("deleted");

    undo.redo();
    expect(tasks.get(t.id)?.state).toBe("deleted");

    // redoing again should not throw and state remains deleted
    undo.redo();
    expect(tasks.get(t.id)?.state).toBe("deleted");
  });
});

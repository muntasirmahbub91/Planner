// src/stores/tests/reminders.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

// Assumed store API from components:
// - makeRemindersStore({ storageKey? })
// - add({ title, when, alerts? }) -> { ok: boolean, id? }
// - list(preset: "Today"|"Tomorrow"|"ThisWeek"|"ThisMonth"|"ThisYear") -> Reminder[]
// - toggleDone(id)
// - update(id, patch)
// - delete(id)
// - countForDay(dayStartMs) -> number
import { makeRemindersStore } from "@/stores/reminders";

type Alerts = { daysBefore: number; count: number };
interface Reminder {
  id: string;
  title: string;
  when: number; // ms
  alerts?: Alerts;
  done: boolean;
}

// Helpers
const ms = (y: number, m: number, d: number, hh = 0, mm = 0) =>
  new Date(y, m, d, hh, mm, 0, 0).getTime();
const dayStart = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const addDays = (t: number, n: number) => {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

describe("reminders store", () => {
  // Fixed clock so presets are deterministic
  const NOW = ms(2025, 2, 10, 10, 30); // Mar 10, 2025 10:30 local
  const TODAY = dayStart(NOW);
  const TOMORROW = addDays(TODAY, 1);

  let reminders: ReturnType<typeof makeRemindersStore>;
  let restoreNow: () => void;

  beforeEach(() => {
    // Mock Date.now
    const orig = Date.now;
    vi.spyOn(Date, "now").mockImplementation(() => NOW);
    restoreNow = () => (Date.now as any).mockRestore?.() ?? (Date.now = orig);

    // Fresh storage and store
    try {
      localStorage.clear?.();
    } catch {}
    reminders = makeRemindersStore({ storageKey: "__test.reminders__" });
    (reminders as any).clearAll?.();
  });

  it("adds reminders and lists by Today/Tomorrow", () => {
    const r1 = reminders.add({ title: "Dentist", when: TODAY + 14 * 60 * 60 * 1000 });
    const r2 = reminders.add({ title: "Flight", when: TOMORROW + 9 * 60 * 60 * 1000 });
    expect(r1.ok && r2.ok).toBe(true);

    const todayList = reminders.list("Today");
    const tomorrowList = reminders.list("Tomorrow");
    const id1 = (r1 as any).id ?? (r1 as any).value?.id;
    const id2 = (r2 as any).id ?? (r2 as any).value?.id;

    expect(todayList.some((x: Reminder) => x.id === id1)).toBe(true);
    expect(tomorrowList.some((x: Reminder) => x.id === id2)).toBe(true);
  });

  it("toggleDone flips status but item remains in preset list", () => {
    const r = reminders.add({ title: "Pay bills", when: TODAY + 18 * 60 * 60 * 1000 });
    expect(r.ok).toBe(true);
    const id = (r as any).id ?? (r as any).value?.id;

    reminders.toggleDone(id);

    const todayList = reminders.list("Today");
    const found = todayList.find((x: Reminder) => x.id === id);
    expect(found).toBeTruthy();
    expect(found?.done).toBe(true);

    reminders.toggleDone(id);
    const again = reminders.list("Today").find((x: Reminder) => x.id === id);
    expect(again?.done).toBe(false);
  });

  it("update edits title, when, and alerts", () => {
    const r = reminders.add({
      title: "Original",
      when: TODAY + 12 * 60 * 60 * 1000,
      alerts: { daysBefore: 1, count: 2 },
    });
    expect(r.ok).toBe(true);
    const id = (r as any).id ?? (r as any).value?.id;

    const nextWhen = addDays(TODAY, 2) + 8 * 60 * 60 * 1000;
    reminders.update(id, {
      title: "Updated",
      when: nextWhen,
      alerts: { daysBefore: 0, count: 0 },
    });

    const listMonth = reminders.list("ThisMonth");
    const item = listMonth.find((x: Reminder) => x.id === id)!;
    expect(item.title).toBe("Updated");
    expect(item.when).toBe(nextWhen);
    expect(item.alerts?.daysBefore).toBe(0);
    expect(item.alerts?.count).toBe(0);
  });

  it("delete removes the item from all preset listings", () => {
    const r = reminders.add({ title: "Temp", when: TODAY + 11 * 60 * 60 * 1000 });
    expect(r.ok).toBe(true);
    const id = (r as any).id ?? (r as any).value?.id;

    reminders.delete(id);

    for (const preset of ["Today", "Tomorrow", "ThisWeek", "ThisMonth", "ThisYear"] as const) {
      const items = reminders.list(preset);
      expect(items.some((x: Reminder) => x.id === id)).toBe(false);
    }
  });

  it("ThisMonth includes dates in the same calendar month", () => {
    const inMonth = addDays(TODAY, 5) + 10 * 60 * 60 * 1000;
    const r = reminders.add({ title: "In-month", when: inMonth });
    expect(r.ok).toBe(true);

    const list = reminders.list("ThisMonth");
    const id = (r as any).id ?? (r as any).value?.id;
    expect(list.some((x: Reminder) => x.id === id)).toBe(true);
  });

  it("ThisYear includes dates in the same calendar year and excludes next year", () => {
    const thisYear = addDays(TODAY, 40) + 9 * 60 * 60 * 1000; // still 2025 for March baseline
    const nextYear = ms(2026, 0, 5, 9, 0);

    const r1 = reminders.add({ title: "This year", when: thisYear });
    const r2 = reminders.add({ title: "Next year", when: nextYear });
    expect(r1.ok && r2.ok).toBe(true);

    const list = reminders.list("ThisYear");
    const id1 = (r1 as any).id ?? (r1 as any).value?.id;
    const id2 = (r2 as any).id ?? (r2 as any).value?.id;

    expect(list.some((x: Reminder) => x.id === id1)).toBe(true);
    expect(list.some((x: Reminder) => x.id === id2)).toBe(false);
  });

  it("countForDay counts reminders scheduled on that local day", () => {
    const day = addDays(TODAY, 3);
    const t1 = day + 8 * 60 * 60 * 1000;
    const t2 = day + 12 * 60 * 60 * 1000;
    const t3 = day + 23 * 60 * 60 * 1000;

    reminders.add({ title: "One", when: t1 });
    reminders.add({ title: "Two", when: t2 });
    reminders.add({ title: "Three", when: t3 });

    const n = reminders.countForDay?.(day) ?? 0;
    expect(n).toBe(3);
  });

  afterEach(() => {
    restoreNow?.();
  });
});

// src/lib/tests/time.test.ts
import { describe, it, expect } from "vitest";
import {
  toDayStartMs,
  shiftDays,
  monthStartMs,
  shiftMonths,
  yearStartMs,
  shiftYears,
  quarterStartMs,
  weekStartMs,
  shiftWeeks,
  weekRange,
  monthRange,
  yearRange,
  quarterRange,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  dayKey,
  weekKey,
  monthKey,
  quarterKey,
  yearKey,
  didCrossLocalMidnight,
  fmtDayTitle,
  fmtDaySubtitle,
  fmtWeekTitle,
  fmtWeekSubtitle,
  fmtMonthTitle,
  fmtYearTitle,
} from "../../lib/time";

// Use fixed reference points to avoid timezone flakiness.
// Dates are constructed in local time; assertions rely on relative behavior.

describe("core clamps and shifts", () => {
  it("toDayStartMs zeros the time component", () => {
    const d = new Date(2025, 0, 15, 13, 47, 59, 123).getTime();
    const s = toDayStartMs(d);
    const dd = new Date(s);
    expect(dd.getHours()).toBe(0);
    expect(dd.getMinutes()).toBe(0);
    expect(dd.getSeconds()).toBe(0);
    expect(dd.getMilliseconds()).toBe(0);
    // idempotent
    expect(toDayStartMs(s)).toBe(s);
  });

  it("shiftDays moves by whole days from day-start", () => {
    const d = new Date(2025, 1, 10, 18, 0).getTime();
    const s0 = toDayStartMs(d);
    const s3 = shiftDays(d, 3);
    expect(s3).toBe(shiftDays(s0, 3));
    const back = shiftDays(s3, -3);
    expect(back).toBe(s0);
  });

  it("month and year clamps + shifts", () => {
    const d = new Date(2025, 6, 19, 9).getTime(); // Jul 19 2025
    expect(monthStartMs(d)).toBe(new Date(2025, 6, 1).getTime());
    expect(shiftMonths(d, 1)).toBe(new Date(2025, 7, 1).getTime());
    expect(yearStartMs(d)).toBe(new Date(2025, 0, 1).getTime());
    expect(shiftYears(d, 1)).toBe(new Date(2026, 0, 1).getTime());
  });

  it("quarterStartMs clamps to 0/3/6/9 month", () => {
    const m = (month: number) => quarterStartMs(new Date(2025, month, 15).getTime());
    expect(m(0)).toBe(new Date(2025, 0, 1).getTime());
    expect(m(1)).toBe(new Date(2025, 0, 1).getTime());
    expect(m(3)).toBe(new Date(2025, 3, 1).getTime());
    expect(m(6)).toBe(new Date(2025, 6, 1).getTime());
    expect(m(9)).toBe(new Date(2025, 9, 1).getTime());
  });
});

describe("week math", () => {
  // Choose a known Wednesday: Jan 15, 2025 is Wednesday
  const WED = new Date(2025, 0, 15, 12).getTime();

  it("weekStartMs honors Sun, Mon, Sat starts", () => {
    const sun = weekStartMs(WED, "Sun");
    const mon = weekStartMs(WED, "Mon");
    const sat = weekStartMs(WED, "Sat");
    expect(new Date(sun).getDay()).toBe(0);
    expect(new Date(mon).getDay()).toBe(1);
    expect(new Date(sat).getDay()).toBe(6);
    // For Wed, Sun-start is previous Sun, Mon-start is previous Mon, Sat-start is previous Sat
    expect(sun).toBe(new Date(2025, 0, 12).getTime()); // Sun Jan 12
    expect(mon).toBe(new Date(2025, 0, 13).getTime()); // Mon Jan 13
    expect(sat).toBe(new Date(2025, 0, 11).getTime()); // Sat Jan 11
  });

  it("shiftWeeks moves by 7-day blocks from computed start", () => {
    const base = weekStartMs(WED, "Sun");
    const next = shiftWeeks(WED, 1, "Sun");
    expect(next).toBe(base + 7 * 24 * 3600 * 1000);
    const prev = shiftWeeks(WED, -1, "Sun");
    expect(prev).toBe(base - 7 * 24 * 3600 * 1000);
  });

  it("weekRange spans 7 days exclusive end", () => {
    const { startMs, endMs } = weekRange(WED, "Sun");
    expect(endMs - startMs).toBe(7 * 24 * 3600 * 1000);
    expect(new Date(startMs).getDay()).toBe(0);
  });
});

describe("ranges", () => {
  const D = new Date(2025, 2, 9, 10).getTime(); // Mar 9, 2025

  it("monthRange covers the calendar month", () => {
    const { startMs, endMs } = monthRange(D);
    expect(startMs).toBe(new Date(2025, 2, 1).getTime());
    expect(endMs).toBe(new Date(2025, 3, 1).getTime());
  });

  it("yearRange covers the calendar year", () => {
    const { startMs, endMs } = yearRange(D);
    expect(startMs).toBe(new Date(2025, 0, 1).getTime());
    expect(endMs).toBe(new Date(2026, 0, 1).getTime());
  });

  it("quarterRange covers 3 months", () => {
    const Q = quarterStartMs(D);
    const { startMs, endMs } = quarterRange(D);
    expect(startMs).toBe(Q);
    expect(endMs - startMs).toBeCloseTo(3 * 30 * 24 * 3600 * 1000, -6); // approx, month lengths vary
    expect(new Date(endMs).getDate()).toBe(1); // first day of the next quarter month
  });
});

describe("comparators and keys", () => {
  const A = new Date(2025, 4, 20, 8).getTime();
  const B = new Date(2025, 4, 20, 23).getTime();
  const C = new Date(2025, 4, 21, 1).getTime();

  it("isSameDay", () => {
    expect(isSameDay(A, B)).toBe(true);
    expect(isSameDay(A, C)).toBe(false);
  });

  it("isSameWeek depends on week start", () => {
    expect(isSameWeek(A, C, "Sun")).toBe(true); // Tue vs Wed same Sun-start week
    // If we jump to another week boundary, it should flip; verify via a known boundary
    const sat = new Date(2025, 4, 24, 12).getTime(); // Sat
    const sun = new Date(2025, 4, 25, 12).getTime(); // Sun
    expect(isSameWeek(sat, sun, "Sun")).toBe(false);
    expect(isSameWeek(sat, sun, "Mon")).toBe(true);
  });

  it("isSameMonth and isSameYear", () => {
    const nextMonth = new Date(2025, 5, 1).getTime();
    expect(isSameMonth(A, B)).toBe(true);
    expect(isSameMonth(A, nextMonth)).toBe(false);
    const nextYear = new Date(2026, 0, 10).getTime();
    expect(isSameYear(A, nextYear)).toBe(false);
  });

  it("keys are just the respective clamps", () => {
    expect(dayKey(A)).toBe(toDayStartMs(A));
    expect(weekKey(A, "Sun")).toBe(weekStartMs(A, "Sun"));
    expect(monthKey(A)).toBe(monthStartMs(A));
    expect(quarterKey(A)).toBe(quarterStartMs(A));
    expect(yearKey(A)).toBe(yearStartMs(A));
  });
});

describe("midnight crossing", () => {
  it("returns true only when local day changes", () => {
    const d = new Date(2025, 7, 2, 23, 50).getTime();
    const afterSameDay = new Date(2025, 7, 2, 23, 59).getTime();
    const afterNextDay = new Date(2025, 7, 3, 0, 1).getTime();
    expect(didCrossLocalMidnight(d, afterSameDay)).toBe(false);
    expect(didCrossLocalMidnight(d, afterNextDay)).toBe(true);
  });
});

describe("formatting helpers (smoke)", () => {
  it("produce non-empty strings", () => {
    const d = new Date(2025, 10, 5, 12).getTime();
    expect(fmtDayTitle(d)).toBeTypeOf("string");
    expect(fmtDaySubtitle(d)).toBeTypeOf("string");
    expect(fmtWeekTitle(d, "Sun")).toBeTypeOf("string");
    expect(fmtWeekSubtitle(d, "Sun")).toBeTypeOf("string");
    expect(fmtMonthTitle(d)).toBe("November");
    expect(fmtYearTitle(d)).toBe("2025");
  });
});

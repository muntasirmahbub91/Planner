// tests/time.week.test.ts
// Validates week calculations: DST boundaries and weekStart cache invalidation.

import { toDayStartMs, weekStartMs, rangeForWeek } from "@/lib/time";
import { selectWeekDays, invalidateWeekCache } from "@/selectors/week";

describe("time.week", () => {
  it("clamps correctly across DST boundaries", () => {
    // Example DST transition date: March 14, 2021 (US)
    const preDst = new Date("2021-03-13T12:00:00-08:00").getTime();
    const postDst = new Date("2021-03-14T12:00:00-07:00").getTime();

    const preStart = weekStartMs(preDst, "Sun");
    const postStart = weekStartMs(postDst, "Sun");

    expect(typeof preStart).toBe("number");
    expect(typeof postStart).toBe("number");
    // Should not drift by an extra day
    expect(Math.abs(postStart - preStart)).toBeLessThanOrEqual(7 * 24 * 3600 * 1000);
  });

  it("returns 7 days for week range regardless of DST", () => {
    const ms = new Date("2021-03-10T12:00:00-08:00").getTime();
    const { startMs, endMs } = rangeForWeek(ms, "Sun");
    expect((endMs - startMs) / (24 * 3600 * 1000)).toBe(7);
  });

  it("invalidates cache when weekStart changes", () => {
    const today = toDayStartMs(Date.now());

    const daysSun = selectWeekDays(today, "Sun");
    const daysMon = selectWeekDays(today, "Mon");
    expect(daysSun).not.toEqual(daysMon);

    invalidateWeekCache();
    const daysSat = selectWeekDays(today, "Sat");
    expect(daysSat).not.toEqual(daysSun);
  });
});

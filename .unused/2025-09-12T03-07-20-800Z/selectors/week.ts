// src/selectors/week.ts
// Memoized selectors for weekly data. Cache key: wk:${weekStart}:${weekStartMs}

import { toDayStartMs, weekStartMs, rangeForWeek, WeekStart } from "@/lib/time";

type CacheEntry<T> = { version: number; value: T };
const cache: Record<string, CacheEntry<any>> = {};
let globalVersion = 0;

/** Invalidate memoization globally (e.g., when tasks revision changes). */
export function invalidateWeekCache() {
  globalVersion++;
}

/**
 * Generic memoizer keyed by weekStart and weekStartMs.
 */
function memoize<T>(weekStart: WeekStart, dayMs: number, fn: () => T): T {
  const start = weekStartMs(dayMs, weekStart);
  const key = `wk:${weekStart}:${start}`;
  const entry = cache[key];
  if (entry && entry.version === globalVersion) {
    return entry.value;
  }
  const value = fn();
  cache[key] = { version: globalVersion, value };
  return value;
}

/**
 * Example selector: get array of 7 day keys for this week.
 */
export function selectWeekDays(dayMs: number, weekStart: WeekStart): number[] {
  return memoize(weekStart, toDayStartMs(dayMs), () => {
    const { daysMs } = rangeForWeek(dayMs, weekStart);
    return daysMs;
  });
}

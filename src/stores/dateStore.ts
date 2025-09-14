import { useSyncExternalStore } from "react";

/** Utilities */
function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
export function todayMs() { return startOfDay(Date.now()); }

/** State */
let state = todayMs();
const subs = new Set<() => void>();
function emit() { subs.forEach(f => f()); }

/** Hook */
export function useDateStore() {
  return useSyncExternalStore(
    (h) => { subs.add(h); return () => subs.delete(h); },
    () => state,
    () => state
  );
}

/** Getters/Setters */
export function getMs() { return state; }
export function setMs(ms: number) {
  const v = startOfDay(ms);
  if (v !== state) { state = v; emit(); }
}
export function setToday() { setMs(todayMs()); }
export function shiftDays(n: number) { setMs(state + n * 86400000); }
export function prevDay() { shiftDays(-1); }
export function nextDay() { shiftDays(1); }

/** Aliases some components import */
export function prev() { prevDay(); }
export function next() { nextDay(); }

/** Formatters used around the app */
export function fmtDayTitle(ms: number) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(ms);
}
export function fmtDaySubtitle(ms: number) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit", month: "short", year: "numeric"
  }).format(ms);
}
export function fmtMonthTitle(ms: number) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(ms);
}
export function fmtYear(ms: number) {
  return new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(ms);
}

/** Default aggregate (optional) */
export default {
  useDateStore, getMs, setMs, setToday, todayMs,
  shiftDays, prevDay, nextDay, prev, next,
  fmtDayTitle, fmtDaySubtitle, fmtMonthTitle, fmtYear
};

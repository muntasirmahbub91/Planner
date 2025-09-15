// src/stores/dateStore.ts
import { create } from "zustand";

/* ========== Utilities (LOCAL timezone safe) ========== */
// Local epoch-day: number of days since 1970-01-01 in the user's local timezone.
export const epochDay = (d = new Date()) => {
  const ms = d.getTime();
  const tz = d.getTimezoneOffset() * 60_000; // minutes -> ms
  return Math.floor((ms - tz) / 86_400_000);
};

// Local midnight (ms since epoch) for a given epoch-day.
// Handles DST by using that day's own offset.
export const dayMs = (eDay: number) => {
  const utcMid = eDay * 86_400_000;
  const tz = new Date(utcMid).getTimezoneOffset() * 60_000;
  return utcMid + tz;
};

const msToEpochDay = (ms: number) => epochDay(new Date(ms));

/* ========== Formatters (accept epochDay) ========== */
export const fmtDayTitle = (eDay: number) =>
  new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(dayMs(eDay));
export const fmtDaySubtitle = (eDay: number) =>
  new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" })
    .format(dayMs(eDay));
export const fmtMonthTitle = (eDay: number) =>
  new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(dayMs(eDay));
export const fmtYear = (eDay: number) =>
  new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(dayMs(eDay));

/* ========== Store ========== */
type Follow = "today" | "dayview";
type S = {
  today: number;        // local epoch-day for real today
  selected: number;     // day shown in DayView
  followHabits: Follow; // habits anchor: today vs selected

  setSelected: (d: number) => void;
  setTodaySelected: () => void;
  next: () => void;
  prev: () => void;

  setFollowHabits: (f: Follow) => void;
};

export const useDateStore = create<S>()((set) => {
  const t = epochDay();
  return {
    today: t,
    selected: t,
    followHabits: "dayview", // habits follow DayView by default

    setSelected: (d) => set({ selected: d }),
    setTodaySelected: () => set({ selected: epochDay() }),
    next: () => set((s) => ({ selected: s.selected + 1 })),
    prev: () => set((s) => ({ selected: s.selected - 1 })),

    setFollowHabits: (f) => set({ followHabits: f }),
  };
});

/* ========== Midnight refresh of `today` (local) ========== */
function msUntilNextMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}
(function scheduleMidnightTick() {
  const tick = () => {
    const t = epochDay();
    const { today } = useDateStore.getState();
    if (today !== t) useDateStore.setState({ today: t });
    setTimeout(tick, msUntilNextMidnight());
  };
  setTimeout(tick, msUntilNextMidnight());
})();

/* ========== Convenience ========== */
export const getSelected = () => useDateStore.getState().selected;
export const setSelected = (d: number) => useDateStore.setState({ selected: d });
export const next = () => useDateStore.getState().next();
export const prev = () => useDateStore.getState().prev();
export const today = () => useDateStore.getState().today;

/* Habits anchor: last column = this value */
export const habitsAnchorDay = () => {
  const s = useDateStore.getState();
  return s.followHabits === "dayview" ? s.selected : s.today;
};

/* ========== Legacy shims (compat with old API) ========== */
export const setMs = (ms: number) =>
  useDateStore.setState({ selected: msToEpochDay(ms) });
export const getMs = () => dayMs(getSelected());
export const todayMs = () => dayMs(today());
export const shiftDays = (n: number) =>
  useDateStore.setState((s) => ({ selected: s.selected + n }));
export const prevDay = () => prev();
export const nextDay = () => next();

/* ========== Default aggregate (optional) ========== */
export default {
  useDateStore,
  epochDay,
  dayMs,
  fmtDayTitle,
  fmtDaySubtitle,
  fmtMonthTitle,
  fmtYear,
  getSelected,
  setSelected,
  next,
  prev,
  today,
  habitsAnchorDay,
  // legacy
  setMs,
  getMs,
  todayMs,
  shiftDays,
  prevDay,
  nextDay,
};

// src/stores/dateStore.ts
import { create } from "zustand";

/** Milliseconds in one nominal day. Do not assume civil days are exactly 24h. */
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Week anchor: 0=Sun .. 6=Sat. Keep 6 to match reminders preset. */
export const WEEK_START_DOW = 6;

/**
 * Convert various inputs into a Date (ms may be seconds if < 1e11).
 * Accepts number | string | Date.
 */
function toDate(input?: number | string | Date): Date {
  if (input instanceof Date) return new Date(input.getTime());
  if (typeof input === "number") {
    const ms = input < 1e11 ? input * 1000 : input;
    return new Date(ms);
  }
  if (typeof input === "string") return new Date(input);
  return new Date();
}

/**
 * epochDay:
 * Integer day index derived from the LOCAL calendar date but computed through UTC
 * to avoid DST-length drift. Stable across DST boundaries.
 *
 * Algorithm:
 *  - Take local Y/M/D from the given moment.
 *  - Compute Date.UTC(Y,M,D) and divide by 86400000.
 */
export function epochDay(input?: number | string | Date): number {
  const d = toDate(input);
  const Y = d.getFullYear();
  const M = d.getMonth();
  const D = d.getDate();
  const utcMidnight = Date.UTC(Y, M, D);
  return Math.floor(utcMidnight / DAY_MS);
}

/**
 * dayMs:
 * Map an epochDay back to the LOCAL midnight time in milliseconds.
 * Uses the UTC-derived date parts to reconstruct a local midnight, which
 * keeps a one-to-one mapping without DST drift.
 */
export function dayMs(eDay: number): number {
  const utc = new Date(eDay * DAY_MS); // UTC date corresponding to the epochDay
  const Y = utc.getUTCFullYear();
  const M = utc.getUTCMonth();
  const D = utc.getUTCDate();
  return new Date(Y, M, D).getTime(); // local midnight for that civil date
}

/** Add n days to an epochDay. */
export function addDays(eDay: number, n: number): number {
  return eDay + n;
}

/** Start of week (local midnight) containing anchorMs, using startDow anchor. */
export function weekStartMs(anchorMs: number, startDow = WEEK_START_DOW): number {
  const start = new Date(anchorMs);
  start.setHours(0, 0, 0, 0);
  const wd = start.getDay(); // local 0..6
  const offset = (wd - startDow + 7) % 7;
  return start.getTime() - offset * DAY_MS;
}

/** Inclusive-exclusive [start,end) interval for a civil day given epochDay. */
export function dayRangeMs(eDay: number): { start: number; end: number } {
  const start = dayMs(eDay);
  return { start, end: start + DAY_MS };
}

/** Store state */
type DateState = {
  /** Today as epochDay (updated only on explicit calls). */
  today: number;
  /** Selected day as epochDay. */
  selected: number;
  /** Set selected by epochDay. */
  setSelectedDay: (eDay: number) => void;
  /** Set selected from any ms. */
  setMs: (ms: number) => void;
  /** Jump to today. */
  selectToday: () => void;
};

function computeTodayEday(): number {
  return epochDay(Date.now());
}

/** Zustand store */
export const useDateStore = create<DateState>((set, get) => {
  const initial = computeTodayEday();
  return {
    today: initial,
    selected: initial,

    setSelectedDay(eDay) {
      set({ selected: eDay });
    },

    setMs(ms) {
      set({ selected: epochDay(ms) });
    },

    selectToday() {
      const t = computeTodayEday();
      set({ today: t, selected: t });
    },
  };
});

/** Convenience getters that do not re-render components. */
export function getSelectedEpochDay(): number {
  return useDateStore.getState().selected;
}
export function getSelectedMs(): number {
  return dayMs(useDateStore.getState().selected);
}

/** Optional: tick today at local midnight. Call once at app boot if desired. */
export function scheduleMidnightRollOver() {
  const now = Date.now();
  const d = new Date(now);
  d.setHours(24, 0, 0, 0); // next local midnight
  const delay = d.getTime() - now;
  setTimeout(() => {
    // Update today, keep selected unchanged unless it was equal to old today.
    const prevToday = useDateStore.getState().today;
    const newToday = computeTodayEday();
    useDateStore.setState((s) => ({
      today: newToday,
      selected: s.selected === prevToday ? newToday : s.selected,
    }));
    // Schedule next midnight
    scheduleMidnightRollOver();
  }, Math.max(1000, delay)); // minimum 1s safeguard
}

// src/lib/time.ts
// Local-time helpers. All return numbers (ms since epoch). Avoid Date objects in state.

export type WeekStart = "Sat" | "Sun" | "Mon";

const WEEKDAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES   = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_ABBR    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ---------- Core clamps and shifts ----------
export function toDayStartMs(ms?: number): number {
  const d = ms != null ? new Date(ms) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
}

export function shiftDays(ms: number, n: number): number {
  const d0 = toDayStartMs(ms);
  const d = new Date(d0);
  d.setDate(d.getDate() + n);
  return toDayStartMs(d.getTime());
}

export function monthStartMs(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
}

export function shiftMonths(ms: number, n: number): number {
  const m0 = monthStartMs(ms);
  const d = new Date(m0);
  d.setMonth(d.getMonth() + n);
  return monthStartMs(d.getTime());
}

export function yearStartMs(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
}

export function shiftYears(ms: number, n: number): number {
  const y0 = yearStartMs(ms);
  const d = new Date(y0);
  d.setFullYear(d.getFullYear() + n);
  return yearStartMs(d.getTime());
}

export function quarterStartMs(ms: number): number {
  const d = new Date(ms);
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1, 0, 0, 0, 0).getTime();
}

// ---------- Week math ----------
function weekStartIndex(ws: WeekStart): number {
  return ws === "Sun" ? 0 : ws === "Mon" ? 1 : 6; // Sat=6
}

export function weekStartMs(ms: number, weekStart: WeekStart): number {
  const dayStart = toDayStartMs(ms);
  const d = new Date(dayStart);
  const dow = d.getDay(); // 0..6, Sun=0
  const startIdx = weekStartIndex(weekStart);
  const diff = ((dow - startIdx + 7) % 7);
  return shiftDays(dayStart, -diff);
}

export function shiftWeeks(ms: number, n: number, weekStart: WeekStart): number {
  const w0 = weekStartMs(ms, weekStart);
  return shiftDays(w0, n * 7);
}

// ---------- Ranges (endMs exclusive) ----------
export function rangeForWeek(ms: number, weekStart: WeekStart): { startMs: number; endMs: number; daysMs: number[] } {
  const startMs = weekStartMs(ms, weekStart);
  const endMs = shiftDays(startMs, 7);
  const daysMs = Array.from({ length: 7 }, (_, i) => shiftDays(startMs, i));
  return { startMs, endMs, daysMs };
}

export function monthRange(ms: number): { startMs: number; endMs: number } {
  const startMs = monthStartMs(ms);
  return { startMs, endMs: shiftMonths(startMs, 1) };
}

export function yearRange(ms: number): { startMs: number; endMs: number } {
  const startMs = yearStartMs(ms);
  return { startMs, endMs: shiftYears(startMs, 1) };
}

export function quarterRange(ms: number): { startMs: number; endMs: number } {
  const startMs = quarterStartMs(ms);
  const d = new Date(startMs);
  const endMs = new Date(d.getFullYear(), d.getMonth() + 3, 1, 0, 0, 0, 0).getTime();
  return { startMs, endMs };
}

// ---------- Formatting helpers ----------
function pad2(n: number): string { return n < 10 ? `0${n}` : String(n); }

export function fmtDayTitle(ms: number): string {
  const d = new Date(ms);
  return WEEKDAY_NAMES[d.getDay()];
}

export function fmtDaySubtitle(ms: number): string {
  const d = new Date(ms);
  return `${pad2(d.getDate())} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`;
}

export function weekNumber(ms: number, weekStart: WeekStart): number {
  const y0 = yearStartMs(ms);
  const firstWeekStart = weekStartMs(y0, weekStart);
  const start = firstWeekStart <= y0 ? firstWeekStart : shiftWeeks(firstWeekStart, -1, weekStart);
  const days = Math.floor((toDayStartMs(ms) - start) / (24 * 3600 * 1000));
  return Math.floor(days / 7) + 1;
}

export function fmtWeekTitle(ms: number, weekStart: WeekStart): string {
  return `Wk ${weekNumber(ms, weekStart)}`;
}

export function fmtWeekSubtitle(ms: number, weekStart: WeekStart): string {
  const { startMs, endMs } = rangeForWeek(ms, weekStart);
  const s = new Date(startMs);
  const e = new Date(shiftDays(endMs, -1));
  const sPart = `${pad2(s.getDate())} ${MONTH_ABBR[s.getMonth()]}`;
  const ePart = `${pad2(e.getDate())} ${MONTH_ABBR[e.getMonth()]}`;
  return `${sPart} – ${ePart}`;
}

export function fmtMonthTitle(ms: number): string {
  const d = new Date(ms);
  return MONTH_NAMES[d.getMonth()];
}

export function fmtMonthSubtitle(todayMs: number): string {
  return fmtDaySubtitle(todayMs);
}

export function fmtYearTitle(ms: number): string {
  return String(new Date(ms).getFullYear());
}

export function fmtYearSubtitle(todayMs: number): string {
  return fmtDaySubtitle(todayMs);
}

// ---------- Comparators and keys ----------
export function isSameDay(a: number, b: number): boolean {
  return toDayStartMs(a) === toDayStartMs(b);
}
export function isSameWeek(a: number, b: number, weekStart: WeekStart): boolean {
  return weekStartMs(a, weekStart) === weekStartMs(b, weekStart);
}
export function isSameMonth(a: number, b: number): boolean {
  return monthStartMs(a) === monthStartMs(b);
}
export function isSameYear(a: number, b: number): boolean {
  return yearStartMs(a) === yearStartMs(b);
}

export function dayKey(ms: number): number { return toDayStartMs(ms); }
export function weekKey(ms: number, weekStart: WeekStart): number { return weekStartMs(ms, weekStart); }
export function monthKey(ms: number): number { return monthStartMs(ms); }
export function quarterKey(ms: number): number { return quarterStartMs(ms); }
export function yearKey(ms: number): number { return yearStartMs(ms); }

// ---------- Midnight crossing ----------
export function didCrossLocalMidnight(prevMs: number, nowMs: number): boolean {
  const p = toDayStartMs(prevMs);
  const n = toDayStartMs(nowMs);
  return n > p;
}

/** Compatibility helper: return Date clamped to local midnight. */
export function clampToLocalMidnight(ms: number | Date): Date {
  const t = typeof ms === "number" ? ms : (ms as Date).getTime();
  return new Date(toDayStartMs(t));
}

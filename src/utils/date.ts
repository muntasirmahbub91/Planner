export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
/** Returns the Saturday of the week containing `d` (local time). */
export function startOfWeekSaturday(d: Date): Date {
  const x = startOfDay(d);
  // getDay(): 0=Sun, 6=Sat
  const dow = x.getDay();
  // Offset to Saturday: if Sat (6) -> 0, Sun (0) -> -1, Mon (1) -> -2, ... Fri (5) -> -? etc.
  const toSat = dow === 6 ? 0 : -( (dow + 1) % 7 );
  return startOfDay(addDays(x, toSat));
}
export function endOfWeekFromStart(start: Date): Date {
  return startOfDay(addDays(start, 6));
}
export function yyyymmdd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function dayKeyMs(d: Date): number {
  return startOfDay(d).getTime();
}
export function formatRange(start: Date, end: Date): string {
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'short' });
  const year = end.getFullYear(); // show end-year
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${monthFmt.format(end)} ${year}`;
  }
  const d1 = `${start.getDate()} ${monthFmt.format(start)}`;
  const d2 = `${end.getDate()} ${monthFmt.format(end)} ${year}`;
  return `${d1} – ${d2}`;
}
export function shortWeekday(d: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(d);
}
export function shortDayLabel(d: Date): string {
  const m = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(d);
  return `${d.getDate()} ${m}`;
}

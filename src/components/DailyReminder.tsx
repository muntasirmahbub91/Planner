import React from "react";
import { useDateStore } from "@/stores/dateStore";
import { useReminders, toggleDone, remove } from "@/stores/remindersStore";

const DAY = 86_400_000;

/** Parse number|Date|ISO|"YYYY-MM-DD" to ms.
 * - If number looks like seconds (<1e11), multiply by 1000.
 * - "YYYY-MM-DD" → local midnight.
 * - Fallback: now.
 */
function toMsLocal(x: unknown): number {
  if (typeof x === "number" && Number.isFinite(x)) {
    const n = x > 0 && x < 1e11 ? x * 1000 : x; // seconds → ms
    return n > 0 ? n : Date.now();
  }
  if (x instanceof Date) return x.getTime();
  if (typeof x === "string") {
    const m = x.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime(); // local TZ
    const t = Date.parse(x);
    if (!Number.isNaN(t)) return t;
  }
  return Date.now();
}

/** Local-day key that’s DST-stable */
function localDayKey(ms: number): number {
  const offMin = new Date(ms).getTimezoneOffset();
  return Math.floor((ms - offMin * 60_000) / DAY);
}

export default function DailyReminder() {
  const selectedRaw = useDateStore((s: any) => s.selected);
  const all = (useReminders((s: any) => s.all) ?? []) as any[];

  const selectedMs = toMsLocal(selectedRaw);
  const selKey = localDayKey(selectedMs);

  const items = React.useMemo(
    () => all.filter((r: any) => localDayKey(toMsLocal(r?.when)) === selKey),
    [all, selKey]
  );

  const selDate = new Date(selectedMs);
  return (
    <div className="dailyReminders" style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Reminders</h3>
        <small>{selDate.toDateString()} • {items.length} item(s)</small>
      </div>

      {items.length === 0 ? (
        <div style={{ opacity: 0.7, paddingTop: 6 }}>No reminders for this local day.</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
          {items.map((r: any) => (
            <li key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #f6f6f6" }}>
              <input
                type="checkbox"
                checked={!!r.done}
                onChange={(e) => (toggleDone as any)(r.id, e.currentTarget.checked)}
              />
              <span style={{ flex: 1 }}>{r.title}</span>
              <button
                aria-label="Delete"
                onClick={() => (remove as any)(r.id)}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

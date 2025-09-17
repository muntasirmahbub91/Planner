import React, { useMemo, useState, useCallback } from "react";
import "./RemindersView.css";
import {
  useReminders,
  listAll as listAllRaw,
  remove as removeReminder,
  add,
  update,
  toggleDone,
} from "@/stores/remindersStore";

type Reminder = {
  id: string;
  title: string;
  when: number; // ms epoch
  done?: boolean;
  alerts?: { daysBefore: number; count: number } | null;
};

/* ---------- helpers ---------- */
function toLocalInput(ms: number) {
  const d = new Date(ms);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
function fromLocalInput(v: string) {
  return new Date(v).getTime();
}
function normalizeList(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (x && typeof x === "object") return Object.values(x);
  return [];
}
function coerceTitle(r: any): string {
  const t =
    r?.title ??
    r?.text ??
    r?.name ??
    r?.label ??
    r?.data?.title ??
    r?.data?.text ??
    null;
  if (typeof t === "string") return t;
  if (t && typeof t === "object") {
    for (const k of ["title", "text", "name", "label"]) {
      if (typeof t[k] === "string") return t[k];
    }
  }
  return "";
}
function coerceWhen(r: any): number {
  const v =
    r?.when ??
    r?.at ??
    r?.time ??
    r?.date ??
    r?.datetime ??
    r?.timestamp ??
    r?.data?.when ??
    r?.data?.time ??
    null;

  if (typeof v === "number") return v < 1e11 ? v * 1000 : v;
  if (typeof v === "string") {
    const p = Date.parse(v);
    if (Number.isFinite(p)) return p;
  }
  if (v && typeof v === "object") {
    const cand = v.value ?? v.iso ?? v.date ?? v.datetime ?? v.time;
    if (typeof cand === "number") return cand < 1e11 ? cand * 1000 : cand;
    if (typeof cand === "string") {
      const p = Date.parse(cand);
      if (Number.isFinite(p)) return p;
    }
  }
  return NaN;
}
function normalizeAlerts(a: any): { daysBefore: number; count: number } | null {
  if (!a) return null;
  const days = Number(a.daysBefore ?? a.days ?? a.startDays ?? 0) || 0;
  const cnt = Number(a.count ?? a.times ?? 0) || 0;
  return days > 0 && cnt > 0 ? { daysBefore: days, count: cnt } : null;
}
function remap(raw: any): Reminder {
  return {
    id: String(raw?.id ?? raw?._id ?? Math.random().toString(36).slice(2)),
    title: coerceTitle(raw),
    when: coerceWhen(raw),
    done: !!(raw?.done ?? raw?.completed ?? (raw?.status && String(raw.status).toLowerCase() === "done")),
    alerts: normalizeAlerts(raw?.alerts ?? raw?.notification ?? raw?.notifications),
  };
}
function alertsText(a?: Reminder["alerts"] | null) {
  if (!a) return "";
  const s1 = a.count > 1 ? "alerts" : "alert";
  const s2 = a.daysBefore > 1 ? "days" : "day";
  return `${a.count} ${s1} starting ${a.daysBefore} ${s2} before`;
}

/* ---------- component ---------- */
type RangePreset = "today" | "tomorrow" | "thisWeek" | "thisMonth" | "thisYear";
const PRESETS: RangePreset[] = ["today", "tomorrow", "thisWeek", "thisMonth", "thisYear"];
const LABEL: Record<RangePreset, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  thisWeek: "This Week",
  thisMonth: "This Month",
  thisYear: "This Year",
};
function listByPreset(now: number, p: RangePreset, all: Reminder[]) {
  const startOf = (d: Date) => (d.setHours(0, 0, 0, 0), d.getTime());
  const MS = 24 * 60 * 60 * 1000;
  const start = startOf(new Date(now));
  const ranges: Record<RangePreset, [number, number]> = {
    today: [start, start + MS],
    tomorrow: [start + MS, start + 2 * MS],
    thisWeek: [start, start + 7 * MS],
    thisMonth: [start, startOf(new Date(new Date(now).getFullYear(), new Date(now).getMonth() + 1, 1))],
    thisYear: [start, startOf(new Date(new Date(now).getFullYear() + 1, 0, 1))],
  };
  const [s, e] = ranges[p];
  return all.filter((r) => Number.isFinite(r.when) && r.when >= s && r.when < e);
}

export default function RemindersView() {
  const tick = useReminders(); // subscribe

  const [active, setActive] = useState<Set<RangePreset>>(new Set());
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // modal state
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<string>(toLocalInput(Date.now()));
  const [daysBefore, setDaysBefore] = useState(0);
  const [count, setCount] = useState(0);

  const togglePreset = (p: RangePreset) => {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  const items = useMemo(() => {
    const base = normalizeList(listAllRaw()).map(remap).sort((a, b) => (a.when || 0) - (b.when || 0));
    if (active.size === 0) return base;
    const now = Date.now();
    const map = new Map<string, Reminder>();
    for (const p of active) for (const r of listByPreset(now, p, base)) map.set(r.id, r);
    return Array.from(map.values()).sort((a, b) => (a.when || 0) - (b.when || 0));
  }, [active, tick]);

  function openAdd() {
    setEditId(null);
    setTitle("");
    setWhen(toLocalInput(Date.now()));
    setDaysBefore(0);
    setCount(0);
    setOpen(true);
  }
  function openEdit(id: string) {
    const r = items.find((x) => x.id === id);
    if (!r) return;
    setEditId(id);
    setTitle(r.title);
    setWhen(toLocalInput(Number.isFinite(r.when) ? r.when : Date.now()));
    setDaysBefore(r.alerts?.daysBefore ?? 0);
    setCount(r.alerts?.count ?? 0);
    setOpen(true);
  }
  function commit() {
    const t = title.trim();
    if (!t) return;
    const whenMs = when ? fromLocalInput(when) : Date.now();
    const alerts = daysBefore > 0 && count > 0 ? { daysBefore, count } : undefined;
    if (editId) update(editId, { title: t, when: whenMs, alerts });
    else add({ title: t, when: whenMs, alerts });
    setOpen(false);
  }

  const onToggle = useCallback((id: string, next?: boolean) => {
    try {
      // @ts-ignore support both signatures
      toggleDone(id, next);
    } catch {
      // @ts-ignore legacy implicit toggle
      toggleDone(id);
    }
  }, []);
  const onRemove = useCallback((id: string) => removeReminder(id), []);

  return (
    <div className="remv" style={{ padding: "12px 0 24px" }}>
      <h2 className="remv__title" style={{ margin: "0 0 8px", fontWeight: 800 }}>Reminders</h2>

      <div className="remv__filters" style={{ display: "flex", flexWrap: "wrap", gap: 8, background: "#f5f5f5", padding: 8, borderRadius: 12 }}>
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => togglePreset(p)}
            aria-pressed={active.has(p)}
            style={{ border: "1px solid #ddd", background: active.has(p) ? "#ffe8cc" : "#fff", borderRadius: 999, padding: "6px 12px" }}
          >
            {LABEL[p]}
          </button>
        ))}
      </div>

      <div style={{ margin: "10px 0" }}>
        <button
          type="button"
          onClick={openAdd}
          className="btn btn--primary"
          style={{ border: "1px solid #111", background: "#111", color: "#fff", borderRadius: 8, padding: "6px 12px" }}
        >
          Add reminder
        </button>
      </div>

      <div className="remv__list" style={{ display: "grid", gap: 8 }}>
        {items.length === 0 ? (
          <div className="empty" style={{ opacity: 0.6, textAlign: "center" }}>Empty</div>
        ) : (
          items.map((r) => {
            const whenText = Number.isFinite(r.when) ? new Date(r.when).toLocaleString() : "—";
            const alerts = alertsText(r.alerts);
            return (
              <div
                key={r.id}
                className="row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr auto",
                  gap: 8,
                  alignItems: "center",
                  border: "1px solid #eee",
                  borderRadius: 12,
                  background: "#fff",
                  padding: 8,
                }}
              >
                <button
                  className={`dot ${r.done ? "ok" : ""}`}
                  onClick={() => onToggle(r.id)}
                  style={{ width: 24, height: 24, borderRadius: 999, border: "1px solid #ccc", background: r.done ? "#e7f8ec" : "#fafafa" }}
                  title={r.done ? "Mark as not done" : "Mark as done"}
                >
                  {r.done ? "✓" : ""}
                </button>

                <div className="rowMain" style={{ display: "grid", gap: 2, minWidth: 0 }}>
                  <div className={`rowTitle ${r.done ? "done" : ""}`} style={{ fontWeight: 600, textDecoration: r.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.title || "(untitled)"}
                  </div>
                  <div className="rowMeta" style={{ fontSize: 12, opacity: 0.75 }}>
                    {whenText}{alerts ? " • " + alerts : ""}
                  </div>
                </div>

                <div className="rowBtns" style={{ display: "flex", gap: 6 }}>
                  <button className="chip" onClick={() => openEdit(r.id)} style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 999, padding: "4px 10px" }}>
                    Edit
                  </button>
                  <button className="chip danger" onClick={() => onRemove(r.id)} style={{ border: "1px solid #ffb3b3", background: "#fff", borderRadius: 999, padding: "4px 10px" }}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {open && (
        <div role="dialog" aria-modal="true" onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, minWidth: 480, maxWidth: 480, padding: 16 }}>
            <h3 style={{ margin: "0 0 8px" }}>{editId ? "Edit Reminder" : "Add Reminder"}</h3>
            <label style={{ display: "grid", gap: 4, margin: "6px 0" }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8 }} autoFocus />
            </label>
            <label style={{ display: "grid", gap: 4, margin: "6px 0" }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>Date & Time</span>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8 }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Days before</span>
                <input type="number" min="0" value={daysBefore} onChange={(e) => setDaysBefore(parseInt(e.target.value || "0", 10))} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8 }} />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Count</span>
                <input type="number" min="0" value={count} onChange={(e) => setCount(parseInt(e.target.value || "0", 10))} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8 }} />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <button onClick={() => setOpen(false)} style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 8, padding: "6px 10px" }}>
                Cancel
              </button>
              <button onClick={commit} style={{ border: "1px solid #111", background: "#111", color: "#fff", borderRadius: 8, padding: "6px 10px" }}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

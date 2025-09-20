import React, { useMemo, useState, useCallback } from "react";
import { useReminders, type Reminder } from "@/stores/remindersStore";

/** tiny UI bits */
const Field = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 10, ...(p.style || {}) }} />
);

export default function RemindersView() {
  const byId = useReminders((s) => s.byId);
  const order = useReminders((s) => s.order);
  const add = useReminders((s) => s.add);
  const update = useReminders((s) => s.update);
  const remove = useReminders((s) => s.remove);
  const toggle = useReminders((s) => s.toggle);

  const reminders = useMemo(
    () => order.map((id) => byId[id]).filter(Boolean).sort((a, b) => (a!.atMs - b!.atMs)) as Reminder[],
    [order, byId]
  );

  /** create/edit modal state */
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<string>("");
  const [winDays, setWinDays] = useState<number>(7);

  const openCreate = useCallback(() => {
    const t = new Date();
    t.setMinutes(0, 0, 0);
    setEditingId(null);
    setTitle("");
    setWhen(toLocalDateTime(t.getTime()));
    setWinDays(7);
    setOpen(true);
  }, []);

  const openEdit = useCallback((r: Reminder) => {
    setEditingId(r.id);
    setTitle(r.title);
    setWhen(toLocalDateTime((r.snoozeMs ?? r.atMs)));
    setWinDays(r.windowDays);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const commit = useCallback(() => {
    const t = title.trim();
    const atMs = fromLocalDateTime(when);
    const days = Math.max(1, Number(winDays) || 1);
    if (!t || !Number.isFinite(atMs)) return;

    if (editingId) {
      update(editingId, { title: t, atMs, windowDays: days });
    } else {
      add({ title: t, atMs, windowDays: days });
    }
    setOpen(false);
  }, [title, when, winDays, editingId, add, update]);

  return (
    <section aria-label="Reminders View" style={{ display: "grid", gap: 12 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
        <h3 style={{ margin: 0, fontWeight: 800 }}>Reminders</h3>
        <button onClick={openCreate} style={btnPri}>Add</button>
      </header>

      {reminders.length === 0 ? (
        <div style={{ opacity: 0.6 }}>No reminders yet</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {reminders.map((r) => (
            <div key={r.id} style={row}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={!!r.done} onChange={() => toggle(r.id)} />
                <span style={{ fontWeight: 600, textDecoration: r.done ? "line-through" : "none" }}>{r.title}</span>
              </label>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {fmtDateTime(r.snoozeMs ?? r.atMs)} · show ±{r.windowDays}d
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openEdit(r)} style={btnSec}>Edit</button>
                <button onClick={() => remove(r.id)} style={btnDel}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div style={modal}>
          <div style={modalCard}>
            <h4 style={{ margin: "0 0 12px" }}>{editingId ? "Edit reminder" : "Add reminder"}</h4>
            <div style={{ display: "grid", gap: 10, minWidth: 320 }}>
              <Field
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Reminder title…"
                aria-label="Reminder title"
                maxLength={80}
                autoFocus
              />
              <Field
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                aria-label="When"
              />
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Show for (days)</span>
                <Field
                  type="number"
                  min={1}
                  max={365}
                  value={winDays}
                  onChange={(e) => setWinDays(Math.max(1, Number(e.target.value) || 1))}
                  aria-label="Show for N days"
                />
              </label>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={commit} style={btnPri} disabled={!title.trim()}>Save</button>
                <button onClick={close} style={btnSec}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* --- utils + styles --- */
const toLocalDateTime = (ms: number) => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalDateTime = (s: string) => {
  const d = new Date(s);
  const t = d.getTime();
  if (!Number.isFinite(t)) throw new Error("Invalid date/time");
  return t;
};
const fmtDateTime = (ms: number) =>
  new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(ms));

const row: React.CSSProperties = { border: "1px solid #eee", borderRadius: 12, padding: 10, display: "grid", gap: 6 };
const btnPri: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 700 };
const btnSec: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", fontWeight: 600 };
const btnDel: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid #ffb3b3", background: "#fff", color: "#b00020", fontWeight: 700 };
const modal: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.2)", display: "grid", placeItems: "center" };
const modalCard: React.CSSProperties = { background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 8px 30px rgba(0,0,0,.08)" };

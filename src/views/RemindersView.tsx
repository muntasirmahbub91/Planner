import React, { useMemo, useState } from "react";
import {
  useReminders,
  listAll,
  listByPreset,
  add,
  update,
  remove,
  toggleDone,
  type RangePreset,
} from "@/stores/remindersStore";
import "./RemindersView.css";

function toLocalInput(ms: number) {
  const d = new Date(ms);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
function fromLocalInput(v: string) {
  return new Date(v).getTime();
}

const PRESETS: RangePreset[] = ["today", "tomorrow", "thisWeek", "thisMonth", "thisYear"];
const LABEL: Record<RangePreset, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  thisWeek: "ThisWeek",
  thisMonth: "ThisMonth",
  thisYear: "ThisYear",
};

export default function RemindersView() {
  // subscribe and use the returned value as a change tick for memos
  const tick = useReminders();

  const [active, setActive] = useState<Set<RangePreset>>(new Set());
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // modal state
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<string>(toLocalInput(Date.now()));
  const [daysBefore, setDaysBefore] = useState(0);
  const [count, setCount] = useState(0);

  function togglePreset(p: RangePreset) {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  const items = useMemo(() => {
    if (active.size === 0) return listAll().slice().sort((a, b) => a.when - b.when);
    const now = Date.now();
    const map = new Map<string, ReturnType<typeof listAll>[number]>();
    for (const p of active) for (const r of listByPreset(now, p)) map.set(r.id, r);
    return Array.from(map.values()).sort((a, b) => a.when - b.when);
  }, [active, tick]); // recompute when filters OR store change

  function openAdd() {
    setEditId(null);
    setTitle("");
    setWhen(toLocalInput(Date.now()));
    setDaysBefore(0);
    setCount(0);
    setOpen(true);
  }
  function openEdit(id: string) {
    const r = listAll().find((x) => x.id === id);
    if (!r) return;
    setEditId(id);
    setTitle(r.title);
    setWhen(toLocalInput(r.when));
    setDaysBefore(r.alerts?.daysBefore ?? 0);
    setCount(r.alerts?.count ?? 0);
    setOpen(true);
  }
  function commit() {
    const t = title.trim();
    if (!t) return;
    const whenMs = when ? fromLocalInput(when) : Date.now();
    const alerts = daysBefore > 0 && count > 0 ? { daysBefore, count } : null;
    editId ? update(editId, { title: t, when: whenMs, alerts }) : add({ title: t, when: whenMs, alerts });
    setOpen(false);
  }

  return (
    <div className="remv">
      <h2 className="remv__title">Reminders</h2>

      <div className="remv__filters">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => togglePreset(p)}
            aria-pressed={active.has(p)}
            className={`preset ${active.has(p) ? "is-active" : ""}`}
          >
            {LABEL[p]}
          </button>
        ))}
      </div>

      <div className="remv__add">
        <button type="button" onClick={openAdd} className="btn btn--primary">
          Add reminder
        </button>
      </div>

      <div className="remv__list">
        {items.length === 0 ? (
          <div className="empty">Empty</div>
        ) : (
          items.map((r) => (
            <div key={r.id} className="remRow">
              <button className={`remDot ${r.done ? "is-ok" : ""}`} onClick={() => toggleDone(r.id)}>
                {r.done ? "✓" : ""}
              </button>
              <div className="remRow__main">
                <div className={`remRow__title ${r.done ? "is-done" : ""}`}>{r.title}</div>
                <div className="remRow__meta">{new Date(r.when).toLocaleString()}</div>
              </div>
              <div className="remRow__btns">
                <button className="chip" onClick={() => openEdit(r.id)}>
                  Edit
                </button>
                <button className="chip danger" onClick={() => remove(r.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {open && (
        <div role="dialog" aria-modal="true" onClick={() => setOpen(false)} className="modalMask">
          <div onClick={(e) => e.stopPropagation()} className="modalCard">
            <h3 className="modalTitle">{editId ? "Edit Reminder" : "Add Reminder"}</h3>

            <label className="field">
              <span className="field__label">Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" autoFocus />
            </label>

            <label className="field">
              <span className="field__label">Date &amp; Time</span>
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="input"
              />
            </label>

            <div className="formGrid">
              <label className="field">
                <span className="field__label">Days before</span>
                <input
                  type="number"
                  min="0"
                  value={daysBefore}
                  onChange={(e) => setDaysBefore(parseInt(e.target.value || "0"))}
                  className="input"
                />
              </label>
              <label className="field">
                <span className="field__label">Count</span>
                <input
                  type="number"
                  min="0"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value || "0"))}
                  className="input"
                />
              </label>
            </div>

            <div className="formActions">
              <button onClick={() => setOpen(false)} className="btn">
                Cancel
              </button>
              <button onClick={commit} className="btn btn--primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

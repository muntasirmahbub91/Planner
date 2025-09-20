// src/sections/TasksSection.tsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useDateStore, dayMs, DAY_MS } from "@/stores/dateStore";
import { useTasks } from "@/stores/tasksStore";
import type { Task } from "@/domain/types";
import AddButton from "@/components/AddButton";
import ToggleButton from "@/components/ToggleButton";
import Modal from "@/components/Modal";

/* helpers */
function toDateInputValue(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromDateInputValue(v: string) {
  const [y, m, d] = v.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
}

export default function TasksSection() {
  const selectedEpochDay = useDateStore((s) => s.selected);
  const startMs = dayMs(selectedEpochDay);
  const endMs = startMs + DAY_MS;

  /* subscribe to primitive slices only */
  const byId = useTasks((s) => s.byId);
  const order = useTasks((s) => s.order);
  const addTask = useTasks((s) => s.add);
  const updateTask = useTasks((s) => s.update);

  /* derive lists in-mem to avoid array selectors in the hook */
  const items: Task[] = useMemo(
    () =>
      order
        .map((id) => byId[id])
        .filter(Boolean)
        .filter((t: Task) => t.dueMs != null && t.dueMs >= startMs && t.dueMs < endMs) as Task[],
    [order, byId, startMs, endMs]
  );

  const { active, completed } = useMemo(() => {
    const isDone = (t: Task) => !!t.done;
    return {
      active: items.filter((t) => !isDone(t)).slice(0, 3),
      completed: items.filter(isDone).sort((x, y) => (y.completedAt ?? 0) - (x.completedAt ?? 0)),
    };
  }, [items]);

  /* modal */
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dateVal, setDateVal] = useState<string>(toDateInputValue(startMs));
  const [urgent, setUrgent] = useState(false);
  const [important, setImportant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const openPicker = useCallback(() => {
    const el = dateRef.current;
    if (!el) return;
    (el as any).showPicker?.() ?? el.click();
    el.focus();
  }, []);

  useEffect(() => {
    if (open) queueMicrotask(() => titleRef.current?.focus());
  }, [open]);

  useEffect(() => {
    setDateVal(toDateInputValue(startMs));
  }, [startMs]);

  const openModal = useCallback(() => {
    setTitle("");
    setUrgent(false);
    setImportant(false);
    setError(null);
    setDateVal(toDateInputValue(startMs));
    setOpen(true);
  }, [startMs]);

  const closeModal = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  const commitAdd = useCallback(() => {
    const text = title.trim();
    if (!text) return;
    if (active.length >= 3) {
      setError("Daily limit reached (3 active).");
      return;
    }
    try {
      const dueMs = fromDateInputValue(dateVal);
      addTask({ title: text, dueMs, urgent, important });
      setOpen(false);
      setTitle("");
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Could not add task.");
    }
  }, [title, dateVal, urgent, important, active.length, addTask]);

  const onKeys: React.KeyboardEventHandler = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitAdd();
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
    },
    [commitAdd, closeModal]
  );

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0 8px" }}>
        <h3 style={{ margin: 0, textTransform: "uppercase", marginTop: 40 }}>TASKS</h3>
        <AddButton aria-label="Add task" onClick={openModal} title="Add task" />
      </div>

      {active.length === 0 ? (
        <div style={{ opacity: 0.6 }}>No tasks for this day</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {active.map((t) => {
            const done = !!t.done;
            const toggle = () => updateTask(t.id, { done: !done, completedAt: !done ? Date.now() : undefined });
            const clear = () => updateTask(t.id, { dueMs: null });
            return (
              <div key={t.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 8, alignItems: "center" }}>
                <ToggleButton checked={done} onChange={toggle} />
                <div>
                  <div style={{ fontWeight: 600, textDecoration: done ? "line-through" : "none" }}>{t.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{t.urgent ? "🔥" : ""}{t.important ? "⭐" : ""}</div>
                </div>
                <button onClick={clear} style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 8, padding: "4px 8px" }}>
                  Clear date
                </button>
              </div>
            );
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>Completed today</div>
          <div style={{ display: "grid", gap: 6 }}>
            {completed.map((t) => (
              <div key={t.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 8, alignItems: "center", opacity: 0.7 }}>
                <ToggleButton checked readOnly />
                <div style={{ textDecoration: "line-through" }}>{t.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={open} onClose={closeModal} title="Add task">
        <div onKeyDown={onKeys} style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title…"
            aria-label="Task title"
            maxLength={50}
            style={{ flex: "1 1 100%", padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 10 }}
          />
          <input
            ref={dateRef}
            type="date"
            value={dateVal}
            onChange={(e) => setDateVal(e.target.value)}
            aria-label="Date"
            style={{ position: "fixed", left: -9999, top: -9999, opacity: 0, width: 1, height: 1 }}
          />
          <button type="button" onClick={openPicker} aria-label="Pick date" style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}>
            📅
          </button>
          <button type="button" aria-pressed={urgent} onClick={() => setUrgent((v) => !v)} title="Urgent" style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #d1d5db", background: urgent ? "#fee2e2" : "#fff", cursor: "pointer", fontWeight: 700 }}>
            U
          </button>
          <button type="button" aria-pressed={important} onClick={() => setImportant((v) => !v)} title="Important" style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #d1d5db", background: important ? "#fef9c3" : "#fff", cursor: "pointer", fontWeight: 700 }}>
            I
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={commitAdd} disabled={!title.trim()} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 800, cursor: title.trim() ? "pointer" : "not-allowed" }}>
              Save
            </button>
            <button onClick={closeModal} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "#fff", fontWeight: 700 }}>
              Cancel
            </button>
          </div>
          {error && <div style={{ flexBasis: "100%", color: "#b00020", fontSize: 12 }}>{error}</div>}
        </div>
      </Modal>
    </section>
  );
}

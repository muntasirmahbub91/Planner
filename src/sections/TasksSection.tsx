// src/sections/TasksSection.tsx — outlined card, full logic kept
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useDateStore, dayMs, DAY_MS } from "@/stores/dateStore";
import { useTasks } from "@/stores/tasksStore";
import type { Task } from "@/domain/types";
import AddButton from "@/components/AddButton";
import ToggleButton from "@/components/ToggleButton";
import Modal from "@/components/Modal";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

/* date helpers */
function toYmdFromMs(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function ymdToMs(v: string) {
  const [y, m, d] = v.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
}
function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TasksSection() {
  const selectedEpochDay = useDateStore((s) => s.selected);
  const startMs = dayMs(selectedEpochDay);
  const endMs = startMs + DAY_MS;

  // store slices
  const byId = useTasks((s) => s.byId);
  const order = useTasks((s) => s.order);
  const addTask = useTasks((s) => s.add);
  const updateTask = useTasks((s) => s.update);

  // derive for selected day
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

  // modal state
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dateVal, setDateVal] = useState<string>(toYmdFromMs(startMs));
  const [urgent, setUrgent] = useState(false);
  const [important, setImportant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  // open/close
  const openModal = useCallback(() => {
    setTitle("");
    setUrgent(false);
    setImportant(false);
    setError(null);
    setDateVal(toYmdFromMs(startMs));
    setOpen(true);
  }, [startMs]);

  const closeModal = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  // commit add
  const commitAdd = useCallback(() => {
    const text = title.trim();
    if (!text) return;
    if (active.length >= 3) {
      setError("Daily limit reached (3 active).");
      return;
    }
    try {
      const dueMs = ymdToMs(dateVal);
      addTask({ title: text, dueMs, urgent, important });
      setOpen(false);
      setTitle("");
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to add task.");
    }
  }, [title, dateVal, urgent, important, addTask, active.length]);

  // focus title
  useEffect(() => {
    if (open) queueMicrotask(() => titleRef.current?.focus());
  }, [open]);

  // keep date synced with selected day
  useEffect(() => {
    setDateVal(toYmdFromMs(startMs));
  }, [startMs]);

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
        background: "#fcf7d5ff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "4px 0 12px",
        }}
      >
        <h3 style={{ margin: 0, textTransform: "uppercase" }}>TASKS</h3>
        <AddButton aria-label="Add task" onClick={openModal} title="Add task" />
      </div>

      {active.length === 0 ? (
        <div style={{ opacity: 0.6 }}>No tasks for this day</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {active.map((t) => {
            const done = !!t.done;
            const toggle = () =>
              updateTask(t.id, { done: !done, completedAt: !done ? Date.now() : undefined });
            const clear = () => updateTask(t.id, { dueMs: null });
            return (
              <div
                key={t.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr auto",
                  gap: 8,
                  alignItems: "center",
                  border: "1px solid #e5e7eb",
                  background: "#f4d9b4ff",
                  borderRadius: 12,
                  padding: "8px 10px",
                }}
              >
                <ToggleButton checked={done} onChange={toggle} />
                <div>
                  <div style={{ fontWeight: 600, textDecoration: done ? "line-through" : "none" }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {t.urgent ? "🔥" : ""}
                    {t.important ? "⭐" : ""}
                  </div>
                </div>
                <button
                  onClick={clear}
                  style={{
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    borderRadius: 8,
                    padding: "4px 8px",
                    cursor: "pointer",
                  }}
                >
                  Clear date
                </button>
              </div>
            );
          })}
        </div>
      )}

      {completed.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>Completed</div>
          <div style={{ display: "grid", gap: 6 }}>
            {completed.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  border: "1px dashed #e5e7eb",
                  background: "#fafafa",
                  borderRadius: 10,
                  padding: "6px 8px",
                }}
              >
                ✅ <div style={{ textDecoration: "line-through" }}>{t.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={open} onClose={closeModal} title="Add task">
        <div style={{ display: "grid", gap: 12 }}>
          {error ? (
            <div
              role="alert"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#991b1b",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : null}

          {/* Title + flags */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title…"
              aria-label="Task title"
              maxLength={50}
              style={{
                flex: "1 1 100%",
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
              }}
            />
            <button
              type="button"
              title="Urgent"
              aria-pressed={urgent}
              onClick={() => setUrgent((v) => !v)}
              style={{
                width: 36,
                height: 36,
                border: "1px solid #e5e7eb",
                background: urgent ? "#fee2e2" : "#fff",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              U
            </button>
            <button
              type="button"
              title="Important"
              aria-pressed={important}
              onClick={() => setImportant((v) => !v)}
              style={{
                width: 36,
                height: 36,
                border: "1px solid #e5e7eb",
                background: important ? "#fef9c3" : "#fff",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              I
            </button>
          </div>

          {/* Inline calendar */}
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "#fff",
              boxShadow: "0 10px 30px rgba(0,0,0,.06)",
              padding: 8,
            }}
          >
            <DayPicker
              mode="single"
              weekStartsOn={1}
              selected={new Date(dateVal)}
              onSelect={(d) => {
                if (!d) return;
                setDateVal(toYmd(d));
              }}
            />
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>Selected: {dateVal}</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={commitAdd}
              disabled={!title.trim()}
              style={{
                border: "1px solid #16a34a",
                background: "#22c55e",
                color: "#fff",
                borderRadius: 10,
                padding: "10px 14px",
                fontWeight: 800,
                cursor: title.trim() ? "pointer" : "not-allowed",
              }}
            >
              Save
            </button>
            <button
              onClick={closeModal}
              style={{
                border: "1px solid #e5e7eb",
                background: "#ab7171ff",
                borderRadius: 10,
                padding: "10px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

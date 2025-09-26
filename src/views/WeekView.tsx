// src/views/WeekView.tsx
import "./WeekView.css";
import React, { useMemo, useState, useCallback } from "react";
import AddButton from "@/components/AddButton";
import ToggleButton from "@/components/ToggleButton";
import Modal from "@/components/Modal";
import { useDateStore, WEEK_START_DOW, weekStartMs } from "@/stores/dateStore";
import { useWeeklyGoals, getWeek, setGoal, toggleGoal, clearGoal } from "@/stores/weeklyGoals";
import { useTasks } from "@/stores/tasksStore";
import type { Task } from "@/domain/types";

/* constants */
const DND_MIME = "application/x-plannerx-task";
const DAY = 24 * 60 * 60 * 1000;

/* utils */
const atStart = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const addDays = (anchor: Date, n: number) => new Date(anchor.getTime() + n * DAY);
const isDone = (t: Partial<Task>) => !!t.done;
const dowClass = (d: Date) => ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];
const fmtBadgeDay = (d: Date) => new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d).toUpperCase();

/* CHANGED: short month label -> “21 Sept” */
const MMM = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
const fmtBadgeDate = (d: Date) => `${d.getDate()} ${MMM[d.getMonth()]}`;

const fmtSubTitle = (d: Date) =>
  `${d.getDate()} ${new Intl.DateTimeFormat(undefined, { month: "long" }).format(d).toUpperCase()}, ${d.getFullYear()}`;

export default function WeekView(): JSX.Element {
  useWeeklyGoals(); // subscribe

  /* anchor week */
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const weekStart = useMemo(() => weekStartMs(anchor.getTime(), WEEK_START_DOW), [anchor]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => new Date(weekStart + i * DAY)),
    [weekStart]
  );
  const yearStart = weekStartMs(new Date(new Date(weekStart).getFullYear(), 0, 1).getTime(), WEEK_START_DOW);
  const weekNumber = Math.floor((weekStart - yearStart) / (7 * DAY)) + 1;

  /* selection synced to date store via imperative setter (no extra renders) */
  const setDateMs = useCallback((ms: number) => useDateStore.getState().setMs(ms), []);
  const todayStart = atStart(Date.now());
  const defaultSel = todayStart >= weekStart && todayStart < weekStart + 7 * DAY ? todayStart : weekStart;
  const [selectedDayMs, setSelectedDayMs] = useState<number>(defaultSel);
  React.useEffect(() => {
    const next = todayStart >= weekStart && todayStart < weekStart + 7 * DAY ? todayStart : weekStart;
    setSelectedDayMs(next);
  }, [weekStart, todayStart]);

  /* tasks store: subscribe to primitive slices only, derive via useMemo */
  const byId = useTasks((s) => s.byId);
  const order = useTasks((s) => s.order);
  const addTask = useTasks((s) => s.add);
  const updateTask = useTasks((s) => s.update);

  const allTasks: Task[] = useMemo(() => order.map((id) => byId[id]).filter(Boolean) as Task[], [order, byId]);

  const tasksByDay: Record<number, Task[]> = useMemo(() => {
    const map: Record<number, Task[]> = {};
    for (let i = 0; i < 7; i++) {
      const start = weekStart + i * DAY;
      const end = start + DAY;
      map[start] = allTasks.filter((t) => t.dueMs != null && t.dueMs >= start && t.dueMs < end);
    }
    return map;
  }, [allTasks, weekStart]);

  /* UI state */
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [important, setImportant] = useState(false);
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  /* actions */
  const addTaskToSelectedDay = useCallback(() => {
    const t = title.trim();
    if (!t) return;
    addTask({ title: t, dueMs: atStart(selectedDayMs), urgent, important });
    setTitle("");
    setUrgent(false);
    setImportant(false);
    setShowModal(false);
    setDateMs(selectedDayMs);
  }, [title, addTask, selectedDayMs, urgent, important, setDateMs]);

  const rescheduleTask = useCallback(
    (taskId: string, targetDayMs: number) => {
      updateTask(taskId, { dueMs: atStart(targetDayMs) });
    },
    [updateTask]
  );

  return (
    <div className="wv-container">
      {/* Banner */}
      <div className="wv-bannerWrap">
        <div className="wv-banner">
          <button
            className="wv-chev"
            aria-label="Previous week"
            onClick={() => setAnchor((a) => addDays(a, -7))}
          >
            ‹
          </button>
          <div style={{ textAlign: "center" }}>
            <div className="wv-title">{`WEEK ${weekNumber}`}</div>
            <div className="wv-subTitle">{fmtSubTitle(new Date(weekStart))}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="wv-chev" aria-label="Next week" onClick={() => setAnchor((a) => addDays(a, 7))}>
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="wv-section">
        <div className="wv-sectionHeader">
          <div className="wv-sectionTitle">GOALS</div>
          <div className="wv-sectionHeaderRight">
            <AddButton
              aria-label="Add weekly goal"
              onClick={() => {
                const g = window.prompt("Weekly goal");
                if (g && g.trim()) setGoal(weekStart, g.trim(), "planned");
              }}
              disabled={Object.keys(getWeek(weekStart).goals).length >= 3}
            />
          </div>
        </div>
        <div className="wv-fullBleedRule" />
        {Object.entries(getWeek(weekStart).goals).map(([g, status]) => {
          const checked = status === "done";
          return (
            <div key={g} className="wv-goalRow">
              <span className="wv-toggle">
                <ToggleButton checked={checked} onChange={() => toggleGoal(weekStart, g)} />
              </span>
              <div className="wv-goal" style={{ textDecoration: checked ? "line-through" : "none" }}>
                {g}
              </div>
              <button
                className="wv-removeX"
                onClick={() => clearGoal(weekStart, g)}
                aria-label={`Remove ${g}`}
                title="Remove"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Tasks */}
      <div className="wv-section">
        <div className="wv-sectionHeader">
          <div className="wv-sectionTitle" style={{ textTransform: "uppercase", marginTop: 40 }}>
            TASKS
          </div>
          <div className="wv-sectionHeaderRight">
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              {new Date(selectedDayMs).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <AddButton
              aria-label="Add task to selected day"
              onClick={() => {
                setShowModal(true);
                setDateMs(selectedDayMs);
              }}
            />
          </div>
        </div>
        <div className="wv-fullBleedRule" />

        <div className="wv-list">
          {days.map((d) => {
            const dayKey = atStart(d.getTime());
            const isSelected = selectedDayMs === dayKey;
            const isDrop = hoverDay === dayKey;
            const cls = `wv-dayRow ${dowClass(d)}${isDrop ? " dropping" : ""}${isSelected ? " wv-daySelected" : ""}`;
            const dayTasks = tasksByDay[dayKey] ?? [];

            return (
              <div
                key={dayKey}
                className={cls}
                onClick={() => {
                  setSelectedDayMs(dayKey);
                  setDateMs(dayKey);
                }}
                onDragOver={(e) => {
                  if (Array.from(e.dataTransfer.types).includes(DND_MIME)) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setHoverDay(dayKey);
                  }
                }}
                onDragLeave={() => setHoverDay(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setHoverDay(null);
                  const payload = e.dataTransfer.getData(DND_MIME);
                  if (!payload) return;
                  try {
                    const { id, from } = JSON.parse(payload) as { id: string; from: number };
                    if (!id || from === dayKey) return;
                    rescheduleTask(id, dayKey);
                  } catch {
                    /* no-op */
                  }
                }}
              >
                <div className="wv-badge">
                  <div className="wv-badgeDay">{fmtBadgeDay(d)}</div>
                  <div className="wv-badgeDate">{fmtBadgeDate(d)}</div>
                </div>
                <div className="wv-body">
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className={`wv-task ${isDone(t) ? "wv-taskDone" : ""}`}
                      draggable={!isDone(t)}
                      onDragStart={(e) => {
                        if (isDone(t)) {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.setData(DND_MIME, JSON.stringify({ id: t.id, from: dayKey }));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      title={isDone(t) ? "Completed tasks cannot be moved" : "Drag to another day to reschedule"}
                    >
                      <span className="wv-dot" />
                      <span>{t.title || "Untitled task"}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div data-after-days-spacer style={{ height: "100px" }} aria-hidden />
        </div>
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <Modal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            setTitle("");
            setUrgent(false);
            setImportant(false);
          }}
        >
          <div style={{ display: "grid", gap: 12, minWidth: 320 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Add task</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              For{" "}
              {new Date(selectedDayMs).toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </div>
            <input
              className="wv-input"
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTaskToSelectedDay();
                if (e.key === "Escape") setShowModal(false);
              }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className={`wv-togglePill ${urgent ? "active" : ""}`}
                onClick={() => setUrgent((v) => !v)}
                aria-pressed={urgent}
                title="Urgent"
              >
                U
              </button>
              <button
                className={`wv-togglePill ${important ? "active" : ""}`}
                onClick={() => setImportant((v) => !v)}
                aria-pressed={important}
                title="Important"
              >
                I
              </button>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button className="wv-smallBtn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="wv-smallBtn" onClick={addTaskToSelectedDay} disabled={!title.trim()}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// src/views/WeekView.tsx
import "./WeekView.css";
import React from "react";
import AddButton from "@/components/AddButton";
import ToggleButton from "@/components/ToggleButton";
import Modal from "@/components/Modal";
import { useDateStore, WEEK_START_DOW, weekStartMs } from "@/stores/dateStore";
import { useWeeklyGoals, getWeek, setGoal, toggleGoal, clearGoal } from "@/stores/weeklyGoals";
import { listAll as listTasks, add as addTask, update as updateTask } from "@/stores/tasksStore";

type TaskLike = { id: string; title?: string; name?: string; dueMs?: number | null; done?: boolean; completed?: boolean; status?: string };

const DND_MIME = "application/x-plannerx-task";
const DAY = 24 * 60 * 60 * 1000;

const atStart = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const addDays = (anchor: Date, n: number) => new Date(anchor.getTime() + n * DAY);
const isDone = (t: TaskLike) => !!(t.done || t.completed || (t.status && String(t.status).toLowerCase() === "done"));
const dowClass = (d: Date) => ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getDay()];
const fmtBadgeDay = (d: Date) => new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d).toUpperCase();
const fmtBadgeDate = (d: Date) => `${d.getDate()} ${new Intl.DateTimeFormat(undefined, { month: "long" }).format(d).toUpperCase()}`;
const fmtSubTitle = (d: Date) => `${d.getDate()} ${new Intl.DateTimeFormat(undefined, { month: "long" }).format(d).toUpperCase()}, ${d.getFullYear()}`;

export default function WeekView(): JSX.Element {
  useWeeklyGoals(); // subscribe for reactivity

  // anchor week
  const [anchor, setAnchor] = React.useState<Date>(() => new Date());
  const weekStart = React.useMemo(() => weekStartMs(anchor.getTime(), WEEK_START_DOW), [anchor]);
  const days = React.useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(weekStart + i * DAY)), [weekStart]);
  const yearStart = weekStartMs(
  new Date(new Date(weekStart).getFullYear(), 0, 1).getTime(),
  WEEK_START_DOW
);
const weekNumber = Math.floor((weekStart - yearStart) / (7 * DAY)) + 1;

  // selected day sync with dateStore
  const setDateMs = (ms: number) => useDateStore.getState().setMs(ms);
  const todayStart = atStart(Date.now());
  const defaultSel = (todayStart >= weekStart && todayStart < weekStart + 7 * DAY) ? todayStart : weekStart;
  const [selectedDayMs, setSelectedDayMs] = React.useState<number>(defaultSel);
  React.useEffect(() => {
    const next = (todayStart >= weekStart && todayStart < weekStart + 7 * DAY) ? todayStart : weekStart;
    setSelectedDayMs(next);
  }, [weekStart, todayStart]);

  // goals for this week
  const goalsObj = getWeek(weekStart).goals;
  const goals = Object.keys(goalsObj);

  // tasks
  const tasksOn = React.useCallback((dayMs: number) => {
    const items = listTasks() as TaskLike[];
    return items.filter(t => t?.dueMs != null && atStart(t.dueMs!) === dayMs);
  }, []);

  // UI state
  const [showModal, setShowModal] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [urgent, setUrgent] = React.useState(false);
  const [important, setImportant] = React.useState(false);
  const [hoverDay, setHoverDay] = React.useState<number | null>(null);
  const [tick, setTick] = React.useState(0);

  async function addTaskToSelectedDay() {
    const t = title.trim();
    if (!t) return;
    await addTask({ title: t, dueMs: atStart(selectedDayMs), urgent, important });
    setTitle(""); setUrgent(false); setImportant(false); setShowModal(false);
    setDateMs(selectedDayMs);
    setTick(v => v + 1);
  }

  async function rescheduleTask(taskId: string, targetDayMs: number) {
    await updateTask(taskId, { dueMs: atStart(targetDayMs) });
    setTick(v => v + 1);
  }

  return (
    <div className="wv-container" key={tick}>
      {/* Banner */}
      <div className="wv-bannerWrap">
        <div className="wv-banner">
          <button className="wv-chev" aria-label="Previous week" onClick={() => setAnchor(addDays(anchor, -7))}>‹</button>
          <div style={{ textAlign: "center" }}>
            <div className="wv-title">{`WEEK ${weekNumber}`}</div>
            <div className="wv-subTitle">{fmtSubTitle(new Date(weekStart))}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="wv-chev" aria-label="Next week" onClick={() => setAnchor(addDays(anchor, +7))}>›</button>
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
              disabled={goals.length >= 3}
            />
          </div>
        </div>
        <div className="wv-fullBleedRule" />
        {goals.map((g) => {
          const checked = goalsObj[g] === "done";
          return (
            <div key={g} className="wv-goalRow">
              <span className="wv-toggle">
                <ToggleButton checked={checked} onChange={() => toggleGoal(weekStart, g)} />
              </span>
              <div className="wv-goal" style={{ textDecoration: checked ? "line-through" : "none" }}>{g}</div>
              <button
                className="wv-removeX"
                onClick={() => clearGoal(weekStart, g)}
                aria-label={`Remove ${g}`}
                title="Remove"
              >×</button>
            </div>
          );
        })}
      </div>

      {/* Tasks */}
      <div className="wv-section">
        <div className="wv-sectionHeader">
          <div className="wv-sectionTitle" style={{ textTransform: "uppercase", marginTop: 40 }}>TASKS</div>
          <div className="wv-sectionHeaderRight">
            <span style={{ fontSize: 12, opacity: .7 }}>
              {new Date(selectedDayMs).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
            <AddButton aria-label="Add task to selected day" onClick={() => { setShowModal(true); setDateMs(selectedDayMs); }} />
          </div>
        </div>
        <div className="wv-fullBleedRule" />

        <div className="wv-list">
          {days.map((d) => {
            const dayMs = atStart(d.getTime());
            const isSelected = selectedDayMs === dayMs;
            const isDrop = hoverDay === dayMs;
            const cls = `wv-dayRow ${dowClass(d)}${isDrop ? " dropping" : ""}${isSelected ? " wv-daySelected" : ""}`;
            const dayTasks = tasksOn(dayMs);

            return (
              <div
                key={dayMs}
                className={cls}
                onClick={() => { setSelectedDayMs(dayMs); setDateMs(dayMs); }}
                onDragOver={(e) => {
                  if (Array.from(e.dataTransfer.types).includes(DND_MIME)) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setHoverDay(dayMs);
                  }
                }}
                onDragLeave={() => setHoverDay(null)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setHoverDay(null);
                  const payload = e.dataTransfer.getData(DND_MIME);
                  if (!payload) return;
                  try {
                    const { id, from } = JSON.parse(payload) as { id: string; from: number };
                    if (!id || from === dayMs) return;
                    await rescheduleTask(id, dayMs);
                  } catch {}
                }}
              >
                <div className="wv-badge">
                  <div className="wv-badgeDay">{fmtBadgeDay(d)}</div>
                  <div className="wv-badgeDate">{fmtBadgeDate(d)}</div>
                </div>
                <div className="wv-body">
                  {dayTasks.map(t => (
                    <div
                      key={t.id}
                      className={`wv-task ${isDone(t) ? "wv-taskDone" : ""}`}
                      draggable={!isDone(t)}
                      onDragStart={(e) => {
                        if (isDone(t)) { e.preventDefault(); return; }
                        e.dataTransfer.setData(DND_MIME, JSON.stringify({ id: t.id, from: dayMs }));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      title={isDone(t) ? "Completed tasks cannot be moved" : "Drag to another day to reschedule"}
                    >
                      <span className="wv-dot" />
                      <span>{t.title || t.name || "Untitled task"}</span>
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
          onClose={() => { setShowModal(false); setTitle(""); setUrgent(false); setImportant(false); }}
        >
          <div style={{ display: "grid", gap: 12, minWidth: 320 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Add task</div>
            <div style={{ fontSize: 12, opacity: .7 }}>
              For {new Date(selectedDayMs).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </div>
            <input
              className="wv-input"
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addTaskToSelectedDay(); if (e.key === "Escape") setShowModal(false); }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className={`wv-togglePill ${urgent ? "active" : ""}`}
                onClick={() => setUrgent(v => !v)}
                aria-pressed={urgent}
                title="Urgent"
              >U</button>
              <button
                className={`wv-togglePill ${important ? "active" : ""}`}
                onClick={() => setImportant(v => !v)}
                aria-pressed={important}
                title="Important"
              >I</button>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button className="wv-smallBtn" onClick={() => { setShowModal(false); setTitle(""); }}>Cancel</button>
                <button className="wv-smallBtn" onClick={addTaskToSelectedDay} disabled={!title.trim()}>Add</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

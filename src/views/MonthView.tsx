// src/views/MonthView.tsx
import React, { useMemo } from "react";
import "./MonthView.css";
import { useNavigate } from "react-router-dom";
import { useDateStore, WEEK_START_DOW, dayMs } from "@/stores/dateStore";
import { useTasks } from "@/stores/tasksStore";
import type { Task } from "@/domain/types";

/* time helpers */
const DAY = 24 * 60 * 60 * 1000;
const atStart = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const addMonthsMs = (ms: number, n: number) => { const d = new Date(ms); d.setMonth(d.getMonth() + n, 1); d.setHours(0, 0, 0, 0); return d.getTime(); };
const startOfMonth = (ms: number) => { const d = new Date(ms); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); };
const endOfMonth = (ms: number) => { const d = new Date(ms); d.setMonth(d.getMonth() + 1, 0); d.setHours(23, 59, 59, 999); return d.getTime(); };
const startOfWeek = (ms: number, weekStartDow: number) => {
  const d = new Date(ms);
  const cur = d.getDay();
  const diff = (cur - weekStartDow + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

function buildMonthGrid(anchorMs: number, weekStartDow: number) {
  const monthStart = startOfMonth(anchorMs);
  const monthEnd = endOfMonth(anchorMs);
  const gridStart = startOfWeek(monthStart, weekStartDow);
  const days: { ms: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const ms = gridStart + i * DAY;
    days.push({ ms, inMonth: ms >= monthStart && ms <= monthEnd });
  }
  return { monthStart, gridStart, days };
}

export default function MonthView() {
  const navigate = useNavigate();

  // date store
  const selectedEpochDay = useDateStore((s) => s.selected);
  const setMs = useDateStore((s) => s.setMs);
  const setTodaySelected = useDateStore((s) => s.setTodaySelected);

  const anchorMs = dayMs(selectedEpochDay);

  const { monthStart, gridStart, days } = useMemo(
    () => buildMonthGrid(anchorMs, WEEK_START_DOW),
    [anchorMs]
  );

  const title = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
        new Date(monthStart)
      ),
    [monthStart]
  );

  // tasks primitives only
  const byId = useTasks((s) => s.byId);
  const order = useTasks((s) => s.order);

  const tasksByDay: Record<number, Task[]> = useMemo(() => {
    const map: Record<number, Task[]> = {};
    const first = gridStart;
    const last = gridStart + 42 * DAY;
    const all = order.map((id) => byId[id]).filter(Boolean) as Task[];
    for (const t of all) {
      if (t.dueMs == null) continue;
      if (t.dueMs >= first && t.dueMs < last) {
        const day = atStart(t.dueMs);
        (map[day] ||= []).push(t);
      }
    }
    return map;
  }, [order, byId, gridStart]);

  const today = atStart(Date.now());

  const openDay = (ms: number) => {
    setMs(ms);
    navigate("/day");
  };

  return (
    <main className="mv" role="main">
      {/* Banner */}
      <section className="mv-banner" aria-label="Month navigation">
        <button
          type="button"
          className="mv-chev"
          aria-label="Previous month"
          onClick={() => setMs(addMonthsMs(anchorMs, -1))}
        >
          ‹
        </button>

        <div className="mv-bannerCenter">
          <div className="mv-title" aria-live="polite">{title}</div>
          <button
            type="button"
            onClick={() => { setTodaySelected(); navigate("/day"); }}
            className="mv-todayBtn"
            aria-label="Jump to today"
          >
            Today
          </button>
        </div>

        <button
          type="button"
          className="mv-chev"
          aria-label="Next month"
          onClick={() => setMs(addMonthsMs(anchorMs, +1))}
        >
          ›
        </button>
      </section>

      {/* Weekday header */}
      <section className="mv-weekdays" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => new Date(startOfWeek(Date.now(), WEEK_START_DOW) + i * DAY)).map(
          (d) => (
            <div key={d.getDay()} className="mv-weekCell">
              {new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(d)}
            </div>
          )
        )}
      </section>

      {/* Grid */}
      <section className="mv-grid" role="grid" aria-label="Month grid">
        {days.map(({ ms, inMonth }) => {
          const items = tasksByDay[ms] ?? [];
          const isToday = ms === today;
          return (
            <div
              key={ms}
              role="gridcell"
              className={`mv-cell${inMonth ? "" : " mv-cell--muted"}${isToday ? " mv-cell--today" : ""}`}
              onClick={() => openDay(ms)}
            >
              <div className="mv-cellHeader">
                <span className="mv-dateNum">{new Date(ms).getDate()}</span>
                {items.length > 0 && (
                  <span className="mv-count" aria-label={`${items.length} tasks`}>
                    {items.length}
                  </span>
                )}
              </div>
              <div className="mv-items">
                {items.slice(0, 3).map((t) => (
                  <div key={t.id} className={`mv-item${t.done ? " mv-item--done" : ""}`} title={t.title}>
                    <span className="mv-dot" />
                    <span className="mv-text">{t.title}</span>
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="mv-more" aria-label={`${items.length - 3} more`}>
                    +{items.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}

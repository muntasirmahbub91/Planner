// src/components/WeeklyCard.tsx
// Presentational weekly summary. No store reads. Uses time helpers only.

import React, { useMemo, useState } from "react";
import type { Task } from "@/types/task";
import { toDayStartMs } from "@/lib/time";

type CapInfo = { reason: "cap" | "invalid" | "not-found" | "completed-immutable"; activeCount: number };

type DaySlot = {
  dayMs: number;                 // local day key
  active: Task[];                // tasks for the day (already filtered by parent)
  completed: Task[];
  canActivate: boolean;          // parent-evaluated cap gate
  capInfo?: CapInfo | null;
  title?: string;                // e.g., "Mon"
  meta?: string;                 // e.g., "Sep 8"
};

type Props = {
  weekStartMs: number;           // local week start key
  days: DaySlot[];               // seven entries in order
  onAdd?: (dayMs: number, text: string) => void;
  onClickDay?: (dayMs: number) => void;
};

export default function WeeklyCard({ weekStartMs, days, onAdd, onClickDay }: Props) {
  const weekKey = toDayStartMs(weekStartMs);

  return (
    <div className="weeklyCard" data-week={weekKey}>
      <div className="weeklyCard-header">
        <h3 className="weeklyCard-title">This Week</h3>
      </div>

      <ul className="weeklyCard-grid">
        {days.map((slot) => (
          <WeekDayMini
            key={slot.dayMs}
            {...slot}
            onAdd={onAdd}
            onClickDay={onClickDay}
          />
        ))}
      </ul>
    </div>
  );
}

function WeekDayMini({
  dayMs,
  title,
  meta,
  active,
  completed,
  canActivate,
  capInfo,
  onAdd,
  onClickDay,
}: DaySlot & {
  onAdd?: (dayMs: number, text: string) => void;
  onClickDay?: (dayMs: number) => void;
}) {
  const dayKey = toDayStartMs(dayMs);
  const [draft, setDraft] = useState("");

  const { visible, activeCount } = useMemo(() => {
    const sortedCompleted = [...completed].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
    return {
      visible: [...active, ...sortedCompleted].slice(0, 3),
      activeCount: active.length,
    };
  }, [active, completed]);

  const addDisabled = !canActivate || !onAdd;
  const addTitle =
    addDisabled && capInfo?.reason === "cap"
      ? `Day is full (${capInfo.activeCount ?? activeCount} active).`
      : undefined;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !onAdd || addDisabled) return;
    onAdd(dayKey, text);
    setDraft("");
  }

  return (
    <li className="weeklyCard-day" data-day={dayKey}>
      <button
        type="button"
        className="weeklyCard-dayHeader"
        onClick={() => onClickDay && onClickDay(dayKey)}
        title="Open day"
      >
        <span className="weeklyCard-dayTitle">{title}</span>
        <span className="weeklyCard-dayMeta">{meta}</span>
        <span className="weeklyCard-count">{activeCount}/3</span>
      </button>

      <ul className="weeklyCard-list">
        {visible.map((t) => (
          <li key={t.id} className={`miniRow ${t.state === "completed" ? "miniRow--done" : ""}`}>
            <span className="miniDot" aria-hidden>•</span>
            <span className="miniText">{t.text}</span>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="miniRow miniRow--placeholder" aria-disabled>
            <span className="miniDot" aria-hidden>•</span>
            <span className="muted">empty</span>
          </li>
        )}
      </ul>

      <form className="weeklyCard-add" onSubmit={submit}>
        <input
          type="text"
          placeholder="Add…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={`Add task for ${title ?? "day"}`}
        />
        <button type="submit" disabled={addDisabled} title={addTitle}>Add</button>
      </form>
    </li>
  );
}

// compat named export for modules importing {WeeklyCard}

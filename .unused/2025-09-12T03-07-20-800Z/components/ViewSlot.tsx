// src/components/ViewSlot.tsx
// Central switch that renders either a time-based view (Day/Week/Month/Year)
// or a mode view (Tasks/Projects/Reminders/Journal). Lazy-loaded.

import React, { Suspense } from "react";
import type { View } from "@/stores/viewStore";
import type { Mode } from "@/stores/modeStore";

// Time-based views
const DayView = React.lazy(() => import("@/views/DayView"));
const WeekView = React.lazy(() => import("@/views/WeekView"));
const MonthView = React.lazy(() => import("@/views/MonthView"));
const YearView = React.lazy(() => import("@/views/YearView"));

// Mode views
const TasksView = React.lazy(() => import("@/views/TasksView"));
const RemindersView = React.lazy(() => import("@/views/RemindersView"));
const ProjectsView = React.lazy(() => import("@/views/ProjectsView"));
const JournalView = React.lazy(() => import("@/views/JournalView"));

type Props = {
  view: View;
  mode: Mode;
  dateMs: number;
};

export default function ViewSlot({ view, mode, dateMs }: Props) {
  return (
    <Suspense fallback={<div className="notice notice--info">Loading…</div>}>
      {/* Mode screens take precedence */}
      {mode === "tasks" && <TasksView dateMs={dateMs} />}
      {mode === "reminders" && <RemindersView dateMs={dateMs} />}
      {mode === "projects" && <ProjectsView dateMs={dateMs} />}
      {mode === "journal" && <JournalView dateMs={dateMs} />}

      {/* If no mode-specific override, render the calendar view */}
      {mode === "tasks" || mode === "reminders" || mode === "projects" || mode === "journal"
        ? null
        : view === "day"
        ? <DayView dateMs={dateMs} />
        : view === "week"
        ? <WeekView dateMs={dateMs} />
        : view === "month"
        ? <MonthView dateMs={dateMs} />
        : <YearView dateMs={dateMs} />}
    </Suspense>
  );
}

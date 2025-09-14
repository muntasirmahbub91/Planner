// src/components/CalendarGrid.tsx
import React, { useMemo } from "react";
import styles from "./CalendarGrid.module.css";

import { CalendarDayCell } from "@/components/CalendarDayCell";
import { useDateStore } from "@/stores/dateStore";
import { useTasks } from "@/stores/tasks";
import { useReminders } from "@/stores/reminders";
import {
  monthStartMs,
  monthRange,
  shiftDays,
  toDayStartMs,
} from "@/lib/time";

interface CalendarGridProps {
  anchorMs: number;
  showTasks: boolean;
  showReminders: boolean;
  onSelectDay: (dayStartMs: number) => void;
}

/**
 * CalendarGrid
 * - Computes month span (start → end).
 * - Pads grid to full weeks (28–42 days).
 * - Each day cell shows task/reminder counts as badges.
 * - Clicking a day calls onSelectDay.
 */
export const CalendarGrid: React.FC<CalendarGridProps> = ({
  anchorMs,
  showTasks,
  showReminders,
  onSelectDay,
}) => {
  const dateStore = useDateStore();
  const tasks = useTasks();
  const reminders = useReminders();

  const days = useMemo(() => {
    const start = monthStartMs(anchorMs);
    const { startMs, endMs } = monthRange(start);
    // Pad to full weeks: start from Sunday before, end at Saturday after
    const firstDay = toDayStartMs(startMs);
    const lastDay = toDayStartMs(endMs - 1);
    const totalDays = Math.ceil((lastDay - firstDay) / (1000 * 60 * 60 * 24)) + 1;

    return Array.from({ length: totalDays }, (_, i) => shiftDays(firstDay, i));
  }, [anchorMs]);

  return (
    <div className={styles.grid}>
      {days.map((dayMs) => {
        const taskCount = showTasks ? tasks.countForDay(dayMs) : 0;
        const reminderCount = showReminders
          ? reminders.countForDay(dayMs)
          : 0;

        return (
          <CalendarDayCell
            key={dayMs}
            date={dayMs}
            taskCount={taskCount}
            reminderCount={reminderCount}
            onSelect={() => onSelectDay(dayMs)}
          />
        );
      })}
    </div>
  );
};

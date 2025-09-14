// src/components/CalendarDayCell.tsx
import React, { useMemo } from "react";
import styles from "./CalendarDayCell.module.css";

import { toDayStartMs, monthStartMs } from "@/lib/time";
import { useDateStore } from "@/stores/dateStore";

interface CalendarDayCellProps {
  date: number; // day-start ms (local)
  taskCount: number;
  reminderCount: number;
  onSelect: () => void;
}

/**
 * CalendarDayCell
 * - Shows day number with badges for tasks and reminders.
 * - Dims days outside the anchor month.
 * - Highlights today.
 * - Click selects the day.
 */
export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  date,
  taskCount,
  reminderCount,
  onSelect,
}) => {
  const { getMs } = useDateStore();

  const { label, isToday, isCurrentMonth } = useMemo(() => {
    const d = new Date(date);
    const label = d.getDate().toString();
    const today = toDayStartMs() === date;
    const currentMonthStart = monthStartMs(getMs());
    const thisCellMonthStart = monthStartMs(date);
    const isCurrentMonth = currentMonthStart === thisCellMonthStart;
    return { label, isToday: today, isCurrentMonth };
  }, [date, getMs]);

  return (
    <button
      type="button"
      className={[
        styles.cell,
        isToday ? styles.today : "",
        !isCurrentMonth ? styles.outside : "",
      ].join(" ")}
      onClick={onSelect}
      aria-label={`Select ${label}`}
    >
      <div className={styles.header}>
        <span className={styles.day}>{label}</span>
      </div>
      <div className={styles.badges}>
        {taskCount > 0 && (
          <span className={styles.badge} data-kind="tasks">
            {taskCount}
          </span>
        )}
        {reminderCount > 0 && (
          <span className={styles.badge} data-kind="reminders">
            {reminderCount}
          </span>
        )}
      </div>
    </button>
  );
};

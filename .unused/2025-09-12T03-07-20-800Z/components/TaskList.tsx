// src/components/TaskList.tsx
import React, { useMemo, useState } from "react";
import styles from "./TaskList.module.css";

import { TaskListFilters } from "@/components/TaskListFilters";
import { CalendarRangeFilter } from "@/components/CalendarRangeFilter";
import { TaskListRow } from "@/components/TaskListRow";
import { useTasks } from "@/stores/tasks";

/**
 * TaskList
 * Filterable list view for tasks with optional date range narrowing.
 * Row actions: Set/Clear Date, Edit Text (if allowed), Delete.
 * Completion is not allowed here for dateless tasks (store enforces).
 * Spec: Filters include Completed, Incomplete, ThisWeek, ThisMonth, NextMonth, Dateless:contentReference[oaicite:0]{index=0}.
 */
export const TaskList: React.FC = () => {
  const tasks = useTasks();

  const [filters, setFilters] = useState<string[]>(["Incomplete"]);
  const [range, setRange] = useState<{ from: number | null; to: number | null }>({
    from: null,
    to: null,
  });

  const items = useMemo(() => {
    return tasks.list({
      filters,
      range: range.from || range.to ? range : null,
    });
  }, [tasks, filters, range]);

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <TaskListFilters selected={filters} onChange={setFilters} />
        <CalendarRangeFilter
          range={range}
          onChange={(next) => setRange(next)}
        />
      </div>

      <div className={styles.list} role="list">
        {items.map((t: any) => (
          <TaskListRow
            key={t.id}
            task={t}
            onSetDate={(id, date) => tasks.setDate(id, date)}
            onClearDate={(id) => tasks.setDate(id, null)}
            onDelete={(id) => tasks.deleteHard(id)}
            onEditText={(id, text) => tasks.setText(id, text)}
          />
        ))}
        {items.length === 0 && (
          <div className={styles.empty}>No tasks match the current filters.</div>
        )}
      </div>
    </div>
  );
};

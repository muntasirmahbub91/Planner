// src/components/TaskListFilters.tsx
import React from "react";
import styles from "./TaskListFilters.module.css";

interface TaskListFiltersProps {
  selected: string[];
  onChange: (next: string[]) => void;
}

const ALL_FILTERS = [
  "Completed",
  "Incomplete",
  "ThisWeek",
  "ThisMonth",
  "NextMonth",
  "Dateless",
];

/**
 * TaskListFilters
 * - Multi-select filter bar
 * - Toggles filter inclusion/exclusion
 * - Emits array of selected filters
 */
export const TaskListFilters: React.FC<TaskListFiltersProps> = ({
  selected,
  onChange,
}) => {
  const toggle = (f: string) => {
    if (selected.includes(f)) {
      onChange(selected.filter((x) => x !== f));
    } else {
      onChange([...selected, f]);
    }
  };

  return (
    <div className={styles.row} role="group" aria-label="Task filters">
      {ALL_FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          className={`${styles.filter} ${
            selected.includes(f) ? styles.active : ""
          }`}
          aria-pressed={selected.includes(f)}
          onClick={() => toggle(f)}
        >
          {f}
        </button>
      ))}
    </div>
  );
};

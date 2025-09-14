// src/components/CalendarRangeFilter.tsx
import React from "react";
import styles from "./CalendarRangeFilter.module.css";

interface Range {
  from: number | null;
  to: number | null;
}

interface CalendarRangeFilterProps {
  range: Range;
  onChange: (next: Range) => void;
}

/**
 * CalendarRangeFilter
 * - Lets user choose optional from/to date range
 * - Emits range in ms (day-start)
 */
export const CalendarRangeFilter: React.FC<CalendarRangeFilterProps> = ({
  range,
  onChange,
}) => {
  const handleFrom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? new Date(e.target.value).getTime() : null;
    onChange({ ...range, from: val });
  };

  const handleTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value ? new Date(e.target.value).getTime() : null;
    onChange({ ...range, to: val });
  };

  return (
    <div className={styles.row} aria-label="Calendar range filter">
      <label className={styles.label}>
        From
        <input
          type="date"
          value={range.from ? new Date(range.from).toISOString().slice(0, 10) : ""}
          onChange={handleFrom}
          className={styles.input}
        />
      </label>
      <label className={styles.label}>
        To
        <input
          type="date"
          value={range.to ? new Date(range.to).toISOString().slice(0, 10) : ""}
          onChange={handleTo}
          className={styles.input}
        />
      </label>
    </div>
  );
};

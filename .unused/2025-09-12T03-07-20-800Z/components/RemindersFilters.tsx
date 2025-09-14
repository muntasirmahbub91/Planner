// src/components/RemindersFilters.tsx
import React from "react";
import styles from "./RemindersFilters.module.css";
import { Button } from "@/atoms/Button";

export type RangePreset =
  | "Today"
  | "Tomorrow"
  | "ThisWeek"
  | "ThisMonth"
  | "ThisYear";

interface RemindersFiltersProps {
  selected: RangePreset;
  onChange: (next: RangePreset) => void;
}

const PRESETS: RangePreset[] = [
  "Today",
  "Tomorrow",
  "ThisWeek",
  "ThisMonth",
  "ThisYear",
];

/**
 * RemindersFilters
 * Single-select preset range picker.
 * Keyboard: Left/Right to change selection.
 */
export const RemindersFilters: React.FC<RemindersFiltersProps> = ({
  selected,
  onChange,
}) => {
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = PRESETS.indexOf(selected);
    if (idx < 0) return;
    if (e.key === "ArrowRight") {
      onChange(PRESETS[(idx + 1) % PRESETS.length]);
    } else if (e.key === "ArrowLeft") {
      onChange(PRESETS[(idx - 1 + PRESETS.length) % PRESETS.length]);
    }
  };

  return (
    <div
      className={styles.row}
      role="radiogroup"
      aria-label="Reminder range presets"
      onKeyDown={onKey}
    >
      {PRESETS.map((p) => (
        <Button
          key={p}
          variant={selected === p ? "primary" : "ghost"}
          aria-checked={selected === p}
          role="radio"
          className={styles.btn}
          onClick={() => onChange(p)}
        >
          {labelFor(p)}
        </Button>
      ))}
    </div>
  );
};

function labelFor(p: RangePreset) {
  switch (p) {
    case "Today":
      return "Today";
    case "Tomorrow":
      return "Tomorrow";
    case "ThisWeek":
      return "This Week";
    case "ThisMonth":
      return "This Month";
    case "ThisYear":
      return "This Year";
  }
}

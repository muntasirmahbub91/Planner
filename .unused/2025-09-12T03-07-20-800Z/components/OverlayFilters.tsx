// src/components/OverlayFilters.tsx
import React from "react";
import styles from "./OverlayFilters.module.css";
import { Button } from "@/atoms/Button";

type FiltersChange = Partial<{
  showTasks: boolean;
  showReminders: boolean;
}>;

interface OverlayFiltersProps {
  showTasks: boolean;
  showReminders: boolean;
  onChange: (next: FiltersChange) => void;
}

/**
 * OverlayFilters
 * Two toggles: ShowTasks and ShowReminders.
 * Stateless. Emits partial changes via onChange.
 */
export const OverlayFilters: React.FC<OverlayFiltersProps> = ({
  showTasks,
  showReminders,
  onChange,
}) => {
  return (
    <div className={styles.row} role="group" aria-label="Overlay filters">
      <Button
        variant={showTasks ? "primary" : "ghost"}
        aria-pressed={showTasks}
        aria-label="Toggle task overlays"
        onClick={() => onChange({ showTasks: !showTasks })}
        className={styles.btn}
      >
        Tasks {showTasks ? "On" : "Off"}
      </Button>

      <Button
        variant={showReminders ? "primary" : "ghost"}
        aria-pressed={showReminders}
        aria-label="Toggle reminder overlays"
        onClick={() => onChange({ showReminders: !showReminders })}
        className={styles.btn}
      >
        Reminders {showReminders ? "On" : "Off"}
      </Button>
    </div>
  );
};

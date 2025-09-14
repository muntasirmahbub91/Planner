// src/components/QuarterSection.tsx
import React from "react";
import styles from "./QuarterSection.module.css";

import { QuarterlyGoalCard } from "@/components/QuarterlyGoalCard";
import WeeklyCard from "@/components/WeeklyCard";
import { useQuarterGoals } from "@/stores/goals";
import { shiftMonths } from "@/lib/time";

interface QuarterSectionProps {
  quarterStartMs: number; // local day-start at beginning of quarter
}

/**
 * QuarterSection
 * - Shows up to 3 quarterly goals
 * - Shows 12 WeeklyCards (one per week of the quarter)
 * - Goals immutable once archived (enforced in store)
 */
export const QuarterSection: React.FC<QuarterSectionProps> = ({
  quarterStartMs,
}) => {
  const goals = useQuarterGoals();
  const quarterGoals = goals.list(quarterStartMs);

  // Quarter = 3 months ≈ 12 weeks
  const weeklyStarts = Array.from({ length: 12 }, (_, i) =>
    shiftMonths(quarterStartMs, 0) + i * 7 * 24 * 60 * 60 * 1000
  );

  return (
    <div className={styles.section}>
      <div className={styles.goals}>
        {quarterGoals.map((g) => (
          <QuarterlyGoalCard
            key={g.id}
            goal={g}
            onEdit={(id, text) => goals.edit(id, text)}
            onRemove={(id) => goals.remove(id)}
          />
        ))}
      </div>
      <div className={styles.weeks}>
        {weeklyStarts.map((wStart) => (
          <WeeklyCard key={wStart} weekStartMs={wStart} />
        ))}
      </div>
    </div>
  );
};

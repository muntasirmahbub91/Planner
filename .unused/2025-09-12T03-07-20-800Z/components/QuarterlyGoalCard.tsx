// src/components/QuarterlyGoalCard.tsx
import React from "react";
import styles from "./QuarterlyGoalCard.module.css";

import TextInlineEdit from "@/atoms/TextInlineEdit";
import { Button } from "@/atoms/Button";

export interface QuarterlyGoal {
  id: string;
  text: string;
  archived?: boolean;
}

interface QuarterlyGoalCardProps {
  goal: QuarterlyGoal;
  onEdit: (id: string, newText: string) => void;
  onRemove: (id: string) => void;
}

/**
 * QuarterlyGoalCard
 * - Displays one quarterly intention
 * - Editable only if not archived
 * - Remove action disabled if archived
 */
export const QuarterlyGoalCard: React.FC<QuarterlyGoalCardProps> = ({
  goal,
  onEdit,
  onRemove,
}) => {
  return (
    <div className={styles.card}>
      <TextInlineEdit
        value={goal.text}
        onCommit={(text) => onEdit(goal.id, text)}
        disabled={goal.archived}
        className={styles.text}
      />
      <div className={styles.actions}>
        <Button
          variant="ghost"
          aria-label="Remove goal"
          disabled={goal.archived}
          onClick={() => onRemove(goal.id)}
        >
          ✕
        </Button>
      </div>
    </div>
  );
};

// src/components/WeeklyGoalCard.tsx
import React from "react";
import styles from "./WeeklyGoalCard.module.css";
import { TextInlineEdit } from "@/atoms/TextInlineEdit";
import { Button } from "@/atoms/Button";

export interface WeeklyGoal {
  id: string;
  text: string;
}

interface WeeklyGoalCardProps {
  goal: WeeklyGoal;
  onEdit: (id: string, newText: string) => void;
  onRemove: (id: string) => void;
}

/**
 * WeeklyGoalCard
 * Displays a single weekly intention/goal with inline editing and remove action.
 * Spec:
 * - Shows goal text (editable)
 * - Supports edit (inline) and remove
 * - Max 3 cards per week handled upstream (GoalsSection)
 */
export const WeeklyGoalCard: React.FC<WeeklyGoalCardProps> = ({
  goal,
  onEdit,
  onRemove,
}) => {
  return (
    <div className={styles.card}>
      <TextInlineEdit
        value={goal.text}
        onCommit={(text) => onEdit(goal.id, text)}
        className={styles.text}
      />
      <div className={styles.actions}>
        <Button
          variant="ghost"
          aria-label="Remove goal"
          onClick={() => onRemove(goal.id)}
        >
          ✕
        </Button>
      </div>
    </div>
  );
};

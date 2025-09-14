// src/components/IntentionsList.tsx
import React, { useMemo, useState } from "react";
import styles from "./IntentionsList.module.css";

import { WeeklyGoalCard, WeeklyGoal } from "@/components/WeeklyGoalCard";
import { TextInlineEdit } from "@/atoms/TextInlineEdit";
import { Button } from "@/atoms/Button";
import { useWeekGoals } from "@/stores/goals";

interface IntentionsListProps {
  weekStartMs: number; // local day-start for the week's first day
  max?: number;        // default 3 per spec
}

/**
 * IntentionsList
 * - Lists weekly intentions for a given weekStartMs
 * - Add (capped), Edit, Remove
 * - Store enforces invariants; UI shows simple error text if blocked
 */
export const IntentionsList: React.FC<IntentionsListProps> = ({
  weekStartMs,
  max = 3,
}) => {
  const goals = useWeekGoals();

  const items = useMemo<WeeklyGoal[]>(
    () => goals.list(weekStartMs),
    [goals, weekStartMs]
  );

  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const add = () => {
    const v = text.trim();
    if (!v) return;
    const res = goals.addIfFree(weekStartMs, v, max);
    if (!res?.ok) {
      setErr(res?.reason || `Limit reached. Max ${max}.`);
    } else {
      setErr(null);
      setText("");
    }
  };

  const edit = (id: string, newText: string) => {
    const res = goals.edit(id, newText.trim());
    if (!res?.ok) setErr(res?.reason || "Edit failed."); else setErr(null);
  };

  const remove = (id: string) => {
    const res = goals.remove(id);
    if (!res?.ok) setErr(res?.reason || "Remove failed."); else setErr(null);
  };

  return (
    <div className={styles.wrap} aria-label="Weekly intentions">
      <div className={styles.addRow}>
        <TextInlineEdit
          value={text}
          placeholder={`Add intention (${items.length}/${max})`}
          onCommit={setText}
          className={styles.input}
        />
        <Button
          variant="primary"
          onClick={add}
          disabled={!text.trim() || items.length >= max}
          className={styles.addBtn}
        >
          Add
        </Button>
      </div>
      {err && (
        <div role="alert" className={styles.error}>
          {err}
        </div>
      )}

      <div className={styles.list} role="list">
        {items.map((g) => (
          <div key={g.id} role="listitem">
            <WeeklyGoalCard goal={g} onEdit={edit} onRemove={remove} />
          </div>
        ))}
        {items.length === 0 && (
          <div className={styles.empty}>No intentions yet.</div>
        )}
      </div>
    </div>
  );
};

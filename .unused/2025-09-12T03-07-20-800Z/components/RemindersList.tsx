// src/components/RemindersList.tsx
import React, { useMemo, useState } from "react";
import styles from "./RemindersList.module.css";

import { ReminderModal } from "@/components/ReminderModal";
import ReminderRow from "@/components/ReminderRow";
import { Button } from "@/atoms/Button";
import { useReminders } from "@/stores/reminders";

type RangePreset = "Today" | "Tomorrow" | "ThisWeek" | "ThisMonth" | "ThisYear";

type Alerts = { daysBefore: number; count: number };
interface Reminder {
  id: string;
  title: string;
  when: number; // ms
  alerts?: Alerts;
  done: boolean;
}

interface RemindersListProps {
  preset: RangePreset;
}

/**
 * RemindersList
 * - Shows reminders filtered by preset
 * - Row actions: Done/Undone, Edit, Delete
 * - Done items remain visible
 */
export const RemindersList: React.FC<RemindersListProps> = ({ preset }) => {
  const reminders = useReminders();

  const items = useMemo<Reminder[]>(() => {
    // Store exposes list(rangePreset) per spec
    return reminders.list(preset);
  }, [reminders, preset]);

  // Edit modal state
  const [editing, setEditing] = useState<Reminder | null>(null);

  const onToggle = (id: string) => {
    reminders.toggleDone(id);
  };

  const onDelete = (id: string) => {
    if (confirm("Delete this reminder?")) {
      reminders.delete(id);
    }
  };

  const onEdit = (r: Reminder) => setEditing(r);

  const handleEditSubmit = (payload: {
    title: string;
    when: number;
    alerts?: Alerts | null;
  }) => {
    if (!editing) return;
    reminders.update(editing.id, {
      title: payload.title,
      when: payload.when,
      alerts: payload.alerts ?? undefined,
    });
    setEditing(null);
  };

  return (
    <div className={styles.list} role="list" aria-label={`${preset} reminders`}>
      {items.map((r) => (
        <div key={r.id} className={styles.row} role="listitem">
          <div className={styles.main}>
            <ReminderRow reminder={r} onToggle={() => onToggle(r.id)} />
          </div>
          <div className={styles.actions}>
            <Button variant="ghost" onClick={() => onEdit(r)} aria-label="Edit reminder">
              Edit
            </Button>
            <Button variant="ghost" onClick={() => onDelete(r.id)} aria-label="Delete reminder">
              ✕
            </Button>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className={styles.empty}>No reminders in this range.</div>
      )}

      {editing && (
        <ReminderModal
          open
          mode="edit"
          initial={{
            title: editing.title,
            when: editing.when,
            alerts: editing.alerts ?? { daysBefore: 0, count: 0 },
          }}
          onCancel={() => setEditing(null)}
          onSubmit={handleEditSubmit}
        />
      )}
    </div>
  );
};

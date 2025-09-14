// src/components/AddReminderBar.tsx
import React, { useMemo, useState } from "react";
import styles from "./AddReminderBar.module.css";

import { Button } from "@/atoms/Button";
import { ReminderModal } from "@/components/ReminderModal";
import { useReminders } from "@/stores/reminders";

/**
 * AddReminderBar
 * - Opens Add/Edit Reminder modal in "Add" mode
 * - On submit → reminders.add(...)
 * Spec: Title, Date/Time, Alerts { days-before, count } (finite pre-events)
 */
export const AddReminderBar: React.FC = () => {
  const reminders = useReminders();
  const [open, setOpen] = useState(false);

  const initialWhen = useMemo(() => {
    const now = new Date();
    // round up to next 30 minutes
    const ms = 30 * 60 * 1000;
    const next = new Date(Math.ceil(now.getTime() / ms) * ms);
    return next.getTime();
  }, []);

  const handleCreate = (payload: {
    title: string;
    when: number; // ms
    alerts?: { daysBefore: number; count: number } | null;
  }) => {
    const { title, when, alerts } = payload;
    reminders.add({
      title: title.trim(),
      when,
      alerts: alerts ?? undefined,
    });
    setOpen(false);
  };

  return (
    <div className={styles.bar}>
      <div className={styles.spacer} />
      <Button variant="primary" onClick={() => setOpen(true)}>
        New Reminder
      </Button>

      {open && (
        <ReminderModal
          open
          mode="add"
          initial={{
            title: "",
            when: initialWhen,
            alerts: { daysBefore: 0, count: 0 },
          }}
          onCancel={() => setOpen(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
};

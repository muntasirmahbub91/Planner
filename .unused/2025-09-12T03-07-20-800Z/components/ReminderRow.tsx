// src/components/ReminderRow.tsx
// One reminder line item with title edit, done toggle, due time, snooze, delete.
// Styling hooks: .card (if wrapped externally), or use flex utilities from global.css.

import React from "react";
import { format, isBefore } from "date-fns";
import TextInlineEdit from "@/atoms/TextInlineEdit";
import { Button } from "@/atoms/Button";
import type { Reminder } from "@/stores/reminders";
import {
  renameReminder,
  markDone,
  markUndone,
  removeReminder,
  snoozeAlert
} from "@/stores/reminders";

type Props = {
  reminder: Reminder;
  compact?: boolean; // smaller paddings if true
};

export default function ReminderRow({ reminder, compact = false }: Props) {
  const d = new Date(reminder.dueMs);
  const overdue = isBefore(d, new Date()) && !reminder.done;

  return (
    <div className={`flex items-center justify-between gap-12${compact ? " p-8" : ""}`}>
      <label className="flex items-center gap-12">
        <input
          type="checkbox"
          checked={!!reminder.done}
          onChange={(e) => (e.target.checked ? markDone(reminder.id) : markUndone(reminder.id))}
          aria-label={reminder.done ? "Mark as not done" : "Mark as done"}
        />
        <TextInlineEdit
          value={reminder.title}
          placeholder="Reminder title…"
          onChange={(t) => renameReminder(reminder.id, t)}
        />
      </label>

      <div className="flex items-center gap-8">
        <time className="dayCard-meta" title={format(d, "PPpp")} aria-label="Due time">
          {format(d, "HH:mm")}
          {overdue ? " • overdue" : ""}
        </time>

        <Button
          size="sm"
          variant="ghost"
          label="+10m"
          title="Snooze 10 minutes"
          onClick={() => snoozeAlert(reminder.id, reminder.dueMs, 10)}
        />
        <Button
          size="sm"
          variant="ghost"
          label="+1h"
          title="Snooze 1 hour"
          onClick={() => snoozeAlert(reminder.id, reminder.dueMs, 60)}
        />
        <Button
          size="sm"
          variant="danger"
          label="Delete"
          onClick={() => removeReminder(reminder.id)}
        />
      </div>
    </div>
  );
}

// compat named export for modules importing {ReminderRow}

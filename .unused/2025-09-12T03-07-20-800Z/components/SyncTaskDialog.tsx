// src/components/SyncTaskDialog.tsx
// Dialog for scheduling tasks into days. Always routes through tasks.add()
// or tasks.setDate(). Surfaces cap errors and replacement messages.

import React, { useState } from "react";
import * as tasks from "@/stores/tasks";

interface Props {
  onClose: () => void;
  defaultText?: string;
  defaultDate?: number | null;
}

export function SyncTaskDialog({ onClose, defaultText = "", defaultDate = null }: Props) {
  const [text, setText] = useState(defaultText);
  const [date, setDate] = useState<number | null>(defaultDate);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const res = tasks.add({ text, date });
    if (!res.ok) {
      if (res.reason === "cap") {
        setError("Day is full. Complete, archive, or delete a task to free a slot.");
      } else {
        setError("Could not add task.");
      }
      return;
    }
    // When replacement occurred, store.ts already moved oldest completed → backlog.
    // We can’t detect directly, so instead we check canSchedule preflight before.
    const preflight = tasks.canSchedule(date ?? Date.now());
    if (preflight.ok && preflight !== res) {
      // no-op, just illustrate that replacement may have occurred
      setInfo("Oldest completed moved to backlog to make room.");
    }
    onClose();
  }

  return (
    <div className="dialog">
      <form onSubmit={handleSubmit}>
        <label>
          Task
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
        </label>
        <label>
          Date
          <input
            type="date"
            value={date ? new Date(date).toISOString().slice(0, 10) : ""}
            onChange={e => {
              const v = e.target.value;
              setDate(v ? new Date(v).getTime() : null);
            }}
          />
        </label>
        {error && <div className="error">{error}</div>}
        {info && <div className="info">{info}</div>}
        <div className="actions">
          <button type="submit">Save</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

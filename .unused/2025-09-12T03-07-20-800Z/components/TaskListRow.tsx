// src/components/TaskListRow.tsx
// Single task row. Supports edit, complete/uncomplete, setDate, clearDate, delete.
// All scheduling goes through tasks.setDate() with cap rules.
// Surfaces error messages when blocked.

import React, { useState } from "react";
import * as tasks from "@/stores/tasks";

interface Props {
  task: tasks.Task;
}

export function TaskListRow({ task }: Props) {
  const [error, setError] = useState<string | null>(null);

  function handleCompleteToggle() {
    setError(null);
    if (task.state === "active") {
      tasks.complete(task.id);
    } else if (task.state === "completed") {
      const res = tasks.uncomplete(task.id);
      if (!res.ok && res.reason === "cap") {
        setError("Cannot uncomplete: day already has 3 active tasks.");
      }
    }
  }

  function handleDelete() {
    setError(null);
    tasks.deleteHard(task.id);
  }

  function handleClearDate() {
    setError(null);
    tasks.setDate(task.id, null);
  }

  function handleSetDate(date: number) {
    setError(null);
    const res = tasks.setDate(task.id, date);
    if (!res.ok) {
      if (res.reason === "cap") {
        setError("Day is full. Complete, archive, or delete a task to free a slot.");
      } else {
        setError("Could not move task.");
      }
    }
  }

  return (
    <div className="taskRow">
      <input
        type="checkbox"
        checked={task.state === "completed"}
        onChange={handleCompleteToggle}
      />
      <span className={task.state === "completed" ? "completed" : ""}>
        {task.text}
      </span>
      <button onClick={handleClearDate}>Clear Date</button>
      <button onClick={() => handleDelete()}>Delete</button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

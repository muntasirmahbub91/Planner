// src/migrations/vXX_tasks_dayCap.ts
// Migration: enforce day-cap rules for tasks.
// - Demote overflow actives to "completed" or move to someday backlog.
// - Normalize status field values to 'active' | 'completed' | 'canceled'.

import type { Task } from "@/types/task";
import { toDayStartMs } from "@/lib/time";

export function migrate(state: any): any {
  if (!state?.tasks) return state;

  const tasks: Record<string, Task> = state.tasks;

  for (const t of Object.values(tasks)) {
    // normalize status
    if (t.state === "done") t.state = "completed" as Task["state"];
    if (t.state === "deleted") t.state = "canceled" as Task["state"];

    if (t.date != null && t.state === "active") {
      const day = toDayStartMs(t.date);
      const sameDay = Object.values(tasks).filter(x => x.date === day && x.state === "active");
      if (sameDay.length > 3) {
        // overflow → demote to completed
        t.state = "completed";
        t.completedAt = Date.now();
      }
    }
  }

  return state;
}

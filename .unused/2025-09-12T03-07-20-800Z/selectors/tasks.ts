// src/selectors/tasks.ts
// Bridge selectors re-exporting from stores/tasks to keep view imports stable.

import * as T from "@/stores/tasks";

export const selectActiveByDay = (dayMs: number) => T.selectActiveByDay(dayMs);
export const selectCompletedByDay = (dayMs: number) => T.selectCompletedByDay(dayMs);
export const selectVisible3ByDay = (dayMs: number) => T.selectVisible3ByDay(dayMs);

export const selectActiveCountByDay = (dayMs: number): number => {
  const list = T.selectActiveByDay ? T.selectActiveByDay(dayMs) : [];
  return Array.isArray(list) ? list.length : 0;
};

export type Task = T.Task;

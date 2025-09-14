// src/stores/goals.ts
// Temporary compat store for weekly goals. In-memory only, no persistence yet.

export type Goal = {
  id: string;
  title: string;
  weekStartMs: number;
  done: boolean;
  updatedAt: number;
};

// Simple in-memory record
let _goals: Record<string, Goal> = {};

export const goalsStore = {
  get: () => ({ items: _goals }),
  set: (state: { items: Record<string, Goal> }) => { _goals = state.items; },
};

export function listForWeek(weekStartMs: number): Goal[] {
  return Object.values(_goals).filter((g) => g.weekStartMs === weekStartMs);
}

export function addGoal(input: { title: string; weekStartMs: number }): Goal {
  const goal: Goal = {
    id: `goal_${Date.now()}`,
    title: input.title.trim(),
    weekStartMs: input.weekStartMs,
    done: false,
    updatedAt: Date.now(),
  };
  _goals[goal.id] = goal;
  return goal;
}

export function markComplete(id: string): void {
  const g = _goals[id];
  if (g) {
    _goals[id] = { ...g, done: true, updatedAt: Date.now() };
  }
}


// --- extra compat for GoalsSection & QuarterSection ---
export function renameGoal(id: string, title: string): void {
  if ((_goals as any)[id]) { _goals[id] = { ..._goals[id], title: title.trim(), updatedAt: Date.now() }; }
}
export function markIncomplete(id: string): void {
  if ((_goals as any)[id]) { _goals[id] = { ..._goals[id], done: false, updatedAt: Date.now() }; }
}
export function archiveGoal(_id: string): void { /* no-op stub */ }
export function removeGoal(id: string): void { delete (_goals as any)[id]; }
export function useQuarterGoals(_quarterStartMs: number): Goal[] { return Object.values(_goals); }


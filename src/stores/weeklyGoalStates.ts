// src/stores/weeklyGoalStates.ts

/**
 * Canonical weekly-goal states used across the app.
 * String union avoids enum bloat in persisted JSON and keeps diff-friendly.
 */
export const WeeklyGoalStates = [
  "unset",
  "planned",
  "in_progress",
  "done",
  "skipped",
] as const;

export type WeeklyGoalState = typeof WeeklyGoalStates[number];

/** Normalize any input into a valid WeeklyGoalState. */
export function normalizeState(x: any): WeeklyGoalState {
  if (typeof x === "string") {
    const v = x.toLowerCase();
    if ((WeeklyGoalStates as readonly string[]).includes(v)) return v as WeeklyGoalState;
    if (v === "true" || v === "1" || v === "yes") return "done";
    if (v === "false" || v === "0" || v === "no") return "unset";
  }
  if (typeof x === "boolean") return x ? "done" : "unset";
  if (typeof x === "number") return x > 0 ? "done" : "unset";
  return "unset";
}

/** Cycle through states for UI tap-to-advance UX. */
export function nextState(prev: WeeklyGoalState): WeeklyGoalState {
  switch (prev) {
    case "unset":
      return "planned";
    case "planned":
      return "in_progress";
    case "in_progress":
      return "done";
    case "done":
      return "skipped";
    case "skipped":
      return "unset";
  }
}

/** Simple boolean toggle path used by checkboxes. */
export function toggleBinary(prev: WeeklyGoalState | undefined): WeeklyGoalState {
  return prev === "done" ? "unset" : "done";
}

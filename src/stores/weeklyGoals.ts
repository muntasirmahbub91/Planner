// src/stores/weeklyGoals.ts
import { create } from "zustand";

/* ---------- Types ---------- */
export type GoalStatus = "planned" | "done";

export interface WeekGoals {
  goals: Record<string, GoalStatus>; // key = goal text
}

interface WeeklyGoalsState {
  weeks: Record<number, WeekGoals>; // key = weekStart (ms)
  setGoal: (weekStart: number, goal: string, status?: GoalStatus) => void;
  toggleGoal: (weekStart: number, goal: string) => void;
  clearGoal: (weekStart: number, goal: string) => void;
  moveGoal: (fromWeek: number, toWeek: number, goal: string) => boolean;
  _hydrate: (data: Partial<Pick<WeeklyGoalsState, "weeks">>) => void;
}

/* ---------- Persistence ---------- */
const LS_KEY = "weeklyGoals.v1";

function loadInitial(): Record<number, WeekGoals> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.weeks) return parsed.weeks as Record<number, WeekGoals>;
    if (parsed && typeof parsed === "object") return parsed as Record<number, WeekGoals>;
    return {};
  } catch {
    return {};
  }
}

function save(state: WeeklyGoalsState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ weeks: state.weeks }));
  } catch {
    // ignore quota or private mode
  }
}

/* ---------- Store ---------- */
export const useWeeklyGoals = create<WeeklyGoalsState>((set, get) => ({
  weeks: loadInitial(),

  setGoal: (weekStart, goal, status = "planned") => {
    if (!goal.trim()) return;
    set((s) => {
      const w = ensureWeek(s.weeks, weekStart);
      w.goals[goal] = status;
      const next = { ...s, weeks: { ...s.weeks, [weekStart]: { goals: { ...w.goals } } } };
      save(next);
      return next;
    });
  },

  toggleGoal: (weekStart, goal) => {
    set((s) => {
      const w = ensureWeek(s.weeks, weekStart);
      const cur = w.goals[goal];
      if (!cur) return s;
      w.goals[goal] = cur === "done" ? "planned" : "done";
      const next = { ...s, weeks: { ...s.weeks, [weekStart]: { goals: { ...w.goals } } } };
      save(next);
      return next;
    });
  },

  clearGoal: (weekStart, goal) => {
    set((s) => {
      const w = ensureWeek(s.weeks, weekStart);
      if (!w.goals[goal]) return s;
      const { [goal]: _, ...rest } = w.goals;
      const next = { ...s, weeks: { ...s.weeks, [weekStart]: { goals: rest } } };
      save(next);
      return next;
    });
  },

  moveGoal: (fromWeek, toWeek, goal) => {
    if (fromWeek === toWeek) return false;
    const s = get();
    const src = ensureWeek(s.weeks, fromWeek);
    const dst = ensureWeek(s.weeks, toWeek);
    const status = src.goals[goal];
    if (!status) return false;
    // capacity guard: allow max 3 in target
    if (Object.keys(dst.goals).length >= 3) return false;

    // mutate via set to ensure subscribers fire and persistence runs
    set((st) => {
      const srcW = ensureWeek(st.weeks, fromWeek);
      const dstW = ensureWeek(st.weeks, toWeek);

      // add to target
      dstW.goals[goal] = status;
      // remove from source
      const { [goal]: __, ...srcRest } = srcW.goals;

      const nextWeeks = {
        ...st.weeks,
        [fromWeek]: { goals: srcRest },
        [toWeek]: { goals: { ...dstW.goals } },
      };
      const next = { ...st, weeks: nextWeeks };
      save(next);
      return next;
    });

    return true;
  },

  _hydrate: (data) =>
    set((s) => {
      const next = { ...s, ...data, weeks: { ...s.weeks, ...(data.weeks || {}) } };
      save(next);
      return next;
    }),
}));

/* ---------- Helpers (non-hook API) ---------- */
function ensureWeek(weeks: Record<number, WeekGoals>, weekStart: number): WeekGoals {
  if (!weeks[weekStart]) weeks[weekStart] = { goals: {} };
  return weeks[weekStart];
}

/** Read-only accessor used by views without forcing a re-render */
export function getWeek(weekStart: number): WeekGoals {
  const w = useWeeklyGoals.getState().weeks[weekStart];
  return w ?? { goals: {} };
}

/** Programmatic setters used by views */
export function setGoal(weekStart: number, goal: string, status: GoalStatus = "planned") {
  useWeeklyGoals.getState().setGoal(weekStart, goal, status);
}
export function toggleGoal(weekStart: number, goal: string) {
  useWeeklyGoals.getState().toggleGoal(weekStart, goal);
}
export function clearGoal(weekStart: number, goal: string) {
  useWeeklyGoals.getState().clearGoal(weekStart, goal);
}

/** Move and preserve status. Returns false if blocked or not found. */
export function moveGoal(fromWeek: number, toWeek: number, goal: string): boolean {
  return useWeeklyGoals.getState().moveGoal(fromWeek, toWeek, goal);
}

/* ---------- Optional: migration hook ---------- */
// Example: rename LS key, merge older shapes, etc.
// Immediately run once on import to normalize persisted data.
(function migrateOnce() {
  const state = useWeeklyGoals.getState();
  // add any future migrations here
  save(state);
})();

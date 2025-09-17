// src/stores/weeklyGoals.ts
import { create } from "zustand";
import { WEEK_START_DOW, weekStartMs } from "@/stores/dateStore";
import { normalizeState, toggleBinary } from "@/stores/weeklyGoalStates";
import type { WeeklyGoalState } from "@/stores/weeklyGoalStates";

/* =======================
   Types
   ======================= */
export type WeekKey = number; // local-midnight ms at week start

export type WeeklyGoalsForWeek = {
  weekStartMs: WeekKey;
  /** Arbitrary goal key -> state */
  goals: Record<string, WeeklyGoalState>;
};

type State = {
  byWeek: Record<WeekKey, WeeklyGoalsForWeek>;
  version: number; // bump to notify subscribers
  // actions
  setGoal: (weekAnchorMs: number, key: string, state: WeeklyGoalState | boolean | string | number) => void;
  toggleGoal: (weekAnchorMs: number, key: string) => void;
  clearGoal: (weekAnchorMs: number, key: string) => void;
  clearWeek: (weekAnchorMs: number) => void;
  hydrate: (data: Partial<Pick<State, "byWeek">>) => void;
};

/* =======================
   Persistence
   ======================= */
const STORAGE_KEY = "weeklyGoalsStore.v1";

function readStorage(): Partial<Pick<State, "byWeek">> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const src: any = parsed.byWeek || parsed.weeks || {};
    const byWeek: Record<WeekKey, WeeklyGoalsForWeek> = {};

    for (const k of Object.keys(src)) {
      const wkAny = src[k];
      const wkMs = normalizeWeekStartKey(k);
      const goals: Record<string, WeeklyGoalState> = {};
      const g = wkAny?.goals || wkAny || {};
      if (g && typeof g === "object") {
        for (const goalKey of Object.keys(g)) {
          goals[goalKey] = normalizeState(g[goalKey]);
        }
      }
      byWeek[wkMs] = { weekStartMs: wkMs, goals };
    }
    return { byWeek };
  } catch {
    return {};
  }
}

function writeStorage(get: () => State) {
  try {
    const { byWeek } = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ byWeek }));
  } catch {
    // ignore quota/SSR
  }
}

/* =======================
   Helpers
   ======================= */
function normalizeWeekStartKey(k: string | number): WeekKey {
  const n = typeof k === "number" ? k : Number(k);
  const ms = Number.isFinite(n) ? n : Date.now();
  // Align to configured week start to avoid anchor drift
  return weekStartMs(ms, WEEK_START_DOW);
}

function commit(set: any, get: () => State, updater: (s: State) => void) {
  set((s: State) => {
    const draft = { ...s };
    updater(draft);
    draft.version = (draft.version || 0) + 1;
    return draft;
  });
  writeStorage(get);
}

/* =======================
   Store
   ======================= */
export const useWeeklyGoals = create<State>((set, get) => {
  const loaded = readStorage();
  const byWeek = loaded.byWeek || {};

  return {
    byWeek,
    version: 0,

    hydrate(data) {
      commit(set, get, (s) => {
        if (data.byWeek) s.byWeek = data.byWeek;
      });
    },

    setGoal(weekAnchorMs, key, state) {
      const wk = weekStartMs(weekAnchorMs, WEEK_START_DOW) as WeekKey;
      const val = normalizeState(state);
      commit(set, get, (s) => {
        const cur = s.byWeek[wk] ?? { weekStartMs: wk, goals: {} };
        s.byWeek[wk] = { weekStartMs: wk, goals: { ...cur.goals, [key]: val } };
      });
    },

    toggleGoal(weekAnchorMs, key) {
      const wk = weekStartMs(weekAnchorMs, WEEK_START_DOW) as WeekKey;
      commit(set, get, (s) => {
        const cur = s.byWeek[wk] ?? { weekStartMs: wk, goals: {} };
        const next = toggleBinary(cur.goals[key]);
        s.byWeek[wk] = { weekStartMs: wk, goals: { ...cur.goals, [key]: next } };
      });
    },

    clearGoal(weekAnchorMs, key) {
      const wk = weekStartMs(weekAnchorMs, WEEK_START_DOW) as WeekKey;
      commit(set, get, (s) => {
        const cur = s.byWeek[wk];
        if (!cur) return;
        const goals = { ...cur.goals };
        delete goals[key];
        s.byWeek[wk] = { weekStartMs: wk, goals };
      });
    },

    clearWeek(weekAnchorMs) {
      const wk = weekStartMs(weekAnchorMs, WEEK_START_DOW) as WeekKey;
      commit(set, get, (s) => {
        delete s.byWeek[wk];
      });
    },
  };
});

/* =======================
   Accessors (non-reactive)
   ======================= */
export function getWeek(weekAnchorMs: number): WeeklyGoalsForWeek {
  const wk = weekStartMs(weekAnchorMs, WEEK_START_DOW) as WeekKey;
  return useWeeklyGoals.getState().byWeek[wk] ?? { weekStartMs: wk, goals: {} };
}

export function getGoal(weekAnchorMs: number, key: string): WeeklyGoalState | undefined {
  return getWeek(weekAnchorMs).goals[key];
}

export function listWeeks(): WeekKey[] {
  return Object.keys(useWeeklyGoals.getState().byWeek)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

/* =======================
   Thin re-exports for components
   ======================= */
export function setGoal(weekAnchorMs: number, key: string, state: WeeklyGoalState | boolean | string | number) {
  return useWeeklyGoals.getState().setGoal(weekAnchorMs, key, state);
}
export function toggleGoal(weekAnchorMs: number, key: string) {
  return useWeeklyGoals.getState().toggleGoal(weekAnchorMs, key);
}
export function clearGoal(weekAnchorMs: number, key: string) {
  return useWeeklyGoals.getState().clearGoal(weekAnchorMs, key);
}
export function clearWeek(weekAnchorMs: number) {
  return useWeeklyGoals.getState().clearWeek(weekAnchorMs);
}

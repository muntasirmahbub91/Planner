// src/stores/habitsStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

/* ===== Local time-safe epoch-day ===== */
export const epochDay = (d = new Date()) => {
  const ms = d.getTime();
  const tz = d.getTimezoneOffset() * 60_000; // minutes → ms
  return Math.floor((ms - tz) / 86_400_000);
};

export type Habit = {
  id: string;
  name: string;
  /** Per-day completion: key = epochDay, value = true */
  log: Record<number, boolean>;
  createdAt: number;
  updatedAt: number;
};

type State = {
  habits: Habit[];
  add: (name: string) => string;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;

  /** Set/unset a specific calendar day (epochDay) */
  setForDay: (id: string, day: number, value: boolean) => void;
  /** Toggle convenience */
  toggleForDay: (id: string, day: number) => void;

  /** Legacy: index 0..6 maps to [today-6..today] */
  setToggle?: (id: string, index: number, value: boolean) => void;
};

const now = () => Date.now();
const uid = () =>
  (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase();

/* ===== Store ===== */
export const useHabitsStore = create<State>()(
  persist<State>(
    (set, get) => ({
      habits: [],

      add: (name) => {
        const h: Habit = {
          id: uid(),
          name: name.trim() || "Untitled",
          log: {},
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ habits: [h, ...s.habits] }));
        return h.id;
      },

      rename: (id, name) =>
        set((s) => ({
          habits: s.habits.map((h) =>
            h.id === id ? { ...h, name: name.trim() || "Untitled", updatedAt: now() } : h
          ),
        })),

      remove: (id) =>
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),

      setForDay: (id, day, value) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== id) return h;
            const log = { ...h.log };
            if (value) log[day] = true;
            else delete log[day];
            return { ...h, log, updatedAt: now() };
          }),
        })),

      toggleForDay: (id, day) => {
        const h = get().habits.find((x) => x.id === id);
        const cur = !!h?.log[day];
        get().setForDay(id, day, !cur);
      },

      // Legacy compatibility: 0..6 -> [today-6..today]
      setToggle: (id, index, value) => {
        const base = epochDay();
        const day = base - 6 + index;
        get().setForDay(id, day, value);
      },
    }),
    {
      name: "habits.v2",
      version: 2,
      // Migrate from v1 {toggles:boolean[7]} to {log:Record<epochDay,boolean>}
      migrate: (persisted: any, fromVersion?: number) => {
        if (!persisted || fromVersion >= 2) return persisted;
        const base = epochDay();
        const mapHabit = (h: any): Habit => {
          if (h && typeof h === "object" && h.log && typeof h.log === "object") {
            return h as Habit;
          }
          const log: Record<number, boolean> = {};
          const arr: boolean[] = Array.isArray(h?.toggles) ? h.toggles : [];
          for (let i = 0; i < arr.length; i++) {
            if (arr[i]) log[base - 6 + i] = true;
          }
          return {
            id: h?.id || uid(),
            name: (h?.name || "Untitled").toString(),
            log,
            createdAt: Number(h?.createdAt) || now(),
            updatedAt: now(),
          };
        };
        return {
          ...persisted,
          habits: Array.isArray(persisted?.habits) ? persisted.habits.map(mapHabit) : [],
        };
      },
    }
  )
);

/* Test helper */
export function __resetHabitsForTests() {
  useHabitsStore.setState({ habits: [] });
}

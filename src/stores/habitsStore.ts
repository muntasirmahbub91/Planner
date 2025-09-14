import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Habit = {
  id: string;
  name: string;
  toggles: boolean[]; // length 7 (Sun..Sat)
  createdMs: number;
};

type HabitsState = {
  habits: Habit[];
  add(name: string): void;
  rename(id: string, name: string): void;
  setToggle(id: string, dayIdx: number, next?: boolean): void;
  remove(id: string): void;
  clear(): void;
};

function ensureSeven(a: boolean[] = []): boolean[] {
  const out = a.slice(0, 7);
  while (out.length < 7) out.push(false);
  return out;
}

const migrate = (habits: Habit[] = []): Habit[] =>
  habits.map(h => ({
    id: h.id || Math.random().toString(36).slice(2, 10),
    name: (h.name ?? "").trim() || "HABIT",
    toggles: ensureSeven(h.toggles),
    createdMs: h.createdMs ?? Date.now(),
  }));

export const useHabitsStore = create<HabitsState>()(
  persist(
    (set, get) => ({
      habits: [],
      add(name) {
        const n = (name ?? "").trim() || `HABIT ${get().habits.length + 1}`;
        const next: Habit = {
          id: Math.random().toString(36).slice(2, 10),
          name: n,
          toggles: ensureSeven([]),
          createdMs: Date.now(),
        };
        set({ habits: [...get().habits, next] });
      },
      rename(id, name) {
        const n = (name ?? "").trim();
        if (!n) return;
        set({ habits: get().habits.map(h => (h.id === id ? { ...h, name: n } : h)) });
      },
      setToggle(id, dayIdx, next) {
        if (dayIdx < 0 || dayIdx > 6) return;
        set({
          habits: get().habits.map(h => {
            if (h.id !== id) return h;
            const t = ensureSeven(h.toggles);
            const val = typeof next === "boolean" ? next : !t[dayIdx];
            const nt = t.slice(); nt[dayIdx] = val;
            return { ...h, toggles: nt };
          }),
        });
      },
      remove(id) {
        set({ habits: get().habits.filter(h => h.id !== id) });
      },
      clear() { set({ habits: [] }); },
    }),
    {
      name: "planner.habits.v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ habits: s.habits }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const current = state.habits;
        if (current) state.habits = migrate(current);
      },
    }
  )
);

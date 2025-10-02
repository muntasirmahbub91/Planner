// src/stores/weight.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** Types */
export type Units = "kg" | "lb";
export type WeightEntry = { date: string; kg: number; ts: number };

type State = {
  entries: WeightEntry[]; // unsorted array
  units: Units;
};

type Actions = {
  setUnits: (u: Units) => void;
  addOrUpdate: (dateISO: string, kg: number) => void;
  remove: (dateISO: string) => void;
  get: (dateISO: string) => WeightEntry | undefined;
  clearAll: () => void;
};

export type WeightStore = State & Actions;

/** Helpers */
const key = "weights.v1";

const safeStorage =
  typeof window !== "undefined" && window?.localStorage
    ? createJSONStorage<WeightStore>(() => window.localStorage)
    : undefined;

/** Store */
export const useWeightStore = create<WeightStore>()(
  persist(
    (set, get) => ({
      entries: [],
      units: "kg",

      setUnits: (u) => set({ units: u }),

      addOrUpdate: (dateISO, kg) => {
        const now = Date.now();
        const { entries } = get();

        const i = entries.findIndex((e) => e.date === dateISO);
        if (i >= 0) {
          const next = entries.slice();
          next[i] = { ...next[i], kg, ts: now };
          set({ entries: next });
        } else {
          set({
            entries: [...entries, { date: dateISO, kg, ts: now }],
          });
        }
      },

      remove: (dateISO) => {
        const { entries } = get();
        set({ entries: entries.filter((e) => e.date !== dateISO) });
      },

      get: (dateISO) => get().entries.find((e) => e.date === dateISO),

      clearAll: () => set({ entries: [] }),
    }),
    {
      name: key,
      version: 1,
      storage: safeStorage,
      // Basic sort/cleanup on rehydrate
      migrate: (state: any, _v) => {
        if (!state) return state;
        const seen = new Set<string>();
        const dedup: WeightEntry[] = [];
        for (const e of state.entries ?? []) {
          if (!e?.date || typeof e.kg !== "number") continue;
          if (seen.has(e.date)) continue;
          seen.add(e.date);
          dedup.push({
            date: String(e.date),
            kg: Number(e.kg),
            ts: typeof e.ts === "number" ? e.ts : Date.now(),
          });
        }
        dedup.sort((a, b) => a.ts - b.ts);
        return {
          entries: dedup,
          units: state.units === "lb" ? "lb" : "kg",
        } as State;
      },
      partialize: (s) => ({ entries: s.entries, units: s.units }),
    }
  )
);

// src/stores/habitsStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { epochDay, DAY_MS } from "@/stores/dateStore";

/* =======================
   Types
   ======================= */
export type Habit = {
  id: string;
  name: string;
  createdAtMs: number;
  /** Map of epochDay -> true when completed */
  log: Record<number, boolean>;
  note?: string;
  color?: string;
};

type State = {
  byId: Record<string, Habit>;
  order: string[]; // stable display order
  version: number; // bump to notify subscribers
  // actions
  add: (name: string, opts?: { color?: string; note?: string }) => string;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  /**
   * Toggle or set a day's value.
   * @param weekStartMs Local midnight of week start (aligned to app's WEEK_START_DOW)
   * @param dayIndex 0..6 offset from weekStart
   * @param value If omitted, toggles. If boolean, sets explicitly.
   */
  toggleDay: (habitId: string, weekStartMs: number, dayIndex: number, value?: boolean) => void;
};

/* =======================
   Helpers
   ======================= */
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function dayFromWeekIndex(weekStartMs: number, dayIndex: number): number {
  // Clamp to 0..6 defensively
  const idx = Math.max(0, Math.min(6, Math.trunc(dayIndex)));
  return epochDay(weekStartMs + idx * DAY_MS);
}

/* =======================
   Store (persisted)
   ======================= */
export const useHabits = create<State>()(
  persist(
    (set, get) => ({
      byId: {},
      order: [],
      version: 0,

      add(name, opts) {
        const id = uid();
        const h: Habit = {
          id,
          name: name.trim(),
          createdAtMs: Date.now(),
          log: {},
          color: opts?.color,
          note: opts?.note,
        };
        set((s) => ({
          byId: { ...s.byId, [id]: h },
          order: s.order.includes(id) ? s.order : [...s.order, id],
          version: s.version + 1,
        }));
        return id;
      },

      rename(id, name) {
        set((s) => {
          const cur = s.byId[id];
          if (!cur) return s;
          return { ...s, byId: { ...s.byId, [id]: { ...cur, name: name.trim() } }, version: s.version + 1 };
        });
      },

      remove(id) {
        set((s) => {
          if (!s.byId[id]) return s;
          const next = { ...s.byId };
          delete next[id];
          return { byId: next, order: s.order.filter((x) => x !== id), version: s.version + 1 } as State;
        });
      },

      toggleDay(habitId, weekStartMs, dayIndex, value) {
        set((s) => {
          const h = s.byId[habitId];
          if (!h) return s;
          const eDay = dayFromWeekIndex(weekStartMs, dayIndex);
          const cur = !!h.log[eDay];
          const nextVal = typeof value === "boolean" ? value : !cur;
          const nextLog = { ...h.log };
          if (nextVal) nextLog[eDay] = true; else delete nextLog[eDay];
          return { ...s, byId: { ...s.byId, [habitId]: { ...h, log: nextLog } }, version: s.version + 1 };
        });
      },
    }),
    {
      name: "habitsStore.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ byId: s.byId, order: s.order }),
      version: 1,
      migrate: (persisted: any, _version) => {
        // Normalize any legacy shapes if needed
        if (!persisted || typeof persisted !== "object") return { byId: {}, order: [], version: 0 } as State;
        const byId: Record<string, Habit> = {};
        const src = persisted.byId || {};
        for (const k of Object.keys(src)) {
          const h = src[k];
          if (!h) continue;
          const id: string = h.id ?? k;
          const name: string = (h.name ?? h.title ?? "").toString();
          const createdAtMs: number = typeof h.createdAtMs === "number" ? h.createdAtMs : Date.now();
          // Legacy logs may be arrays or object of strings; coerce to Record<number, boolean>
          const log: Record<number, boolean> = {};
          if (Array.isArray(h.log)) {
            for (const d of h.log) {
              const n = typeof d === "number" ? d : Number(d);
              if (Number.isFinite(n)) log[Math.trunc(n)] = true;
            }
          } else if (h.log && typeof h.log === "object") {
            for (const key of Object.keys(h.log)) {
              const n = Number(key);
              if (Number.isFinite(n) && h.log[key]) log[Math.trunc(n)] = true;
            }
          }
          byId[id] = { id, name, createdAtMs, log, note: h.note, color: h.color };
        }
        const order: string[] = Array.isArray(persisted.order) ? persisted.order.filter((id: string) => !!byId[id]) : Object.keys(byId);
        return { byId, order, version: 0 } as State;
      },
    }
  )
);

// Alias to satisfy older imports
export const useHabitsStore = useHabits;

/* =======================
   Accessors (non-reactive)
   ======================= */
export function listAll(): Habit[] {
  const { byId, order } = useHabits.getState();
  const arr = order.map((id) => byId[id]).filter(Boolean);
  for (const id of Object.keys(byId)) if (!order.includes(id)) arr.push(byId[id]);
  return arr;
}

export function getWeekLog(habitId: string, weekStartMs: number): boolean[] {
  const h = useHabits.getState().byId[habitId];
  if (!h) return [false, false, false, false, false, false, false];
  return Array.from({ length: 7 }, (_, i) => !!h.log[dayFromWeekIndex(weekStartMs, i)]);
}

/* =======================
   Thin re-exports for components
   ======================= */
export function add(name: string, opts?: { color?: string; note?: string }) {
  return useHabits.getState().add(name, opts);
}
export function rename(id: string, name: string) {
  return useHabits.getState().rename(id, name);
}
export function remove(id: string) {
  return useHabits.getState().remove(id);
}
export function toggleDay(habitId: string, weekStartMs: number, dayIndex: number, value?: boolean) {
  return useHabits.getState().toggleDay(habitId, weekStartMs, dayIndex, value);
}

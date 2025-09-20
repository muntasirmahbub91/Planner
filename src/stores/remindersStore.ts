import { create } from "zustand";

/** A single reminder */
export type Reminder = {
  id: string;
  title: string;
  atMs: number;          // scheduled time (ms)
  snoozeMs?: number;     // optional override time
  done?: boolean;
  windowDays: number;    // visibility horizon in days (>=1)
};

type State = {
  byId: Record<string, Reminder>;
  order: string[];
  add: (r: { title: string; atMs: number; windowDays?: number }) => string;
  update: (id: string, patch: Partial<Omit<Reminder, "id">>) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clearAll: () => void;
};

const STORAGE_KEY = "planner.reminders.v1";
const clampDays = (n?: number) => Math.max(1, Number.isFinite(n as number) ? Number(n) : 7);
const uid = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);

function load(): Pick<State, "byId" | "order"> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { byId: {}, order: [] };
    const parsed = JSON.parse(raw) as { byId: Record<string, any>; order: string[] };
    const byId: Record<string, Reminder> = {};
    const order: string[] = [];
    for (const id of parsed.order ?? []) {
      const r = parsed.byId?.[id];
      if (!r || typeof r.atMs !== "number") continue;
      byId[id] = {
        id,
        title: String(r.title ?? ""),
        atMs: Number(r.atMs),
        snoozeMs: typeof r.snoozeMs === "number" ? r.snoozeMs : undefined,
        done: !!r.done,
        windowDays: clampDays(r.windowDays),
      };
      order.push(id);
    }
    return { byId, order };
  } catch {
    return { byId: {}, order: [] };
  }
}

function save(s: Pick<State, "byId" | "order">) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export const useReminders = create<State>((set, get) => {
  const init = typeof window !== "undefined" ? load() : { byId: {}, order: [] };
  return {
    byId: init.byId,
    order: init.order,

    add: ({ title, atMs, windowDays }) => {
      const id = uid();
      const r: Reminder = {
        id,
        title: String(title).trim(),
        atMs: Number(atMs),
        windowDays: clampDays(windowDays),
        done: false,
      };
      set((s) => {
        const byId = { ...s.byId, [id]: r };
        const order = [...s.order, id];
        save({ byId, order });
        return { byId, order };
      });
      return id;
    },

    update: (id, patch) => {
      set((s) => {
        const cur = s.byId[id];
        if (!cur) return {};
        const next: Reminder = {
          ...cur,
          ...patch,
          windowDays: clampDays(patch.windowDays ?? cur.windowDays),
        };
        const byId = { ...s.byId, [id]: next };
        save({ byId, order: s.order });
        return { byId };
      });
    },

    remove: (id) =>
      set((s) => {
        if (!s.byId[id]) return {};
        const byId = { ...s.byId };
        delete byId[id];
        const order = s.order.filter((x) => x !== id);
        save({ byId, order });
        return { byId, order };
      }),

    toggle: (id) => {
      const r = get().byId[id];
      if (r) get().update(id, { done: !r.done });
    },

    clearAll: () => {
      const next = { byId: {}, order: [] };
      save(next);
      set(next);
    },
  };
});

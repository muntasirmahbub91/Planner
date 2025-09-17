// src/stores/tasksStore.ts
import { create } from "zustand";
import { DAY_MS } from "@/stores/dateStore";

/* =======================
   Types
   ======================= */

export type Task = {
  id: string;
  title: string;
  dueMs: number | null;       // local-midnight ms or null for undated
  urgent?: boolean;
  important?: boolean;
  done?: boolean;             // explicit done flag
  tri?: 0 | 1;                // legacy toggle used by UI (1 = done)
  completedAt?: number;       // ms timestamp when marked done
  note?: string;
  goalId?: string | null;     // optional link to a Goal
};

type State = {
  byId: Record<string, Task>;
  order: string[];            // stable ids order
  version: number;            // bump to notify subscribers
  // actions
  hydrate: (data: Partial<Pick<State, "byId" | "order">>) => void;
  add: (input: { title: string; dueMs: number | null; urgent?: boolean; important?: boolean; note?: string; goalId?: string | null }) => string;
  update: (id: string, patch: Partial<Omit<Task, "id">>) => void;
  remove: (id: string) => void;
  setDone: (id: string, next: boolean) => void;
  toggleDone: (id: string, next?: boolean) => void;
  clearDate: (id: string) => void;
  setGoal: (id: string, goalId: string | null) => void;
};

const STORAGE_KEY = "tasksStore.v1";

/* =======================
   Persistence
   ======================= */

function readStorage(): Partial<Pick<State, "byId" | "order">> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const byId: Record<string, Task> = {};
    const src: Record<string, any> = parsed.byId || {};
    for (const k of Object.keys(src)) {
      const t = normalizeTask(src[k]);
      if (t) byId[k] = t;
    }
    const order: string[] = Array.isArray(parsed.order) ? parsed.order.filter((id: string) => !!byId[id]) : [];
    return { byId, order };
  } catch {
    return {};
  }
}

function writeStorage(get: () => State) {
  try {
    const { byId, order } = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ byId, order }));
  } catch {
    // ignore quota/SSR
  }
}

/* =======================
   Helpers
   ======================= */

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Accept legacy aliases and return canonical Task or null. */
function normalizeTask(input: any): Task | null {
  if (!input) return null;
  const id: string = input.id ?? input._id ?? uid();

  // title
  const title: string = input.title ?? input.text ?? input.name ?? "";

  // dueMs: prefer dueMs, accept when/at/due/dueDate; coerce seconds→ms
  let dueMs: number | null = null;
  const rawDue =
    input.dueMs ?? input.due ?? input.dueDate ?? input.when ?? input.at ?? null;

  if (typeof rawDue === "number") {
    const ms = rawDue < 1e11 ? rawDue * 1000 : rawDue;
    dueMs = Number.isFinite(ms) ? ms : null;
  } else if (typeof rawDue === "string") {
    const parsed = Date.parse(rawDue);
    dueMs = Number.isFinite(parsed) ? parsed : null;
  }

  // flags
  const urgent: boolean | undefined = input.urgent ?? undefined;
  const important: boolean | undefined = input.important ?? undefined;

  // done/tri
  const tri: 0 | 1 | undefined =
    typeof input.tri === "number" ? (input.tri ? 1 : 0) : undefined;
  const done: boolean =
    typeof input.done === "boolean" ? input.done : tri === 1;

  const completedAt: number | undefined =
    typeof input.completedAt === "number"
      ? (input.completedAt < 1e11 ? input.completedAt * 1000 : input.completedAt)
      : undefined;

  const note: string | undefined = input.note ?? input.notes ?? undefined;

  // goal link (accept multiple legacy aliases)
  const goalId: string | null | undefined =
    input.goalId ?? input.goal_id ?? input.gid ?? input.goal ?? null;

  return { id, title, dueMs, urgent, important, done, tri: done ? 1 : 0, completedAt, note, goalId };
}

/* =======================
   Store
   ======================= */

export const useTasks = create<State>((set, get) => {
  const loaded = readStorage();
  const safeById: Record<string, Task> = loaded.byId || {};
  const safeOrder: string[] = loaded.order || Object.keys(safeById);

  function commit(updater: (s: State) => void) {
    set((s) => {
      const draft = { ...s };
      updater(draft);
      draft.version = (draft.version || 0) + 1;
      return draft;
    });
    writeStorage(get);
  }

  return {
    byId: safeById,
    order: safeOrder,
    version: 0,

    hydrate(data) {
      commit((s) => {
        if (data.byId) s.byId = data.byId;
        if (data.order) s.order = data.order;
      });
    },

    add(input) {
      const id = uid();
      const t: Task = {
        id,
        title: input.title,
        dueMs: input.dueMs ?? null,
        urgent: !!input.urgent,
        important: !!input.important,
        done: false,
        tri: 0,
        note: input.note,
        goalId: input.goalId ?? null,
      };
      commit((s) => {
        s.byId[id] = t;
        if (!s.order.includes(id)) s.order.push(id);
      });
      return id;
    },

    update(id, patch) {
      commit((s) => {
        const cur = s.byId[id];
        if (!cur) return;
        const next: Task = { ...cur, ...patch, id };
        // keep tri and done consistent
        if (typeof patch.done === "boolean") next.tri = patch.done ? 1 : 0;
        if (typeof patch.tri === "number") next.done = patch.tri === 1;
        s.byId[id] = next;
      });
    },

    remove(id) {
      commit((s) => {
        delete s.byId[id];
        s.order = s.order.filter((x) => x !== id);
      });
    },

    setDone(id, next) {
      commit((s) => {
        const cur = s.byId[id];
        if (!cur) return;
        s.byId[id] = { ...cur, done: next, tri: next ? 1 : 0, completedAt: next ? Date.now() : undefined };
      });
    },

    toggleDone(id, next) {
      commit((s) => {
        const cur = s.byId[id];
        if (!cur) return;
        const value = typeof next === "boolean" ? next : !(cur.done ?? cur.tri === 1);
        s.byId[id] = { ...cur, done: value, tri: value ? 1 : 0, completedAt: value ? Date.now() : undefined };
      });
    },

    clearDate(id) {
      commit((s) => {
        const cur = s.byId[id];
        if (!cur) return;
        s.byId[id] = { ...cur, dueMs: null };
      });
    },

    setGoal(id, goalId) {
      commit((s) => {
        const cur = s.byId[id];
        if (!cur) return;
        s.byId[id] = { ...cur, goalId };
      });
    },
  };
});

/* =======================
   Accessors
   ======================= */

/** All tasks in stable order. */
export function listAll(): Task[] {
  const { byId, order } = useTasks.getState();
  const arr = order.map((id) => byId[id]).filter(Boolean);
  // include any not in order
  for (const id of Object.keys(byId)) if (!order.includes(id)) arr.push(byId[id]);
  return arr;
}

/** Tasks with dueMs in [startMs, endMs). */
export function listInRange(startMs: number, endMs: number): Task[] {
  return listAll().filter((t) => typeof t.dueMs === "number" && t.dueMs! >= startMs && t.dueMs! < endMs);
}

/** Tasks scheduled on the civil day that contains `dayStartMs` (local midnight). */
export function tasksOnDay(dayStartMs: number): Task[] {
  const start = new Date(dayStartMs);
  start.setHours(0, 0, 0, 0);
  const s = start.getTime();
  const e = s + DAY_MS;
  return listInRange(s, e);
}

/** Tasks linked to a given goal. */
export function byGoal(goalId: string): Task[] {
  return listAll().filter((t) => (t.goalId ?? null) === goalId);
}

/* =======================
   Thin action re-exports
   ======================= */

export function add(input: { title: string; dueMs: number | null; urgent?: boolean; important?: boolean; note?: string; goalId?: string | null }) {
  return useTasks.getState().add(input);
}
export function update(id: string, patch: Partial<Omit<Task, "id">>) {
  return useTasks.getState().update(id, patch);
}
export function remove(id: string) {
  return useTasks.getState().remove(id);
}
export function toggleDone(id: string, next?: boolean) {
  return useTasks.getState().toggleDone(id, next);
}
export function setDone(id: string, next: boolean) {
  return useTasks.getState().setDone(id, next);
}
export function clearDate(id: string) {
  return useTasks.getState().clearDate(id);
}
/** Legacy-compatible: update date/flags in one call. */
export function setDateFlags(
  id: string,
  patch: { dueMs?: number | null; urgent?: boolean; important?: boolean }
) {
  return useTasks.getState().update(id, patch);
}
/** Optional helper to set/unset goal link. */
export function setGoal(id: string, goalId: string | null) {
  return useTasks.getState().setGoal(id, goalId);
}

/* =======================
   Legacy aliases for compatibility
   ======================= */
export { listAll as all };

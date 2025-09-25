// src/stores/tasksStore.ts
import { create } from "zustand";
import { DAY_MS } from "@/stores/dateStore";

/* =======================
   Types
   ======================= */

export type Task = {
  id: string;
  title: string;
  dueMs: number | null;          // local-midnight ms or null for undated
  urgent?: boolean;
  important?: boolean;
  done?: boolean;                // explicit done flag (preferred)
  tri?: 0 | 1;                   // legacy toggle used by some UIs (1 = done)
  note?: string;
  goalId?: string | null;
  createdMs: number;             // when task was created
  completedAt?: number;          // when marked done
};

type State = {
  byId: Record<string, Task>;
  order: string[];
  version: number;
  hydrate: (raw?: Partial<Pick<State, "byId" | "order">>) => void;
  add: (input: {
    title: string;
    dueMs: number | null;
    urgent?: boolean;
    important?: boolean;
    note?: string;
    goalId?: string | null;
  }) => string;
  update: (id: string, patch: Partial<Omit<Task, "id">>) => void;
  remove: (id: string) => void;
  setDone: (id: string, next: boolean) => void;
  toggleDone: (id: string, next?: boolean) => void;
  clearDate: (id: string) => void;
  setGoal: (id: string, goalId: string | null) => void;
};

/* =======================
   Storage
   ======================= */

const STORAGE_KEY = "plannerx.tasks.v1";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeTask(input: any): Task | null {
  if (!input) return null;
  const id: string = input.id ?? input._id ?? uid();
  const title: string = String(input.title ?? input.text ?? input.name ?? "").slice(0, 200);

  let dueMs: number | null = null;
  const rawDue = input.dueMs ?? input.due ?? input.date ?? null;
  if (rawDue == null || rawDue === "") {
    dueMs = null;
  } else if (typeof rawDue === "number" && Number.isFinite(rawDue)) {
    dueMs = atLocalMidnight(rawDue);
  } else if (typeof rawDue === "string") {
    const parsed = Date.parse(rawDue);
    dueMs = Number.isFinite(parsed) ? atLocalMidnight(parsed) : null;
  }

  const urgent: boolean | undefined = input.urgent ?? undefined;
  const important: boolean | undefined = input.important ?? undefined;

  const tri: 0 | 1 | undefined =
    typeof input.tri === "number" ? (input.tri ? 1 : 0) : undefined;
  const done: boolean =
    typeof input.done === "boolean" ? input.done : tri === 1;

  const completedAt: number | undefined =
    typeof input.completedAt === "number" ? input.completedAt : done ? Date.now() : undefined;

  const note: string | undefined = input.note ?? undefined;
  const goalId: string | null | undefined =
    input.goalId === undefined ? undefined : input.goalId ?? null;

  const createdMs: number = Number.isFinite(input.createdMs) ? input.createdMs : Date.now();

  return {
    id,
    title,
    dueMs,
    urgent,
    important,
    done,
    tri: done ? 1 : 0,
    note,
    goalId: goalId ?? null,
    createdMs,
    completedAt,
  };
}

function atLocalMidnight(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function readStorage(): Partial<Pick<State, "byId" | "order">> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const src = JSON.parse(raw);
    const byId: Record<string, Task> = {};
    if (src?.byId && typeof src.byId === "object") {
      for (const k of Object.keys(src.byId)) {
        const t = normalizeTask(src.byId[k]);
        if (t) byId[k] = t;
      }
    }
    const order: string[] = Array.isArray(src?.order) ? src.order.filter((x: any) => typeof x === "string") : [];
    return { byId, order };
  } catch {
    return {};
  }
}

function writeStorage(s: State) {
  try {
    const payload = JSON.stringify({ byId: s.byId, order: s.order });
    localStorage.setItem(STORAGE_KEY, payload);
  } catch { /* ignore */ }
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
      const draft: State = { ...s };
      updater(draft);
      draft.version = (draft.version ?? 0) + 1;
      queueMicrotask(() => writeStorage(draft));
      return draft;
    });
  }

  return {
    byId: safeById,
    order: safeOrder,
    version: 0,

    hydrate(raw) {
      const data = raw ?? readStorage();
      commit((s) => {
        if (data.byId) s.byId = data.byId;
        if (data.order) s.order = data.order;
      });
    },

    // ===== IMMUTABLE WRITES =====
    add(input) {
      const id = uid();
      const t: Task = {
        id,
        title: input.title,
        dueMs: input.dueMs ?? null,
        urgent: !!input.urgent,
        important: !!input.important,
        note: input.note,
        goalId: input.goalId ?? null,
        done: false,
        tri: 0,
        createdMs: Date.now(),
      };
      commit((s) => {
        s.byId = { ...s.byId, [id]: t };
        s.order = s.order.includes(id) ? s.order.slice() : [...s.order, id];
      });
      return id;
    },

    update(id, patch) {
      commit((s) => {
        const cur = s.byId[id];
        if (!cur) return;
        const next: Task = { ...cur, ...patch, id };
        if (typeof patch.done === "boolean") next.tri = patch.done ? 1 : 0;
        if (typeof patch.tri === "number") next.done = patch.tri === 1;
        if (typeof next.done === "boolean") {
          next.completedAt = next.done ? (next.completedAt ?? Date.now()) : undefined;
        }
        s.byId = { ...s.byId, [id]: next };
      });
    },

    remove(id) {
      commit((s) => {
        const { [id]: _omit, ...rest } = s.byId;
        s.byId = rest;
        s.order = s.order.filter((x) => x !== id);
      });
    },

    setDone(id, next) {
      commit((s) => {
        const cur = s.byId[id];
        if (!cur) return;
        const upd: Task = {
          ...cur,
          done: next,
          tri: next ? 1 : 0,
          completedAt: next ? Date.now() : undefined,
        };
        s.byId = { ...s.byId, [id]: upd };
      });
    },

    toggleDone(id, next) {
      commit((s) => {
        const cur = s.byId[id];
        if (!cur) return;
        const value = typeof next === "boolean" ? next : !(cur.done ?? cur.tri === 1);
        const upd: Task = {
          ...cur,
          done: value,
          tri: value ? 1 : 0,
          completedAt: value ? Date.now() : undefined,
        };
        s.byId = { ...s.byId, [id]: upd };
      });
    },

    clearDate(id) {
      commit((s) => {
        const cur = s.byId[id];
        if (!cur) return;
        const upd: Task = { ...cur, dueMs: null };
        s.byId = { ...s.byId, [id]: upd };
      });
    },

    setGoal(id, goalId) {
      commit((s) => {
        const cur = s.byId[id];
        if (!cur) return;
        const upd: Task = { ...cur, goalId };
        s.byId = { ...s.byId, [id]: upd };
      });
    },
  };
});

/* =======================
   Accessors
   ======================= */

export function listAll(): Task[] {
  const { byId, order } = useTasks.getState();
  const arr = order.map((id) => byId[id]).filter(Boolean);
  for (const id of Object.keys(byId)) if (!order.includes(id)) arr.push(byId[id]);
  return arr;
}

export function listInRange(startMs: number, endMs: number): Task[] {
  return listAll().filter((t) => t.dueMs != null && t.dueMs >= startMs && t.dueMs < endMs);
}

export function byGoal(goalId: string): Task[] {
  return listAll().filter((t) => (t.goalId ?? null) === goalId);
}

/* =======================
   Thin action re-exports
   ======================= */

export function addTask(input: {
  title: string;
  dueMs: number | null;
  urgent?: boolean;
  important?: boolean;
  note?: string;
  goalId?: string | null;
}) {
  return useTasks.getState().add(input);
}
export function update(id: string, patch: Partial<Omit<Task, "id">>) {
  return useTasks.getState().update(id, patch);
}
export function remove(id: string) {
  return useTasks.getState().remove(id);
}
export function setDone(id: string, next: boolean) {
  return useTasks.getState().setDone(id, next);
}
export function toggleDone(id: string, next?: boolean) {
  return useTasks.getState().toggleDone(id, next);
}
export function clearDate(id: string) {
  return useTasks.getState().clearDate(id);
}
export function setGoal(id: string, goalId: string | null) {
  return useTasks.getState().setGoal(id, goalId);
}

/* Compatibility alias expected by legacy views */
export { listAll as all };

/* NEW: compatibility export to satisfy old imports */
export function setDateFlags(
  id: string,
  patch: { dueMs?: number | null; urgent?: boolean; important?: boolean }
) {
  return useTasks.getState().update(id, patch);
}
export { addTask as add };
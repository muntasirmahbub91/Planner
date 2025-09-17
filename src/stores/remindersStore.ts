// src/stores/remindersStore.ts
import { create } from "zustand";

/* =========================
   Types
   ========================= */
export type Reminder = {
  id: string;
  title: string;
  when: number; // ms since epoch (local)
  done?: boolean;
  note?: string;
  alerts?: { daysBefore: number; count: number } | null;
};

type State = {
  byId: Record<string, Reminder>;
  order: string[];
  version: number;
  hydrate: (data: Partial<Pick<State, "byId" | "order">>) => void;
  add: (input: { title: string; when: number; alerts?: { daysBefore: number; count: number } | null; note?: string }) => string;
  update: (id: string, patch: Partial<Omit<Reminder, "id">>) => void;
  remove: (id: string) => void;
  toggleDone: (id: string, next?: boolean) => void;
};

export type RangePreset = "today" | "tomorrow" | "thisWeek" | "thisMonth" | "thisYear";

const STORAGE_KEY = "remindersStore.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

/* =========================
   Normalizers (accept legacy shapes)
   ========================= */
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function coerceTitle(r: any): string {
  const t =
    r?.title ??
    r?.text ??
    r?.name ??
    r?.label ??
    r?.data?.title ??
    r?.data?.text ??
    null;
  if (typeof t === "string") return t;
  if (t && typeof t === "object") {
    for (const k of ["title", "text", "name", "label"]) {
      if (typeof t[k] === "string") return t[k];
    }
  }
  return "";
}
function coerceWhen(r: any): number {
  const v =
    r?.when ??
    r?.time ??
    r?.date ??
    r?.datetime ??
    r?.timestamp ??
    r?.at ??
    r?.data?.when ??
    r?.data?.time ??
    null;

  if (typeof v === "number") return v < 1e11 ? v * 1000 : v;
  if (typeof v === "string") {
    const p = Date.parse(v);
    if (Number.isFinite(p)) return p;
  }
  if (v && typeof v === "object") {
    const cand = v.value ?? v.iso ?? v.date ?? v.datetime ?? v.time;
    if (typeof cand === "number") return cand < 1e11 ? cand * 1000 : cand;
    if (typeof cand === "string") {
      const p = Date.parse(cand);
      if (Number.isFinite(p)) return p;
    }
  }
  return NaN;
}
function normalizeAlerts(a: any): { daysBefore: number; count: number } | null {
  if (!a) return null;
  const days = Number(a.daysBefore ?? a.days ?? a.startDays ?? 0) || 0;
  const cnt = Number(a.count ?? a.times ?? 0) || 0;
  return days > 0 && cnt > 0 ? { daysBefore: days, count: cnt } : null;
}
function normalizeOne(raw: any): Reminder | null {
  if (!raw) return null;
  const id = String(raw.id ?? raw._id ?? uid());
  const title = coerceTitle(raw);
  const when = coerceWhen(raw);
  const done = !!(raw.done ?? raw.completed ?? (raw.status && String(raw.status).toLowerCase() === "done"));
  const note = typeof raw.note === "string" ? raw.note : undefined;
  const alerts = normalizeAlerts(raw.alerts ?? raw.notification ?? raw.notifications);
  return { id, title, when, done, note, alerts };
}
function normalizeCollection(x: any): Reminder[] {
  const arr: any[] = Array.isArray(x) ? x : x && typeof x === "object" ? Object.values(x) : [];
  const out: Reminder[] = [];
  for (const item of arr) {
    const r = normalizeOne(item);
    if (r && Number.isFinite(r.when)) out.push(r);
  }
  return out;
}

/* =========================
   Persistence
   ========================= */
function readStorage(): Partial<Pick<State, "byId" | "order">> {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem("reminders") ??            // very old key
      localStorage.getItem("remindersStore");         // another legacy
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const src = parsed.byId ? Object.values(parsed.byId) : parsed.order ? parsed.order.map((id: string) => parsed.byId?.[id]) : parsed.items ?? parsed.list ?? parsed;
    const list = normalizeCollection(src);
    const byId: Record<string, Reminder> = {};
    const order: string[] = [];
    for (const r of list) {
      byId[r.id] = r;
      order.push(r.id);
    }
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
    // ignore SSR/quota
  }
}

/* =========================
   Store
   ========================= */
export const useReminders = create<State>((set, get) => {
  const loaded = readStorage();
  const initById = loaded.byId || {};
  const initOrder = loaded.order || Object.keys(initById);

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
    byId: initById,
    order: initOrder,
    version: 0,

    hydrate(data) {
      commit((s) => {
        if (data.byId) s.byId = data.byId;
        if (data.order) s.order = data.order;
      });
    },

    add(input) {
      const id = uid();
      const title = String(input.title ?? "").trim();
      const when = Number(input.when);
      const alerts = input.alerts ? { daysBefore: Number(input.alerts.daysBefore) || 0, count: Number(input.alerts.count) || 0 } : null;
      const r: Reminder = { id, title, when, done: false, alerts, note: input.note };
      commit((s) => {
        s.byId[id] = r;
        if (!s.order.includes(id)) s.order.push(id);
      });
      return id;
    },

    update(id, patch) {
      commit((s) => {
        const cur = s.byId[id];
        if (!cur) return;
        const next: Reminder = {
          ...cur,
          ...patch,
          title: patch.title !== undefined ? String(patch.title) : cur.title,
          when:
            patch.when !== undefined
              ? (typeof patch.when === "number" ? (patch.when < 1e11 ? patch.when * 1000 : patch.when) : Date.parse(String(patch.when)))
              : cur.when,
          alerts: patch.alerts ? { daysBefore: Number(patch.alerts.daysBefore) || 0, count: Number(patch.alerts.count) || 0 } : patch.alerts === null ? null : cur.alerts,
        };
        s.byId[id] = next;
      });
    },

    remove(id) {
      commit((s) => {
        delete s.byId[id];
        s.order = s.order.filter((x) => x !== id);
      });
    },

    toggleDone(id, next) {
      commit((s) => {
        const cur = s.byId[id];
        if (!cur) return;
        const value = typeof next === "boolean" ? next : !cur.done;
        s.byId[id] = { ...cur, done: value };
      });
    },
  };
});

/* =========================
   Accessors
   ========================= */
export function listAll(): Reminder[] {
  const { byId, order } = useReminders.getState();
  const arr = order.map((id) => byId[id]).filter(Boolean);
  for (const id of Object.keys(byId)) if (!order.includes(id)) arr.push(byId[id]);
  return arr;
}

export function listByPreset(now: number, preset: RangePreset): Reminder[] {
  const startOf = (d: Date) => (d.setHours(0, 0, 0, 0), d.getTime());
  const start = startOf(new Date(now));
  const ranges: Record<RangePreset, [number, number]> = {
    today: [start, start + DAY_MS],
    tomorrow: [start + DAY_MS, start + 2 * DAY_MS],
    thisWeek: [start, start + 7 * DAY_MS],
    thisMonth: [start, startOf(new Date(new Date(now).getFullYear(), new Date(now).getMonth() + 1, 1))],
    thisYear: [start, startOf(new Date(new Date(now).getFullYear() + 1, 0, 1))],
  };
  const [s, e] = ranges[preset];
  return listAll().filter((r) => Number.isFinite(r.when) && r.when >= s && r.when < e);
}

/* =========================
   Thin action re-exports
   ========================= */
export function add(input: { title: string; when: number; alerts?: { daysBefore: number; count: number } | null; note?: string }) {
  return useReminders.getState().add(input);
}
export function update(id: string, patch: Partial<Omit<Reminder, "id">>) {
  return useReminders.getState().update(id, patch);
}
export function remove(id: string) {
  return useReminders.getState().remove(id);
}
export function toggleDone(id: string, next?: boolean) {
  return useReminders.getState().toggleDone(id, next);
}

/* Legacy alias, if anything imports it */
export { listAll as all };

// src/stores/projectsStore.ts
import { create } from "zustand";

/* =======================
   Types
   ======================= */
export type Project = {
  id: string;
  name: string;
  createdMs: number; // ms since epoch
  archived: boolean;
  note?: string;
};

export type Goal = {
  id: string;
  projectId: string;
  title: string;
  createdMs: number; // ms since epoch
  archived: boolean;
  note?: string;
};

/* =======================
   Store state
   ======================= */

type State = {
  // Projects
  projectsById: Record<string, Project>;
  projectOrder: string[];
  // Goals
  goalsById: Record<string, Goal>;
  goalOrder: string[];
  // bump to notify subscribers
  version: number;

  // Project actions
  addProject: (name: string, opts?: { note?: string }) => string;
  renameProject: (id: string, name: string) => void;
  archiveProject: (id: string, val: boolean) => void;
  removeProject: (id: string) => void; // cascades to goals

  // Goal actions
  addGoal: (projectId: string, title: string, opts?: { note?: string }) => string;
  updateGoal: (id: string, patch: Partial<Omit<Goal, "id">>) => void;
  archiveGoal: (id: string, val: boolean) => void;
  removeGoal: (id: string) => void;

  // Hydration (internal)
  hydrate: (data: Partial<Pick<State, "projectsById" | "projectOrder" | "goalsById" | "goalOrder">>) => void;
};

/* =======================
   Persistence
   ======================= */
const STORAGE_KEY = "projectsStore.v1";
const LEGACY_KEY_PROJECTS = "data.projects.v1";
const LEGACY_KEY_GOALS = "data.goals.v1";

function readStorage(): Partial<Pick<State, "projectsById" | "projectOrder" | "goalsById" | "goalOrder">> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return readLegacyIfAny();
    const parsed = JSON.parse(raw);
    return {
      projectsById: parsed.projectsById || {},
      projectOrder: Array.isArray(parsed.projectOrder) ? parsed.projectOrder : [],
      goalsById: parsed.goalsById || {},
      goalOrder: Array.isArray(parsed.goalOrder) ? parsed.goalOrder : [],
    };
  } catch {
    return readLegacyIfAny();
  }
}

function readLegacyIfAny(): Partial<Pick<State, "projectsById" | "projectOrder" | "goalsById" | "goalOrder">> {
  try {
    const pRaw = localStorage.getItem(LEGACY_KEY_PROJECTS);
    const gRaw = localStorage.getItem(LEGACY_KEY_GOALS);
    const pArr: any[] = pRaw ? JSON.parse(pRaw) : [];
    const gArr: any[] = gRaw ? JSON.parse(gRaw) : [];
    const projectsById: Record<string, Project> = {};
    const goalsById: Record<string, Goal> = {};

    for (const p of Array.isArray(pArr) ? pArr : []) {
      const proj = normalizeProject(p);
      if (proj) projectsById[proj.id] = proj;
    }
    for (const g of Array.isArray(gArr) ? gArr : []) {
      const goal = normalizeGoal(g);
      if (goal) goalsById[goal.id] = goal;
    }

    const projectOrder = Object.keys(projectsById);
    const goalOrder = Object.keys(goalsById);
    return { projectsById, projectOrder, goalsById, goalOrder };
  } catch {
    return {};
  }
}

function writeStorage(get: () => State) {
  try {
    const { projectsById, projectOrder, goalsById, goalOrder } = get();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ projectsById, projectOrder, goalsById, goalOrder })
    );
  } catch {
    // ignore quota/SSR
  }
}

/* =======================
   Helpers
   ======================= */
function uid(): string {
  try {
    // @ts-ignore crypto may exist in modern browsers
    return crypto.randomUUID();
  } catch {
    return "p_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
}

function normalizeProject(input: any): Project | null {
  if (!input) return null;
  const id: string = input.id ?? input._id ?? uid();
  const name: string = (input.name ?? input.title ?? "").toString();
  const createdMs: number = toMs(input.createdMs ?? Date.now());
  const archived: boolean = !!(input.archived ?? input.isArchived);
  const note: string | undefined = input.note ?? input.notes ?? undefined;
  return { id, name, createdMs, archived, note };
}

function normalizeGoal(input: any): Goal | null {
  if (!input) return null;
  const id: string = input.id ?? input._id ?? uid();
  const projectId: string = (input.projectId ?? input.pid ?? "").toString();
  const title: string = (input.title ?? input.name ?? "").toString();
  const createdMs: number = toMs(input.createdMs ?? Date.now());
  const archived: boolean = !!(input.archived ?? input.isArchived);
  const note: string | undefined = input.note ?? input.notes ?? undefined;
  if (!projectId) return null;
  return { id, projectId, title, createdMs, archived, note };
}

function toMs(x: any): number {
  if (typeof x === "number") return x < 1e11 ? x * 1000 : x;
  if (typeof x === "string") {
    const t = Date.parse(x);
    if (Number.isFinite(t)) return t;
  }
  return Date.now();
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
export const useProjects = create<State>((set, get) => {
  const loaded = readStorage();
  const projectsById = loaded.projectsById || {};
  const projectOrder = (loaded.projectOrder || Object.keys(projectsById)).slice();
  const goalsById = loaded.goalsById || {};
  const goalOrder = (loaded.goalOrder || Object.keys(goalsById)).slice();

  return {
    projectsById,
    projectOrder,
    goalsById,
    goalOrder,
    version: 0,

    hydrate(data) {
      commit(set, get, (s) => {
        if (data.projectsById) s.projectsById = data.projectsById;
        if (data.projectOrder) s.projectOrder = data.projectOrder;
        if (data.goalsById) s.goalsById = data.goalsById;
        if (data.goalOrder) s.goalOrder = data.goalOrder;
      });
    },

    addProject(name, opts) {
      const id = uid();
      const p: Project = { id, name: name.trim(), createdMs: Date.now(), archived: false, note: opts?.note };
      commit(set, get, (s) => {
        s.projectsById[id] = p;
        if (!s.projectOrder.includes(id)) s.projectOrder.push(id);
      });
      return id;
    },

    renameProject(id, name) {
      commit(set, get, (s) => {
        const cur = s.projectsById[id];
        if (!cur) return;
        s.projectsById[id] = { ...cur, name: name.trim() };
      });
    },

    archiveProject(id, val) {
      commit(set, get, (s) => {
        const cur = s.projectsById[id];
        if (!cur) return;
        s.projectsById[id] = { ...cur, archived: !!val };
      });
    },

    removeProject(id) {
      commit(set, get, (s) => {
        if (!s.projectsById[id]) return;
        delete s.projectsById[id];
        s.projectOrder = s.projectOrder.filter((x) => x !== id);
        // cascade delete goals
        for (const gid of Object.keys(s.goalsById)) {
          if (s.goalsById[gid].projectId === id) delete s.goalsById[gid];
        }
        s.goalOrder = s.goalOrder.filter((gid) => s.goalsById[gid] != null);
      });
    },

    addGoal(projectId, title, opts) {
      const id = uid();
      const g: Goal = { id, projectId, title: title.trim(), createdMs: Date.now(), archived: false, note: opts?.note };
      commit(set, get, (s) => {
        s.goalsById[id] = g;
        if (!s.goalOrder.includes(id)) s.goalOrder.unshift(id); // newest first
      });
      return id;
    },

    updateGoal(id, patch) {
      commit(set, get, (s) => {
        const cur = s.goalsById[id];
        if (!cur) return;
        s.goalsById[id] = { ...cur, ...patch, id };
      });
    },

    archiveGoal(id, val) {
      commit(set, get, (s) => {
        const cur = s.goalsById[id];
        if (!cur) return;
        s.goalsById[id] = { ...cur, archived: !!val };
      });
    },

    removeGoal(id) {
      commit(set, get, (s) => {
        if (!s.goalsById[id]) return;
        delete s.goalsById[id];
        s.goalOrder = s.goalOrder.filter((x) => x !== id);
      });
    },
  };
});

/* =======================
   Accessors (non-reactive)
   ======================= */
export function listProjects(opts?: { includeArchived?: boolean }): Project[] {
  const { projectsById, projectOrder } = useProjects.getState();
  const includeArchived = !!opts?.includeArchived;
  const arr = projectOrder.map((id) => projectsById[id]).filter(Boolean) as Project[];
  return includeArchived ? arr : arr.filter((p) => !p.archived);
}

export function getProject(id: string): Project | undefined {
  return useProjects.getState().projectsById[id];
}

export function listGoals(projectId: string, opts?: { includeArchived?: boolean }): Goal[] {
  const { goalsById, goalOrder } = useProjects.getState();
  const includeArchived = !!opts?.includeArchived;
  const arr = goalOrder
    .map((id) => goalsById[id])
    .filter((g): g is Goal => !!g && g.projectId === projectId);
  return includeArchived ? arr : arr.filter((g) => !g.archived);
}

export function countGoals(projectId: string, opts?: { includeArchived?: boolean }): number {
  return listGoals(projectId, opts).length;
}

/* =======================
   Thin re-exports for components
   ======================= */
export function addProject(name: string, opts?: { note?: string }) {
  return useProjects.getState().addProject(name, opts);
}
export function renameProject(id: string, name: string) {
  return useProjects.getState().renameProject(id, name);
}
export function archiveProject(id: string, val: boolean) {
  return useProjects.getState().archiveProject(id, val);
}
export function removeProject(id: string) {
  return useProjects.getState().removeProject(id);
}
export function addGoal(projectId: string, title: string, opts?: { note?: string }) {
  return useProjects.getState().addGoal(projectId, title, opts);
}
export function updateGoal(id: string, patch: Partial<Omit<Goal, "id">>) {
  return useProjects.getState().updateGoal(id, patch);
}
export function archiveGoal(id: string, val: boolean) {
  return useProjects.getState().archiveGoal(id, val);
}
export function removeGoal(id: string) {
  return useProjects.getState().removeGoal(id);
}

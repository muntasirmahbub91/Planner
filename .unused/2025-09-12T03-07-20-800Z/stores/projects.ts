// src/stores/projects.ts
// Projects store with unified persistence, migrations, and undo integration.

import { readWithBackup, atomicJSONWrite } from "@/lib/storage";
import { runMigrations } from "@/migrations";
import { persist } from "@/lib/persist";
import * as undo from "@/lib/undo";
import { scopedId } from "@/lib/ids";

/* ------------------------------- types ---------------------------------- */
export type Subproject = {
  id: string;
  title: string;
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Project = {
  id: string;
  title: string;
  active: boolean;
  archived?: boolean;
  intentions: string[];
  subprojects: Subproject[];
  createdAt: number;
  updatedAt: number;
};

type State = {
  items: Record<string, Project>;
  _schemaVersion?: number;
};

const STORAGE_KEY = "projects.v1";
const ACTIVE_CAP = 3;

/* ------------------------------- state ---------------------------------- */
function empty(): State { return { items: {} }; }

let state: State = (() => {
  const raw = readWithBackup<State>(STORAGE_KEY) ?? empty();
  const migrated = runMigrations<State>(raw);
  if ((raw?._schemaVersion ?? 0) !== (migrated?._schemaVersion ?? 0)) {
    try { atomicJSONWrite(STORAGE_KEY, migrated); } catch (e) { /* noop */ }
  }
  return migrated ?? empty();
})();

function flush() { persist(STORAGE_KEY, state, { debounceMs: 250 }); }

/* -------------------------------- utils --------------------------------- */
function get(id: string): Project | undefined { return state.items[id]; }
function putMany(ps: Project[]) {
  const items = { ...state.items };
  ps.forEach(p => { items[p.id] = p; });
  state = { ...state, items };
  flush();
}
function putOne(p: Project) { putMany([p]); }
function delOne(id: string) {
  const items = { ...state.items };
  delete items[id];
  state = { ...state, items };
  flush();
}

function activeProjects(): Project[] {
  return Object.values(state.items)
    .filter(p => p.active && !p.archived)
    .sort((a, b) => a.updatedAt - b.updatedAt); // oldest first
}

/** Enforce cap; archive oldest overflow in one undo step. */
function ensureActiveCapWithUndo(label = "Enforce project cap") {
  const actives = activeProjects();
  if (actives.length <= ACTIVE_CAP) return;

  const toArchive = actives.slice(0, actives.length - ACTIVE_CAP);
  const snapshots = toArchive.map(p => ({ id: p.id, prev: { active: p.active, archived: !!p.archived } }));
  const now = Date.now();
  const archived = toArchive.map(p => ({ ...p, active: false, archived: true, updatedAt: now }));

  undo.record({
    label,
    inverse: () => {
      const items = { ...state.items };
      for (const s of snapshots) {
        const cur = items[s.id];
        if (cur) items[s.id] = { ...cur, active: s.prev.active, archived: s.prev.archived, updatedAt: Date.now() };
      }
      state = { ...state, items };
      flush();
    },
    redo: () => { putMany(archived); },
  });

  putMany(archived);
}

/* -------------------------------- queries -------------------------------- */
export function listActive(): Project[] {
  return Object.values(state.items)
    .filter(p => p.active && !p.archived)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function listArchived(): Project[] {
  return Object.values(state.items)
    .filter(p => !!p.archived || !p.active)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): Project | undefined { return get(id); }

/* ------------------------------- mutations ------------------------------- */
export function addProject(input: { title: string; intentions?: string[] }): Project {
  const now = Date.now();
  const p: Project = {
    id: scopedId("proj"),
    title: input.title.trim(),
    active: true,
    archived: false,
    intentions: (input.intentions ?? []).map(s => s.trim()).filter(Boolean),
    subprojects: [],
    createdAt: now,
    updatedAt: now,
  };

  undo.record({
    label: "Add project",
    inverse: () => { delOne(p.id); },
    redo: () => { putOne(p); ensureActiveCapWithUndo("Re-enforce project cap"); },
  });

  putOne(p);
  ensureActiveCapWithUndo();
  return p;
}

export function renameProject(id: string, title: string) {
  const cur = get(id); if (!cur) return;
  const next = { ...cur, title: title.trim(), updatedAt: Date.now() };

  undo.record({
    label: "Rename project",
    inverse: () => { putOne(cur); },
    redo: () => { putOne(next); },
  });

  putOne(next);
}

export function setIntentions(id: string, intentions: string[]) {
  const cur = get(id); if (!cur) return;
  const next = { ...cur, intentions: intentions.map(s => s.trim()).filter(Boolean), updatedAt: Date.now() };

  undo.record({
    label: "Edit intentions",
    inverse: () => { putOne(cur); },
    redo: () => { putOne(next); },
  });

  putOne(next);
}

export function archiveProject(id: string) {
  const cur = get(id); if (!cur) return;
  const next = { ...cur, active: false, archived: true, updatedAt: Date.now() };

  undo.record({
    label: "Archive project",
    inverse: () => { putOne(cur); },
    redo: () => { putOne(next); },
  });

  putOne(next);
}

export function unarchiveProject(id: string) {
  const cur = get(id); if (!cur) return;
  const next = { ...cur, active: true, archived: false, updatedAt: Date.now() };

  undo.record({
    label: "Unarchive project",
    inverse: () => { putOne(cur); },
    redo: () => { putOne(next); ensureActiveCapWithUndo("Re-enforce project cap"); },
  });

  putOne(next);
  ensureActiveCapWithUndo();
}

export function removeProject(id: string) {
  const snap = get(id); if (!snap) return;

  undo.record({
    label: "Delete project",
    inverse: () => { putOne(snap); },
    redo: () => { delOne(id); },
  });

  delOne(id);
}

/* ----------------------------- subprojects ------------------------------- */
export function addSubproject(projectId: string, title: string): Subproject | undefined {
  const cur = get(projectId); if (!cur) return;
  const now = Date.now();
  const sp: Subproject = { id: scopedId("sub"), title: title.trim(), createdAt: now, updatedAt: now };
  const next = { ...cur, subprojects: [...cur.subprojects, sp], updatedAt: now };

  undo.record({
    label: "Add subproject",
    inverse: () => { putOne(cur); },
    redo: () => { putOne(next); },
  });

  putOne(next);
  return sp;
}

export function renameSubproject(projectId: string, subId: string, title: string) {
  const cur = get(projectId); if (!cur) return;
  const now = Date.now();
  const next = {
    ...cur,
    subprojects: cur.subprojects.map(s => s.id === subId ? { ...s, title: title.trim(), updatedAt: now } : s),
    updatedAt: now,
  };

  undo.record({
    label: "Rename subproject",
    inverse: () => { putOne(cur); },
    redo: () => { putOne(next); },
  });

  putOne(next);
}

export function archiveSubproject(projectId: string, subId: string) {
  const cur = get(projectId); if (!cur) return;
  const now = Date.now();
  const next = {
    ...cur,
    subprojects: cur.subprojects.map(s => s.id === subId ? { ...s, archived: true, updatedAt: now } : s),
    updatedAt: now,
  };

  undo.record({
    label: "Archive subproject",
    inverse: () => { putOne(cur); },
    redo: () => { putOne(next); },
  });

  putOne(next);
}

export function removeSubproject(projectId: string, subId: string) {
  const cur = get(projectId); if (!cur) return;
  const now = Date.now();
  const removed = cur.subprojects.find(s => s.id === subId);
  const next = {
    ...cur,
    subprojects: cur.subprojects.filter(s => s.id !== subId),
    updatedAt: now,
  };

  undo.record({
    label: "Delete subproject",
    inverse: () => {
      if (removed) putOne({ ...cur, subprojects: [...cur.subprojects, removed], updatedAt: Date.now() });
      else putOne(cur);
    },
    redo: () => { putOne(next); },
  });

  putOne(next);
}


// --- compat hook: useProjects (minimal) ---
export function useProjects(): { items: Record<string, unknown> } {
  try { return { items: (state as any).items ?? {} }; } catch { return { items: {} }; }
}


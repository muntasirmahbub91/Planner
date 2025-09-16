// src/stores/listsStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Checklist = {
  id: string;
  title: string;
  items: ChecklistItem[];
  createdAt: number;
  updatedAt: number;
};

type Place = "before" | "after";

interface ListsState {
  lists: Checklist[];
  _hydrated: boolean;

  addList: (title: string) => string;
  renameList: (listId: string, title: string) => void;
  deleteList: (listId: string) => void;

  addItem: (listId: string, text: string) => string;
  editItem: (listId: string, itemId: string, text: string) => void;
  toggleItem: (listId: string, itemId: string) => void;
  removeItem: (listId: string, itemId: string) => void;
  clearCompleted: (listId: string) => void;

  reorderItem: (
    listId: string,
    sourceId: string,
    targetId: string,
    place: Place
  ) => void;
}

const now = () => Date.now();
const makeId = () =>
  (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase();

function splitByDone(items: ChecklistItem[]) {
  const undone: ChecklistItem[] = [];
  const done: ChecklistItem[] = [];
  for (const it of items) (it.done ? done : undone).push(it);
  return { undone, done };
}
const combine = (undone: ChecklistItem[], done: ChecklistItem[]) => [...undone, ...done];

function safeStorage() {
  try {
    const k = "__z_ok__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return createJSONStorage(() => localStorage);
  } catch {
    return createJSONStorage(
      () =>
        ({
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        } as Storage)
    );
  }
}

export const useLists = create<ListsState>()(
  persist<ListsState>(
    (set, get) => ({
      lists: [],
      _hydrated: false,

      addList: (title) => {
        const list: Checklist = {
          id: makeId(),
          title: title.trim() || "Untitled",
          items: [],
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ lists: [list, ...s.lists] }));
        return list.id;
      },

      renameList: (listId, title) => {
        const t = title.trim() || "Untitled";
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId ? { ...l, title: t, updatedAt: now() } : l
          ),
        }));
      },

      deleteList: (listId) => {
        set((s) => ({ lists: s.lists.filter((l) => l.id !== listId) }));
      },

      addItem: (listId, text) => {
        const t = text.trim();
        const item: ChecklistItem = {
          id: makeId(),
          text: t,
          done: false,
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? { ...l, items: [...l.items, item], updatedAt: now() }
              : l
          ),
        }));
        return item.id;
      },

      editItem: (listId, itemId, text) => {
        const t = text.trim();
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.map((it) =>
                    it.id === itemId ? { ...it, text: t, updatedAt: now() } : it
                  ),
                  updatedAt: now(),
                }
              : l
          ),
        }));
      },

      toggleItem: (listId, itemId) => {
        set((s) => ({
          lists: s.lists.map((l) => {
            if (l.id !== listId) return l;

            let toggled: ChecklistItem | null = null;
            const others: ChecklistItem[] = [];
            for (const it of l.items) {
              if (it.id === itemId) {
                toggled = { ...it, done: !it.done, updatedAt: now() };
              } else {
                others.push(it);
              }
            }
            if (!toggled) return l;

            const { undone, done } = splitByDone(others);
            if (toggled.done) done.push(toggled);
            else undone.push(toggled);

            return { ...l, items: combine(undone, done), updatedAt: now() };
          }),
        }));
      },

      removeItem: (listId, itemId) => {
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.filter((it) => it.id !== itemId),
                  updatedAt: now(),
                }
              : l
          ),
        }));
      },

      clearCompleted: (listId) => {
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.filter((it) => !it.done),
                  updatedAt: now(),
                }
              : l
          ),
        }));
      },

      reorderItem: (listId, sourceId, targetId, place) => {
        set((s) => ({
          lists: s.lists.map((l) => {
            if (l.id !== listId) return l;

            const src = l.items.find((i) => i.id === sourceId);
            const tgt = l.items.find((i) => i.id === targetId);
            if (!src || !tgt) return l;
            if (src.done !== tgt.done) return l;

            const { undone, done } = splitByDone(l.items);
            const group = src.done ? done : undone;

            const from = group.findIndex((i) => i.id === sourceId);
            let to = group.findIndex((i) => i.id === targetId);
            if (from < 0 || to < 0) return l;

            to = place === "after" ? to + 1 : to;

            const next = group.slice();
            const [moved] = next.splice(from, 1);
            next.splice(from < to ? to - 1 : to, 0, moved);

            const items = src.done ? combine(undone, next) : combine(next, done);
            return { ...l, items, updatedAt: now() };
          }),
        }));
      },
    }),
    {
      name: "lists.v1",
      storage: safeStorage(),
      partialize: (s) => ({ lists: s.lists }),
      onRehydrateStorage: () => (state) => state?.setState({ _hydrated: true }),
    }
  )
);

export function __resetListsForTests() {
  useLists.setState({ lists: [] });
}

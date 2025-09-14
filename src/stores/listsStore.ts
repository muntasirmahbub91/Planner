import { create } from "zustand";
import { persist } from "zustand/middleware";

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

function id() {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}

interface ListsState {
  lists: Checklist[];
  addList: (title: string) => string;
  renameList: (listId: string, title: string) => void;
  deleteList: (listId: string) => void;
  addItem: (listId: string, text: string) => string;
  editItem: (listId: string, itemId: string, text: string) => void;
  toggleItem: (listId: string, itemId: string) => void;
  removeItem: (listId: string, itemId: string) => void;
  clearCompleted: (listId: string) => void;
}

export const useLists = create<ListsState>()(
  persist(
    (set) => ({
      lists: [],

      addList: (title) => {
        const newList: Checklist = {
          id: id(),
          title: title.trim() || "Untitled",
          items: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ lists: [newList, ...s.lists] }));
        return newList.id;
      },

      renameList: (listId, title) => {
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? { ...l, title: title.trim() || "Untitled", updatedAt: Date.now() }
              : l
          ),
        }));
      },

      deleteList: (listId) => {
        set((s) => ({ lists: s.lists.filter((l) => l.id !== listId) }));
      },

      addItem: (listId, text) => {
        const newItem: ChecklistItem = {
          id: id(),
          text: text.trim(),
          done: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? { ...l, items: [...l.items, newItem], updatedAt: Date.now() }
              : l
          ),
        }));
        return newItem.id;
      },

      editItem: (listId, itemId, text) => {
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.map((it) =>
                    it.id === itemId
                      ? { ...it, text: text.trim(), updatedAt: Date.now() }
                      : it
                  ),
                  updatedAt: Date.now(),
                }
              : l
          ),
        }));
      },

      toggleItem: (listId, itemId) => {
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.map((it) =>
                    it.id === itemId
                      ? { ...it, done: !it.done, updatedAt: Date.now() }
                      : it
                  ),
                  updatedAt: Date.now(),
                }
              : l
          ),
        }));
      },

      removeItem: (listId, itemId) => {
        set((s) => ({
          lists: s.lists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.filter((it) => it.id !== itemId),
                  updatedAt: Date.now(),
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
                  updatedAt: Date.now(),
                }
              : l
          ),
        }));
      },
    }),
    { name: "lists.v1" }
  )
);

// test helper
export function __resetListsForTests() {
  useLists.setState({ lists: [] });
}

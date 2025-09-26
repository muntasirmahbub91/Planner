// src/stores/journalStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type JournalEntry = {
  id: string;
  title: string;
  text: string;
  date: string;      // ISO: yyyy-mm-dd
  createdAt: number; // ms epoch
  updatedAt: number; // ms epoch
};

type State = {
  entries: Record<string, JournalEntry>;
};

type Actions = {
  add: (e: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => string;
  update: (id: string, patch: Partial<Omit<JournalEntry, 'id' | 'createdAt'>>) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useJournalStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      entries: {},

      add: (e) => {
        const id = uid();
        const now = Date.now();
        const next: JournalEntry = { id, createdAt: now, updatedAt: now, ...e };
        set(s => ({ entries: { ...s.entries, [id]: next } }));
        return id;
      },

      update: (id, patch) =>
        set(s => {
          const prev = s.entries[id];
          if (!prev) return s;
          const next = { ...prev, ...patch, updatedAt: Date.now() };
          return { entries: { ...s.entries, [id]: next } };
        }),

      remove: (id) =>
        set(s => {
          const { [id]: _drop, ...rest } = s.entries;
          return { entries: rest };
        }),

      clear: () => set({ entries: {} }),
    }),
    {
      name: 'planner.journal.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ entries: s.entries }),
      migrate: (state) => state as any,
    }
  )
);

/* -------- Selectors -------- */
export const useAllEntries = () =>
  useJournalStore(s =>
    Object.values(s.entries).sort((a, b) =>
      a.date === b.date ? b.updatedAt - a.updatedAt : b.date.localeCompare(a.date)
    )
  );

export const useEntry = (id: string | null) =>
  useJournalStore(s => (id ? s.entries[id] ?? null : null));

export const useEntriesByDate = (isoDate: string) =>
  useJournalStore(s =>
    Object.values(s.entries)
      .filter(e => e.date === isoDate)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  );

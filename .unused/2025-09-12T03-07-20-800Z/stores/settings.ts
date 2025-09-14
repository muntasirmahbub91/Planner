// src/stores/settings.ts
// App-level preferences. Persisted and versioned.

import { createStore } from "@/lib/store";
import { STORAGE_KEYS, VERSIONS } from "./storage";
import type { WeekStart } from "@/lib/time";

export type Settings = {
  /** 0 = Sunday, 1 = Monday */
  weekStart: WeekStart;
  /** 12 or 24 hour time formatting hint for UI */
  clock: 12 | 24;
};

const fallback: Settings = {
  weekStart: 1,
  clock: 24
};

export const settingsStore = createStore<Settings>({
  key: STORAGE_KEYS.settings,
  version: VERSIONS.settings,
  fallback,
  migrate: (raw: any): Settings => {
    const next: Settings = { ...fallback };
    if (raw && typeof raw === "object") {
      if (raw.weekStart === 0 || raw.weekStart === 1) next.weekStart = raw.weekStart;
      if (raw.clock === 12 || raw.clock === 24) next.clock = raw.clock;
    }
    return next;
  }
});

export function useSettings(): Settings {
  return settingsStore.use();
}

export function getSettings(): Settings {
  return settingsStore.get();
}

export function setWeekStart(weekStart: WeekStart) {
  const s = settingsStore.get();
  settingsStore.set({ ...s, weekStart });
}

export function setClock(clock: 12 | 24) {
  const s = settingsStore.get();
  settingsStore.set({ ...s, clock });
}

import * as mod from "@/stores/reminders";
import React from "react";

type AnyRec = Record<string, any>;
function selectItems(state: AnyRec): any[] {
  return state?.items ?? state?.reminders ?? state?.list ?? [];
}
export function useReminders(): any[] {
  const store: any = (mod as any).useReminders || (mod as any).useReminderStore || (mod as any).default || (mod as any).reminders;
  const useSyncExternalStore: any = (React as any).useSyncExternalStore;

  if (store?.subscribe && store?.getState) {
    return useSyncExternalStore(
      store.subscribe,
      () => selectItems(store.getState()),
      () => selectItems(store.getState())
    );
  }
  if (typeof store === "function") {
    try {
      const slice = store((s: any) => selectItems(s));
      return Array.isArray(slice) ? slice : [];
    } catch {}
  }
  try {
    const raw =
      localStorage.getItem("planner.reminders") ||
      localStorage.getItem("px.reminders") ||
      localStorage.getItem("reminders") ||
      "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

import * as mod from "@/stores/tasks";
import React from "react";

type AnyRec = Record<string, any>;
function selectItems(state: AnyRec): any[] {
  return state?.items ?? state?.tasks ?? state?.list ?? [];
}
export function useTasks(): any[] {
  const store: any = (mod as any).useTasks || (mod as any).useTaskStore || (mod as any).default || (mod as any).tasks;
  // Zustand store: subscribe + getState
  if (store?.subscribe && store?.getState) {
    // useSyncExternalStore avoids tearing and tracks updates
    // Lazy import from React to avoid ESM type issues
    const useSyncExternalStore: any = (React as any).useSyncExternalStore;
    return useSyncExternalStore(
      store.subscribe,
      () => selectItems(store.getState()),
      () => selectItems(store.getState())
    );
  }
  // If your module exports a hook function directly (Zustand style)
  if (typeof store === "function") {
    try {
      const slice = store((s: any) => selectItems(s));
      return Array.isArray(slice) ? slice : [];
    } catch {
      // fall through
    }
  }
  // Fallback: localStorage
  try {
    const raw =
      localStorage.getItem("planner.tasks") ||
      localStorage.getItem("px.tasks") ||
      localStorage.getItem("tasks") ||
      "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

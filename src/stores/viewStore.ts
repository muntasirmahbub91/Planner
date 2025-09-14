import { useSyncExternalStore } from "react";

export type View = "day" | "week" | "month" | "year";

const KEY = "ui.view.v1";
const order: View[] = ["day", "week", "month", "year"];

function safeGetItem(k: string): string | null {
  try { return typeof window !== "undefined" ? window.localStorage.getItem(k) : null; } catch { return null; }
}
function safeSetItem(k: string, v: string) {
  try { if (typeof window !== "undefined") window.localStorage.setItem(k, v); } catch {}
}

let state: View = ((): View => {
  const v = (safeGetItem(KEY) || "day") as View;
  return order.includes(v) ? v : "day";
})();

const listeners = new Set<() => void>();
function emit() { listeners.forEach(fn => fn()); }

export function getView(): View { return state; }
export function setView(next: View) {
  if (state !== next) {
    state = next;
    safeSetItem(KEY, state);
    emit();
  }
}
export function nextView(){ const i = order.indexOf(state); setView(order[(i+1)%order.length]); }
export function prevView(){ const i = order.indexOf(state); setView(order[(i-1+order.length)%order.length]); }

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useView(): View {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

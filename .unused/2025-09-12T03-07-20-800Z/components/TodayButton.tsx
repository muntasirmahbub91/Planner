import React from "react";
import * as date from "@/stores/dateStore";
import "./TodayButton.css";

function startOfTodayMs() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
}

function useJumpToToday() {
  const api: any = date as any;
  // If the store exposes a hook, calling it here is valid; it will subscribe if implemented with Zustand/useSyncExternalStore.
  const store = typeof api.useDateStore === "function" ? api.useDateStore() : null;
  const preferred =
    (typeof api.setToday === "function" && api.setToday) ||
    (store && typeof store.setToday === "function" && store.setToday);

  const fallback = () => {
    const t = startOfTodayMs();
    // Try instance methods first
    if (store) {
      if (typeof store.setMs === "function") return store.setMs(t);
      if (typeof store.set === "function") return store.set(t);
      if (typeof store.setAnchor === "function") return store.setAnchor(t);
    }
    // Try module-level setters
    if (typeof (api as any).setMs === "function") return (api as any).setMs(t);
    if (typeof (api as any).set === "function") return (api as any).set(t);
    if (typeof (api as any).setAnchor === "function") return (api as any).setAnchor(t);
  };

  return () => (preferred ? preferred() : fallback());
}

export default function TodayButton({ className = "" }: { className?: string }) {
  const jump = useJumpToToday();
  return (
    <button type="button" className={`TodayBtn ${className}`} onClick={jump}>
      <span className="TodayBtn__dot" aria-hidden="true" />
      TODAY
    </button>
  );
}

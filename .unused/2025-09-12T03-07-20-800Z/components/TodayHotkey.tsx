import { useEffect } from "react";
import * as date from "@/stores/dateStore";

function startOfTodayMs() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
}

function useJumpToTodayFn() {
  const api: any = date as any;
  const store = typeof api.useDateStore === "function" ? api.useDateStore() : null;
  const preferred =
    (typeof api.setToday === "function" && api.setToday) ||
    (store && typeof store.setToday === "function" && store.setToday);

  const fallback = () => {
    const t = startOfTodayMs();
    if (store) {
      if (typeof store.setMs === "function") return store.setMs(t);
      if (typeof store.set === "function") return store.set(t);
      if (typeof store.setAnchor === "function") return store.setAnchor(t);
    }
    if (typeof (api as any).setMs === "function") return (api as any).setMs(t);
    if (typeof (api as any).set === "function") return (api as any).set(t);
    if (typeof (api as any).setAnchor === "function") return (api as any).setAnchor(t);
  };

  return () => (preferred ? preferred() : fallback());
}

export default function TodayHotkey() {
  const jump = useJumpToTodayFn();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;
      if ((k === "t" || k === "T") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = e.target as HTMLElement | null;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as any).isContentEditable)) return;
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  return null;
}

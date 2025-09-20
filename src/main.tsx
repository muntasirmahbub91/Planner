// src/main.tsx
import "./pwa-viewport";
import "@/styles/task-composer-layout.css";
import "@/styles/task-composer-compact.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import { warnIfStorageUnavailable } from "@/app/initStorageGuard";
import { useHabitsStore } from "@/stores/habitsStore";
import { useTasks } from "@/stores/tasksStore";
import { useReminders } from "@/stores/remindersStore";
import { useDateStore, scheduleMidnightRollOver, dayMs } from "@/stores/dateStore";

// Storage sanity
warnIfStorageUnavailable();

// Eager rehydrate persisted slices before first paint
useHabitsStore.persist?.rehydrate?.();
useTasks.persist?.rehydrate?.();
useReminders.persist?.rehydrate?.();

// Keep “today” in sync across local midnights
scheduleMidnightRollOver();

// Also refresh on tab focus (covers long-suspended tabs)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    const ds = useDateStore.getState();
    const today = dayMs(Date.now());
    if (dayMs(ds.selected) !== today) ds.setTodaySelected?.();
  }
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// PWA: register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(console.error);
  });
}

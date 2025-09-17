// src/main.tsx
import "./pwa-viewport";
import "@/styles/task-composer-layout.css";
import "@/styles/task-composer-compact.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { useHabitsStore } from "@/stores/habitsStore";
import { scheduleMidnightRollOver } from "@/stores/dateStore";

// Eager rehydrate to avoid first-frame empty UI
useHabitsStore.persist?.rehydrate?.();

// Keep 'today' in sync across local midnights
scheduleMidnightRollOver();

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

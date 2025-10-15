// src/App.tsx — add MonthlyProgress at top right
import "@/styles/task-composer-layout.css";
import "@/styles/task-composer-compact.css";
import React from "react";
import "./App.css";
import { useView, setView, type View } from "@/stores/viewStore";
import { useMode, setMode } from "@/stores/modeStore";

import DayView from "@/views/DayView";
import WeekView from "@/views/WeekView";
import MonthView from "@/views/MonthView";
import YearView from "@/views/YearView";

import TasksView from "@/views/TasksView";
import ProjectsView from "@/views/ProjectsView";
import RemindersView from "@/views/RemindersView";
import JournalView from "@/views/JournalView";
import ListView from "@/views/ListsView";

import MonthlyProgress from "@/sections/MonthlyProgress"; // NEW

/** Calendar slot switches among Day/Week/Month/Year */
function CalendarSlot({ view }: { view: View }) {
  switch (view) {
    case "week":
      return <WeekView />;
    case "month":
      return <MonthView />;
    case "year":
      return <YearView />;
    case "day":
    default:
      return <DayView />;
  }
}

/** Secondary mode slot switched by the bottom bar */
function SecondarySlot({ mode }: { mode: string }) {
  if (mode === "tasks") return <TasksView />;
  if (mode === "projects") return <ProjectsView />;
  if (mode === "reminders") return <RemindersView />;
  if (mode === "journal") return <JournalView />;
  if (mode === "lists") return <ListView />;
  return null;
}

export default function App() {
  const view = useView();
  const mode = useMode();

  return (
    <div className="page">
      <div className="app">
        <header className="header" role="banner" aria-label="App header">
          <div className="topBar" role="region" aria-label="Top bar">
            {/* Row 1 */}
            <h1 className="brand-title" data-app-title>
              PLANNER
            </h1>

            {/* Monthly progress on the right — keep scale and shift 50px left */}
<div className="topBar-actions" aria-label="Month progress" style={{ width: 230 }}>
  <div style={{ transform: "scale(0.7)", transformOrigin: "right center" }}>
    <MonthlyProgress width={180} height={44} offsetX={-50} />
  </div>
</div>


            {/* Row 2 */}
            <nav className="topBar-nav" aria-label="Calendar views">
              {(["day", "week", "month", "year"] as View[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`tab${view === v ? " active" : ""}`}
                  aria-current={view === v ? "page" : undefined}
                  onClick={() => {
                    setMode("none");
                    setView(v);
                  }}
                >
                  {v.toUpperCase()}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="viewSlot" role="main">
          <div className="band">
            {mode === "none" ? <CalendarSlot view={view} /> : <SecondarySlot mode={mode} />}
          </div>
        </main>

        <footer className="BottomBarFixed" data-bottom-bar aria-label="Primary sections">
          <div className="BottomBarFixed__inner" role="tablist" aria-label="Modes">
            {([
              ["tasks", "TASKS"],
              ["projects", "PROJECTS"],
              ["reminders", "REMINDERS"],
              ["journal", "JOURNAL"],
              ["lists", "LISTS"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                className="bb-btn"
                aria-selected={mode === id ? "true" : "false"}
                onClick={() => setMode(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}

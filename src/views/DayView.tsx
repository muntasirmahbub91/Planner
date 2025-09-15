// src/views/DayView.tsx
import React from "react";
import {
  useDateStore,
  prev,
  next,
  fmtDayTitle,
  fmtDaySubtitle,
} from "@/stores/dateStore";

import TasksSection from "@/sections/TasksSection";
import RemindersWindow from "@/sections/RemindersWindow";
import HabitsSection from "@/sections/HabitsSection";
import "./DayView.css";

export default function DayView() {
  // epochDay for the banner and sections
  const eDay = useDateStore((s) => s.selected);
  const setTodaySelected = useDateStore((s) => s.setTodaySelected);

  // Arrow keys (ignore while typing). Home = jump to Today.
  const go = React.useCallback((dir: -1 | 1) => (dir < 0 ? prev() : next()), []);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || (t as any)?.isContentEditable)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "Home") { e.preventDefault(); setTodaySelected(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [go, setTodaySelected]);

  const title = fmtDayTitle(eDay);
  const subtitle = fmtDaySubtitle(eDay);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
      {/* Banner */}
      <section
        className="DateBanner DateBanner--day"
        style={{ display: "grid", gridTemplateColumns: "32px 1fr 32px", alignItems: "center", gap: 8, padding: "12px 12px", minHeight: 64 }}
        aria-label="Day navigation"
      >
        <button type="button" aria-label="Previous day" className="DateBanner__chev" onClick={prev}>‹</button>
        <div className="DateBanner__titles" style={{ display: "grid", alignContent: "center", justifyItems: "center", textAlign: "center" }}>
          <div className="DateBanner__title" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>{title}</div>
          <div className="DateBanner__subtitle" style={{ opacity: 0.7, fontSize: 14, lineHeight: 1.2, margin: 0, marginTop: 2 }}>
            {subtitle} · <button type="button" onClick={setTodaySelected} className="DateBanner__todayBtn" aria-label="Jump to today" style={{ border: 0, background: "transparent", textDecoration: "underline", cursor: "pointer", padding: 0 }}>Today</button>
          </div>
        </div>
        <button type="button" aria-label="Next day" className="DateBanner__chev" onClick={next}>›</button>
      </section>

      {/* Content */}
      <section><TasksSection /></section>
      <section><RemindersWindow /></section>
      <section><HabitsSection /></section>
    </main>
  );
}

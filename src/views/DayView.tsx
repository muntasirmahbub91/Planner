import React from "react";
import { useDateStore, prev, next, fmtDayTitle, fmtDaySubtitle } from "@/stores/dateStore";

import TasksSection from "@/sections/TasksSection";
import RemindersWindow from "@/sections/RemindersWindow";
import HabitsSection from "@/sections/HabitsSection";
import "./DayView.css";

export default function DayView() {
  const ms = useDateStore();

  // Arrow keys (ignore while typing)
  const go = React.useCallback((dir: -1 | 1) => (dir < 0 ? prev() : next()), []);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || (t as any)?.isContentEditable)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [go]);

  const title = fmtDayTitle(ms);
  const subtitle = fmtDaySubtitle(ms);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
      {/* Banner */}
      <section
        className="DateBanner DateBanner--day"
        style={{ display: "grid", gridTemplateColumns: "32px 1fr 32px", alignItems: "center", gap: 8, padding: "12px 12px", minHeight: 64 }}
      >
        <button type="button" aria-label="Previous day" className="DateBanner__chev" onClick={prev}>‹</button>
        <div className="DateBanner__titles" style={{ display: "grid", alignContent: "center", justifyItems: "center", textAlign: "center" }}>
          <div className="DateBanner__title" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, margin: 0 }}>{title}</div>
          <div className="DateBanner__subtitle" style={{ opacity: 0.7, fontSize: 14, lineHeight: 1.2, margin: 0, marginTop: 2 }}>{subtitle}</div>
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

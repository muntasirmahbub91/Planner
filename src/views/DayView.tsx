// src/sections/DayView.tsx — date big, weekday small, no “Today” link
import React from "react";
import { useDateStore, dayMs, DAY_MS } from "@/stores/dateStore";
import TasksSection from "@/sections/TasksSection";
import RemindersWindow from "@/sections/RemindersWindow";
import HabitsSection from "@/sections/HabitsSection";
import WeightTracker from "@/sections/WeightTracker";
import "./DayView.css";

// Local navigation via store getters avoids extra subscriptions
function goPrevDay() {
  const s = useDateStore.getState();
  const cur = dayMs(s.selected);
  s.setMs(cur - DAY_MS);
}
function goNextDay() {
  const s = useDateStore.getState();
  const cur = dayMs(s.selected);
  s.setMs(cur + DAY_MS);
}

// Title = full date; Subtitle = weekday
function fmtDayTitle(eDay: number) {
  const d = new Date(dayMs(eDay));
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function fmtDaySubtitle(eDay: number) {
  const d = new Date(dayMs(eDay));
  return d.toLocaleDateString(undefined, { weekday: "long" });
}
function toLocalISO(d: Date) {
  const tzOff = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOff).toISOString().slice(0, 10);
}

export default function DayView() {
  const eDay = useDateStore((s) => s.selected);

  const title = React.useMemo(() => fmtDayTitle(eDay), [eDay]);       // big date
  const subtitle = React.useMemo(() => fmtDaySubtitle(eDay), [eDay]); // small weekday

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || (t as any)?.isContentEditable)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrevDay(); }
      if (e.key === "ArrowRight") { e.preventDefault(); goNextDay(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const dateISO = toLocalISO(new Date(dayMs(eDay)));

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
      {/* Banner */}
      <section
        className="DateBanner DateBanner--day"
        style={{
          display: "grid",
          gridTemplateColumns: "32px 1fr 32px",
          alignItems: "center",
          gap: 8,
          padding: "12px 12px",
          minHeight: 64,
        }}
        aria-label="Day navigation"
      >
        <button type="button" aria-label="Previous day" className="DateBanner__chev" onClick={goPrevDay}>
          ‹
        </button>

        <div
          className="DateBanner__titles"
          style={{ display: "grid", alignContent: "center", justifyItems: "center", textAlign: "center" }}
        >
          {/* Bigger DATE */}
          <div
            className="DateBanner__title"
            style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, margin: 0 }}
            aria-live="polite"
          >
            {title}
          </div>
          {/* Smaller WEEKDAY */}
          <div
            className="DateBanner__subtitle"
            style={{ opacity: 0.85, fontSize: 18, fontWeight: 600, lineHeight: 1.2, margin: 0, marginTop: 4 }}
          >
            {subtitle}
          </div>
        </div>

        <button type="button" aria-label="Next day" className="DateBanner__chev" onClick={goNextDay}>
          ›
        </button>
      </section>

      {/* Content */}
      <section><TasksSection /></section>
      <section><RemindersWindow hideOverdue /></section>
      <section aria-label="Habits"><HabitsSection /></section>
      <section aria-label="Weight"><WeightTracker dateISO={dateISO} /></section>
    </main>
  );
}

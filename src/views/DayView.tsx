// src/views/DayView.tsx — banner + quarterly progress (no slider UI)
import React from "react";
import { useDateStore, dayMs } from "@/stores/dateStore";
import { setView } from "@/stores/viewStore";
import QuarterlyProgress from "@/sections/QuarterlyProgress";

// Sections
import TasksSection from "@/sections/TasksSection";
import RemindersWindow from "@/sections/RemindersWindow";
import HabitsSection from "@/sections/HabitsSection";
import WeightTracker from "@/sections/WeightTracker";

/* ---- Quarterly bar size control (no visible slider) ---- */
const QBAR_BASE = 380;           // base px
const SCALE_MIN = 0.6;
const SCALE_MAX = 2;
const LS_KEY = "qbar.scale";     // persisted scale
const SHOW_QBAR_SCALER = false;  // hide controls

export default function DayView() {
  const sel = useDateStore((s) => s.selected);
  const ms = dayMs(sel);

  // scale is persisted but UI is hidden
  const [qScale, setQScale] = React.useState<number>(() => {
    const v = Number(localStorage.getItem(LS_KEY));
    return Number.isFinite(v) && v >= SCALE_MIN && v <= SCALE_MAX ? v : 1;
  });
  const qWidth = Math.round(QBAR_BASE * qScale);
  const saveScale = (v: number) => {
    const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, v));
    setQScale(clamped);
    localStorage.setItem(LS_KEY, String(clamped));
  };

  const go = (deltaDays: number) => {
    const d = new Date(ms);
    d.setDate(d.getDate() + deltaDays);
    d.setHours(0, 0, 0, 0);
    useDateStore.getState().setMs(d.getTime());
  };

  const today = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    useDateStore.getState().setMs(d.getTime());
  };

  const fmt = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const title = fmt.format(new Date(ms));
  const dateISO = new Date(ms).toISOString().slice(0, 10);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
      {/* Banner */}
      <section
        className="DateBanner DateBanner--day"
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          borderRadius: 12,
          background: "var(--surface-50, rgba(0,0,0,0.04))",
        }}
      >
        <button type="button" aria-label="Previous day" onClick={() => go(-1)} style={chevBtn}>
          ‹
        </button>

        <button
          type="button"
          onClick={() => setView("month")}
          title="Open Month view"
          style={{
            justifySelf: "center",
            fontSize: 18,
            fontWeight: 800,
            padding: "4px 8px",
            borderRadius: 8,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          {title}
        </button>

        <button type="button" aria-label="Next day" onClick={() => go(+1)} style={chevBtn}>
          ›
        </button>

        <button
          type="button"
          onClick={today}
          style={{
            marginLeft: 8,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,.12)",
            background: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
          title="Jump to today"
        >
          Today
        </button>
      </section>

      {/* Quarterly progress (current quarter only) */}
      <section aria-label="Quarterly progress" style={{ display: "grid", gap: 8 }}>
        <QuarterlyProgress width={qWidth} />
        {SHOW_QBAR_SCALER && (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              opacity: 0.8,
              userSelect: "none",
            }}
          >
            {/* Controls are hidden by the flag. Keep code for future use. */}
            <span style={{ minWidth: 64 }}>Size</span>
            <input
              type="range"
              min={SCALE_MIN}
              max={SCALE_MAX}
              step={0.05}
              value={qScale}
              onChange={(e) => saveScale(Number(e.target.value))}
              style={{ flex: 1 }}
              aria-label="Quarterly bar size"
            />
            <span style={{ width: 48, textAlign: "right" }}>{Math.round(qScale * 100)}%</span>
            <button
              type="button"
              onClick={() => saveScale(1)}
              style={{
                marginLeft: 4,
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,.12)",
                background: "white",
                cursor: "pointer",
                fontWeight: 600,
              }}
              title="Reset size"
            >
              Reset
            </button>
          </label>
        )}
      </section>

      {/* Content sections */}
      <section aria-label="Tasks">
        <TasksSection />
      </section>

      <section aria-label="Reminders">
        <RemindersWindow hideOverdue />
      </section>

      <section aria-label="Habits">
        <HabitsSection />
      </section>

      <section aria-label="Weight">
        <WeightTracker dateISO={dateISO} />
      </section>
    </main>
  );
}

const chevBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,.12)",
  background: "white",
  cursor: "pointer",
  fontSize: 20,
  lineHeight: "32px",
  fontWeight: 700,
  display: "grid",
  placeItems: "center",
};

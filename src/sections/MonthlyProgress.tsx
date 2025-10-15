// src/sections/MonthlyProgress.tsx — compact header-sized bar
import React from "react";
import { useDateStore, dayMs } from "@/stores/dateStore";

type Props = {
  /** Pixel width to match “PLANNER”. Tweak as needed. */
  width?: number;           // default 220
  /** Hide the small “Day X of Y” line for header use. */
  showMeta?: boolean;       // default false
  trackColor?: string;
  fillColor?: string;
  dateMs?: number;
};

export default function MonthlyProgress({
  width = 150,
  showMeta = false,
  trackColor = "#d0eef8ff",
  fillColor = "#b5d874",
  dateMs,
}: Props) {
  const eDay = useDateStore((s) => s.selected);
  const base = new Date(dateMs ?? dayMs(eDay));

  const y = base.getFullYear();
  const m = base.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const dayIndex = base.getDate();
  const pct = Math.min(100, Math.max(0, (dayIndex / daysInMonth) * 100));

  const monthLabel = base.toLocaleDateString(undefined, { month: "long" });

  // compact geometry to fit header
  const h = 45;
  const radius = 16;
  const padLeft = 16;

  return (
    <section aria-label="Monthly progress" style={{ width, display: "inline-block" }}>
      <div
        style={{
          position: "relative",
          height: h,
          borderRadius: radius,
          background: trackColor,
          boxShadow: "0 1px 0 rgba(0,0,0,.06) inset, 0 6px 16px rgba(0,0,0,.06)",
          overflow: "hidden",
        }}
      >
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label={`${monthLabel} completion`}
          style={{
            position: "absolute",
            inset: 0,
            width: `${pct}%`,
            background: fillColor,
            borderRadius: radius,
            transition: "width 400ms cubic-bezier(.22,1,.36,1)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            display: "grid",
            alignItems: "center",
            paddingLeft: padLeft,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 25, color: "#0b0b0b", lineHeight: 1 }}>
            {monthLabel}
          </div>
        </div>
      </div>

      {showMeta && (
        <div style={{ marginTop: 4, fontSize: 11, opacity: 0.75, textAlign: "right" }}>
          Day {dayIndex} of {daysInMonth} · {Math.round(pct)}%
        </div>
      )}
    </section>
  );
}

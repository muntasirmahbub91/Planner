// src/sections/QuarterlyProgress.tsx
import React from "react";
import { useDateStore, dayMs, WEEK_START_DOW, weekStartMs } from "@/stores/dateStore";

type Props = {
  width?: number;      // default 560
  dateMs?: number;     // optional override; otherwise store.selected
  title?: string;      // optional override of "Qx YYYY"
};

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = 7 * MS_DAY;

const startOfWeek = (ms: number) => weekStartMs(ms, WEEK_START_DOW);
const yearWeek0 = (year: number) => startOfWeek(new Date(year, 0, 1).getTime());
const quarterIndex = (d: Date) => (Math.floor(d.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
/** 12-week quarter aligned to your WEEK_START_DOW anchor */
const quarterStartWeekMs = (d: Date) => yearWeek0(d.getFullYear()) + (quarterIndex(d) - 1) * 12 * MS_WEEK;

export default function QuarterlyProgress({ width = 560, dateMs, title }: Props) {
  const sel = useDateStore((s) => s.selected);
  const baseDate = new Date(dateMs ?? dayMs(sel));
  const q = quarterIndex(baseDate);
  const qStart = quarterStartWeekMs(baseDate);
  const qTotal = 12 * MS_WEEK;

  // include current week to avoid very low early percentages
  const nowWk = startOfWeek(new Date(dateMs ?? dayMs(sel)).getTime());
  const elapsed = Math.min(qTotal, Math.max(0, nowWk - qStart + MS_WEEK));
  const pct = Math.round((elapsed / qTotal) * 100);

  // month labels at thirds
  const mFmt = new Intl.DateTimeFormat(undefined, { month: "short" });
  const m0 = mFmt.format(new Date(qStart));                  // month at 0w
  const m1 = mFmt.format(new Date(qStart + 4 * MS_WEEK));    // +4w
  const m2 = mFmt.format(new Date(qStart + 8 * MS_WEEK));    // +8w

  const card = {
    width,
    borderRadius: 16,
    border: "1px solid rgba(0,120,255,0.15)",
    background: "rgba(210,240,248,0.45)",
    padding: 20,
  } as const;

  const trackH = 28;
  const track = {
    position: "relative" as const,
    height: trackH,
    borderRadius: trackH / 2,
    background: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  };

  // fill uses three-step gradient: month1 light → month2 darker → month3 darkest
  const fill = {
    position: "absolute" as const,
    inset: 0,
    width: `${pct}%`,
    borderRadius: trackH / 2,
    background:
      "linear-gradient(90deg, #7adf96 0%, #7adf96 33.333%, #4ec07a 33.333%, #4ec07a 66.666%, #2ea763 66.666%, #2ea763 100%)",
    transition: "width 420ms cubic-bezier(.22,1,.36,1)",
  };

  const tick = (leftPct: number) =>
    ({
      position: "absolute",
      top: 0,
      bottom: 0,
      left: `${leftPct}%`,
      width: 2,
      background: "rgba(0,0,0,0.10)",
    } as const);

  const titleRow = {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    marginBottom: 12,
  } as const;

  const monthsRow = {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    textAlign: "center" as const,
    color: "rgba(0,0,0,0.7)",
    fontWeight: 600,
    letterSpacing: 1,
  };

  return (
    <section aria-label="Quarterly progress" style={card}>
      <div style={titleRow}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#0b0b0b" }}>{title ?? `Q${q} ${baseDate.getFullYear()}`}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#0b0b0b" }}>{pct}%</div>
      </div>

      <div style={track}>
        <div style={fill} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} />
        <div aria-hidden style={tick(33.3333)} />
        <div aria-hidden style={tick(66.6667)} />
      </div>

      <div style={monthsRow}>
        <span>{m0.toUpperCase()}</span>
        <span>{m1.toUpperCase()}</span>
        <span>{m2.toUpperCase()}</span>
      </div>
    </section>
  );
}

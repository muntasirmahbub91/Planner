import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDateStore, dayMs } from "@/stores/dateStore";
import "./WeeklyCountdown.css";

type Props = {
  x?: number; y?: number; width?: number; height?: number; scale?: number; zIndex?: number;
  radius?: number; padding?: number; trackBorderPx?: number;
  bg?: string; track?: string; fill?: string; text?: string; border?: string;
  fontSize?: number; fontWeight?: number;
  weekStartsOn?: 0 | 1;
  live?: boolean;
  initialWeeks?: number;
  storageKey?: string;
  onChange?: (weeksRemaining: number) => void;
};

type Saved = { anchorWeekStartMs: number; weeksRemainingAtAnchor: number };

const DEFAULT_KEY = "weekly-countdown:v3";
const canUseDOM = typeof window !== "undefined" && typeof document !== "undefined";

/* ---------- DST-safe week helpers ---------- */
const startOfLocalDay = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
};
function startOfWeek(ms: number, weekStartsOn: 0 | 1) {
  const midnight = startOfLocalDay(ms);
  const dow = new Date(midnight).getDay();
  const shift = weekStartsOn === 1 ? (dow === 0 ? 6 : dow - 1) : dow;
  const d0 = new Date(midnight);
  return new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() - shift, 0, 0, 0, 0).getTime();
}
function nextWeekStart(weekStartMs: number, weekStartsOn: 0 | 1) {
  const d = new Date(weekStartMs);
  return startOfWeek(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7).getTime(), weekStartsOn);
}
const weeksBetween = (aStart: number, bStart: number) => Math.trunc((bStart - aStart) / (7 * dayMs));

export default function WeeklyCountdown({
  x = 0, y = 0, width = 320, height = 96, scale = 1, zIndex = 1,
  radius = 16, padding = 12, trackBorderPx = 1,
  bg = "#0f172a", track = "#1f2937", fill = "#22c55e", text = "#e5e7eb", border = "rgba(255,255,255,0.08)",
  fontSize = 20, fontWeight = 700,
  weekStartsOn: weekStartOverride,
  live = true, initialWeeks = 0, storageKey = DEFAULT_KEY, onChange,
}: Props) {

  const selectedMs = useDateStore((s: any) => s.selectedMs ?? Date.now());
  const storeWeekStartsOn = useDateStore((s: any) => s.weekStartsOn ?? 1);
  const weekStartsOn: 0 | 1 = (weekStartOverride ?? storeWeekStartsOn) as 0 | 1;

  const [saved, setSaved] = useState<Saved | null>(null);
  const [open, setOpen] = useState(false);
  const [draftWeeks, setDraftWeeks] = useState<string>(String(initialWeeks));
  const [now, setNow] = useState<number>(Date.now());
  const tickRef = useRef<number | null>(null);

  /* load persisted */
  useEffect(() => {
    if (!canUseDOM) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw) as Saved;
        if (Number.isFinite(s.anchorWeekStartMs) && Number.isFinite(s.weeksRemainingAtAnchor)) {
          setSaved(s);
          setDraftWeeks(String(s.weeksRemainingAtAnchor));
        }
      }
    } catch {}
  }, [storageKey]);

  /* live ticker for fill */
  useEffect(() => {
    if (!live) return;
    tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, [live]);

  const currentWeekStart = useMemo(
    () => startOfWeek(selectedMs, weekStartsOn),
    [selectedMs, weekStartsOn]
  );
  const currentNextWeekStart = useMemo(
    () => nextWeekStart(currentWeekStart, weekStartsOn),
    [currentWeekStart, weekStartsOn]
  );

  const effectiveSaved: Saved = saved ?? {
    anchorWeekStartMs: currentWeekStart,
    weeksRemainingAtAnchor: initialWeeks,
  };

  const weeksElapsed = weeksBetween(effectiveSaved.anchorWeekStartMs, currentWeekStart);
  const weeksRemaining = Math.max(0, Math.floor(effectiveSaved.weeksRemainingAtAnchor - weeksElapsed));

  useEffect(() => { onChange?.(weeksRemaining); }, [weeksRemaining, onChange]);

  const pctWeek = useMemo(() => {
    const span = currentNextWeekStart - currentWeekStart;
    const t = live ? now : Math.min(Math.max(selectedMs, currentWeekStart), currentNextWeekStart);
    const clamped = Math.min(Math.max(t, currentWeekStart), currentNextWeekStart);
    const p = ((clamped - currentWeekStart) / span) * 100;
    return `${p.toFixed(4)}%`;
  }, [now, selectedMs, live, currentWeekStart, currentNextWeekStart]);

  const label = weeksRemaining === 1 ? "1 week" : `Week ${weeksRemaining}`;

  function openModal() {
    setDraftWeeks(String(saved ? saved.weeksRemainingAtAnchor : Math.max(0, weeksRemaining)));
    setOpen(true);
  }
  function saveModal() {
    const n = Math.max(0, Math.floor(Number(draftWeeks || 0)));
    const next: Saved = { anchorWeekStartMs: currentWeekStart, weeksRemainingAtAnchor: n };
    setSaved(next);
    if (canUseDOM) {
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
    }
    setOpen(false);
    onChange?.(Math.max(0, n - weeksBetween(currentWeekStart, currentWeekStart)));
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") saveModal();
    if (e.key === "Escape") setOpen(false);
  }

  /* CSS variables */
  const style: React.CSSProperties = {
    ["--wc-x" as any]: `${x}px`,
    ["--wc-y" as any]: `${y}px`,
    ["--wc-w" as any]: `${width}px`,
    ["--wc-h" as any]: `${height}px`,
    ["--wc-scale" as any]: String(scale),
    ["--wc-z" as any]: String(zIndex),

    ["--wc-radius" as any]: `${radius}px`,
    ["--wc-padding" as any]: `${padding}px`,
    ["--wc-track-border-px" as any]: `${trackBorderPx}px`,

    ["--wc-bg" as any]: bg,
    ["--wc-track" as any]: track,
    ["--wc-fill" as any]: fill,
    ["--wc-text" as any]: text,
    ["--wc-border" as any]: border,

    ["--wc-font-size" as any]: `${fontSize}px`,
    ["--wc-font-weight" as any]: String(fontWeight),

    ["--wc-fill-pct" as any]: pctWeek,
  };

  return (
    <>
      <div className="wc-wrap" style={style}>
        <div className="wc-top">
          <div>{label}</div>
          <button className="wc-gear" aria-label="Configure weeks" title="Set weeks" onClick={openModal}>
            <svg viewBox="0 0 24 24" width="20" height="20" role="img" aria-hidden="true">
              <path fill="currentColor" d="M12 8.75a3.25 3.25 0 1 1 0 6.5a3.25 3.25 0 0 1 0-6.5Zm8.03 2.23l1.59.92a1 1 0 0 1 .37 1.36l-1.5 2.6a1 1 0 0 1-1.2.45l-1.8-.63a7.9 7.9 0 0 1-1.61.93l-.27 1.89a1 1 0 0 1-.99.86h-3a1 1 0 0 1-.99-.86l-.27-1.9a7.9 7.9 0 0 1-1.6-.92l-1.81.63a1 1 0 0 1-1.2-.45l-1.5-2.6a1 1 0 0 1 .37-1.36l1.6-.92a8 8 0 0 1 0-1.86l-1.6-.92a1 1 0 0 1-.37-1.36l1.5-2.6a1 1 0 0 1 1.2-.45l1.82.63c.5-.36 1.04-.67 1.6-.92l.27-1.9A1 1 0 0 1 11.01 2h3a1 1 0 0 1 .99.86l.27 1.9c.56.25 1.1.56 1.61.92l1.81-.63a1 1 0 0 1 1.2.45l1.5 2.6a1 1 0 0 1-.37 1.36l-1.59.92c.06.62.06 1.24 0 1.86Z"/>
            </svg>
          </button>
        </div>

        <div className="wc-track" aria-label="Week progress">
          <div className="wc-fill" />
        </div>
        <div className="wc-sub">Counts down on week boundaries only.</div>
      </div>

      {open && (
        <div className="wc-modal" role="dialog" aria-modal="true" aria-label="Set weeks">
          <div className="wc-card">
            <div className="wc-top" style={{ marginBottom: 8 }}>
              <div>Set weeks</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Starts this week</div>
            </div>

            <div className="wc-row">
              <div className="wc-col">
                <label className="wc-label" htmlFor="wc-input">Weeks remaining</label>
                <input
                  id="wc-input"
                  className="wc-input"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={draftWeeks}
                  onChange={(e) => setDraftWeeks(e.target.value)}
                  onKeyDown={onKeyDown}
                  autoFocus
                />
              </div>
            </div>

            <div className="wc-row wc-actions">
              <button className="wc-btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="wc-btn save" onClick={saveModal}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

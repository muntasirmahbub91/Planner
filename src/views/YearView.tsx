// src/views/YearView.tsx
import React from "react";
import "./YearView.css";
import { setView, type View } from "@/stores/viewStore";
import { useDateStore, dayMs, WEEK_START_DOW, weekStartMs } from "@/stores/dateStore";
import { useWeeklyGoals, getWeek, setGoal, toggleGoal, clearGoal } from "@/stores/weeklyGoals";
import AddButton from "@/components/AddButton";
import ToggleButton from "@/components/ToggleButton";

/* time helpers */
const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = 7 * MS_DAY;

function startOfWeek(ms: number) {
  return weekStartMs(ms, WEEK_START_DOW);
}
function startOfQuarter(year: number, q: 1 | 2 | 3 | 4) {
  const m = (q - 1) * 3;
  const d = new Date(year, m, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function nextQuarterStart(year: number, q: 1 | 2 | 3 | 4) {
  return q < 4 ? startOfQuarter(year, (q + 1) as 2 | 3 | 4) : startOfQuarter(year + 1, 1);
}
function weekNumberOfYear(weekStart: number): number {
  const d = new Date(weekStart);
  const yearStart = startOfWeek(new Date(d.getFullYear(), 0, 1).getTime());
  return Math.floor((weekStart - yearStart) / MS_WEEK) + 1;
}
function quarterWeekStarts(year: number, q: 1 | 2 | 3 | 4): number[] {
  const qStart = startOfQuarter(year, q);
  const qEnd = nextQuarterStart(year, q);
  let w = startOfWeek(qStart);
  if (w < qStart) w += MS_WEEK;
  const out: number[] = [];
  while (w < qEnd) {
    out.push(w);
    w += MS_WEEK;
  }
  return out;
}

function WeeklyRow({ weekStart, onOpenWeek }: { weekStart: number; onOpenWeek: (ms: number) => void }) {
  useWeeklyGoals(); // subscribe

  const goalsRec = getWeek(weekStart).goals;
  const items = Object.keys(goalsRec);

  const [compose, setCompose] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const code = `W${String(weekNumberOfYear(weekStart)).padStart(2, "0")}`;
  const sub = new Date(weekStart).toLocaleDateString(undefined, { month: "short", day: "2-digit" });

  function onAdd() {
    const name = draft.trim();
    if (!name) return;
    setGoal(weekStart, name, "planned");
    setDraft("");
    setCompose(false);
  }

  return (
    <div className="yvWeekRow">
      <button className="yvWeekBtn" onClick={() => onOpenWeek(weekStart)} aria-label={`Open ${code}`}>
        <div className="yvWeekCode">{code}</div>
        <div className="yvWeekSub">{sub}</div>
      </button>
      <div className="yvWeekMain">
        <div className="yvGoals">
          {items.map((g) => {
            const checked = goalsRec[g] === "done";
            return (
              <div className="yvGoalItem" key={g}>
                <ToggleButton checked={checked} onChange={() => toggleGoal(weekStart, g)} />
                <div className="yvGoalText" style={{ textDecoration: checked ? "line-through" : "none" }}>
                  {g}
                </div>
                <button className="yvRemove" onClick={() => clearGoal(weekStart, g)} aria-label={`Remove ${g}`}>
                  Remove
                </button>
              </div>
            );
          })}
        </div>

        <div className="yvRowActions">
          <AddButton aria-label="Add weekly goal" onClick={() => setCompose(true)} disabled={items.length >= 3} />
          {compose && items.length < 3 && (
            <>
              <input
                className="yvInput"
                placeholder="Add a weekly goal…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onAdd();
                  if (e.key === "Escape") {
                    setCompose(false);
                    setDraft("");
                  }
                }}
                maxLength={160}
                autoFocus
              />
              <AddButton aria-label="Confirm weekly goal" onClick={onAdd} disabled={!draft.trim()} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function YearView() {
  const selectedMs = useDateStore((s) => dayMs(s.selected));
  const year = new Date(selectedMs).getFullYear();

  const openWeek = (weekMs: number) => {
    useDateStore.getState().setMs(weekMs);
    setView("week" as View);
  };
  const go = (delta: number) => {
    const d = new Date(selectedMs);
    d.setFullYear(d.getFullYear() + delta);
    d.setHours(0, 0, 0, 0);
    useDateStore.getState().setMs(d.getTime());
  };

  const m = new Date(selectedMs).getMonth();
  const currentQ = (Math.floor(m / 3) + 1) as 1 | 2 | 3 | 4;

  const [openQs, setOpenQs] = React.useState<Set<1 | 2 | 3 | 4>>(new Set([currentQ]));
  const toggleQ = (q: 1 | 2 | 3 | 4) =>
    setOpenQs((prev) => {
      const next = new Set(prev);
      next.has(q) ? next.delete(q) : next.add(q);
      return next;
    });

  return (
    <div className="yvContainer">
      <div className="yvBannerWrap">
        <div className="yvBanner">
          <button className="yvChev" aria-label="Previous year" onClick={() => go(-1)}>‹</button>
          <div style={{ textAlign: "center" }}>
            <div className="yvTitle">{`YEAR ${year}`}</div>
            <div className="yvSubTitle">{`JAN–DEC, ${year}`}</div>
          </div>
          <button className="yvChev" aria-label="Next year" onClick={() => go(+1)}>›</button>
        </div>
      </div>

      <div className="yvQGrid">
        <QuarterSection label="Q1" months="JAN–MAR" year={year} q={1} isOpen={openQs.has(1)} onToggle={() => toggleQ(1)} onOpenWeek={openWeek} />
        <QuarterSection label="Q2" months="APR–JUN" year={year} q={2} isOpen={openQs.has(2)} onToggle={() => toggleQ(2)} onOpenWeek={openWeek} />
        <QuarterSection label="Q3" months="JUL–SEP" year={year} q={3} isOpen={openQs.has(3)} onToggle={() => toggleQ(3)} onOpenWeek={openWeek} />
        <QuarterSection label="Q4" months="OCT–DEC" year={year} q={4} isOpen={openQs.has(4)} onToggle={() => toggleQ(4)} onOpenWeek={openWeek} />
      </div>
    </div>
  );
}

function QuarterSection({
  label,
  months,
  year,
  q,
  isOpen,
  onToggle,
  onOpenWeek,
}: {
  label: "Q1" | "Q2" | "Q3" | "Q4";
  months: string;
  year: number;
  q: 1 | 2 | 3 | 4;
  isOpen: boolean;
  onToggle: () => void;
  onOpenWeek: (ms: number) => void;
}) {
  const weeks = quarterWeekStarts(year, q);
  return (
    <section className={`yvQuarter ${!isOpen ? "yvCollapsed" : ""}`}>
      <div className="yvHeader" onClick={onToggle} role="button" aria-expanded={isOpen} aria-label={`Toggle ${label}`}>
        <div className="yvHLeft">
          <div className="yvQLabel">{label}</div>
          <div className="yvQMonths">{months}</div>
        </div>
        <div className="yvHRight">
          <div>Up to 3 goals / week</div>
          <div className="yvChevQ">{isOpen ? "▾" : "▸"}</div>
        </div>
      </div>

      <div className="yvBody">
        <div className="yvWeeks">
          {weeks.map((w) => (
            <WeeklyRow key={w} weekStart={w} onOpenWeek={onOpenWeek} />
          ))}
        </div>
      </div>
    </section>
  );
}

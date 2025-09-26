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

function startOfWeek(ms: number) { return weekStartMs(ms, WEEK_START_DOW); }
function startOfQuarter(year: number, q: 1|2|3|4) { const m = (q - 1) * 3; const d = new Date(year, m, 1); d.setHours(0,0,0,0); return d.getTime(); }
function nextQuarterStart(year: number, q: 1|2|3|4) { return q < 4 ? startOfQuarter(year, (q + 1) as 2|3|4) : startOfQuarter(year + 1, 1); }
function weekNumberOfYear(weekStart: number) {
  const d = new Date(weekStart);
  const yearStart = startOfWeek(new Date(d.getFullYear(), 0, 1).getTime());
  return Math.floor((weekStart - yearStart) / MS_WEEK) + 1;
}
function quarterWeekStarts(year: number, q: 1|2|3|4): number[] {
  const qStart = startOfQuarter(year, q), qEnd = nextQuarterStart(year, q);
  let w = startOfWeek(qStart); if (w < qStart) w += MS_WEEK;
  const out: number[] = []; while (w < qEnd) { out.push(w); w += MS_WEEK; }
  return out;
}

/* ---------- Weekly row (header above box, X remove, collapsed past) ---------- */
function WeeklyRow({
  weekStart, onOpenWeek, currentWeekStart,
}: { weekStart: number; onOpenWeek: (ms: number) => void; currentWeekStart: number; }) {
  useWeeklyGoals(); // subscribe
  const goalsRec = getWeek(weekStart).goals;
  const items = Object.keys(goalsRec);

  const [open, setOpen] = React.useState<boolean>(weekStart >= currentWeekStart);
  const [compose, setCompose] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const code = `W${String(weekNumberOfYear(weekStart)).padStart(2, "0")}`;
  const sub = new Date(weekStart).toLocaleDateString(undefined, { day: "2-digit", month: "short" });

  const onAdd = () => {
    const name = draft.trim(); if (!name) return;
    setGoal(weekStart, name, "planned"); setDraft(""); setCompose(false);
  };

  return (
    <section className={`yvWeek ${open ? "is-open" : "is-closed"}`}>
      <div className="yvWeekHeader">
        <button type="button" className="yvWeekMeta" onClick={() => onOpenWeek(weekStart)} title="Open in Week view">
          <span className="yvWeekCode">{code}</span>
          <span className="yvWeekDate">{sub}</span>
        </button>
        <div className="yvWeekHeaderRight">
          <AddButton aria-label="Add weekly goal" onClick={() => setCompose(true)} disabled={items.length >= 3} />
          <button type="button" className="yvWeekCaret" aria-label={open ? "Collapse week" : "Expand week"} onClick={() => setOpen(v => !v)}>
            {open ? "▾" : "▸"}
          </button>
        </div>
      </div>

      {open && (
        <div className="yvWeekBody">
          <div className="yvGoals">
            {items.map((g) => {
              const checked = goalsRec[g] === "done";
              return (
                <div className="yvGoalItem" key={g}>
                  <ToggleButton checked={checked} onChange={() => toggleGoal(weekStart, g)} />
                  <div className="yvGoalText" style={{ textDecoration: checked ? "line-through" : "none" }}>{g}</div>
                  <button type="button" className="yvXBtn" aria-label={`Remove ${g}`} onClick={() => clearGoal(weekStart, g)} title="Remove">×</button>
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
                    if (e.key === "Escape") { setCompose(false); setDraft(""); }
                  }}
                  maxLength={160}
                  autoFocus
                />
                <AddButton aria-label="Confirm weekly goal" onClick={onAdd} disabled={!draft.trim()} />
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Year view ---------- */
export default function YearView() {
  const selectedMs = useDateStore((s) => dayMs(s.selected));
  const year = new Date(selectedMs).getFullYear();
  const todayWeekStart = startOfWeek(Date.now());

  const openWeek = React.useCallback((weekMs: number) => {
    useDateStore.getState().setMs(weekMs);
    setView("week" as View);
  }, []);

  const go = React.useCallback((delta: number) => {
    const d = new Date(selectedMs); d.setFullYear(d.getFullYear() + delta); d.setHours(0,0,0,0);
    useDateStore.getState().setMs(d.getTime());
  }, [selectedMs]);

  const m = new Date(selectedMs).getMonth();
  const currentQ = (Math.floor(m / 3) + 1) as 1 | 2 | 3 | 4;

  const [openQs, setOpenQs] = React.useState<Set<1|2|3|4>>(new Set([currentQ]));
  const toggleQ = React.useCallback((q: 1|2|3|4) => setOpenQs(prev => {
    const next = new Set(prev); next.has(q) ? next.delete(q) : next.add(q); return next;
  }), []);

  const qWeeks = React.useMemo(() => ({
    1: quarterWeekStarts(year, 1),
    2: quarterWeekStarts(year, 2),
    3: quarterWeekStarts(year, 3),
    4: quarterWeekStarts(year, 4),
  }), [year]);

  const monthsLabel = (q: 1|2|3|4) => ["JAN–MAR","APR–JUN","JUL–SEP","OCT–DEC"][q-1];

  return (
    <div className="yvContainer">
      <div className="yvBannerWrap">
        <div className="yvBanner">
          <button type="button" className="yvChev" aria-label="Previous year" onClick={() => go(-1)}>‹</button>
          <div style={{ textAlign: "center" }}>
            <div className="yvTitle" aria-live="polite">{`YEAR ${year}`}</div>
            <div className="yvSubTitle">{`JAN–DEC, ${year}`}</div>
          </div>
          <button type="button" className="yvChev" aria-label="Next year" onClick={() => go(+1)}>›</button>
        </div>
      </div>

      {([1,2,3,4] as const).map((q) => (
        <QuarterWeeks
          key={q}
          label={`Q${q}` as "Q1"|"Q2"|"Q3"|"Q4"}
          months={monthsLabel(q)}
          weeks={qWeeks[q]}
          isOpen={openQs.has(q)}
          onToggle={() => toggleQ(q)}
          onOpenWeek={openWeek}
          currentWeekStart={todayWeekStart}
        />
      ))}
    </div>
  );
}

/* Quarter section with its own header and collapsible body */
function QuarterWeeks({
  label, months, weeks, isOpen, onToggle, onOpenWeek, currentWeekStart
}: {
  label: "Q1" | "Q2" | "Q3" | "Q4";
  months: string;
  weeks: number[];
  isOpen: boolean;
  onToggle: () => void;
  onOpenWeek: (ms: number) => void;
  currentWeekStart: number;
}) {
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
            <WeeklyRow
              key={w}
              weekStart={w}
              onOpenWeek={onOpenWeek}
              currentWeekStart={currentWeekStart}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

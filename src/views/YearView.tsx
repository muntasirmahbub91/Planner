// src/views/YearView.tsx — fixed 12-weeks/quarter + drag-and-drop move between weeks
import React from "react";
import "./YearView.css";
import { setView } from "@/stores/viewStore";
import { useDateStore, dayMs, WEEK_START_DOW, weekStartMs } from "@/stores/dateStore";
import { useWeeklyGoals, getWeek, setGoal, toggleGoal, clearGoal } from "@/stores/weeklyGoals";
import AddButton from "@/components/AddButton";
import ToggleButton from "@/components/ToggleButton";

/* ---------- DnD ---------- */
const DND_MIME = "application/x-plannerx-goal";

/* ---------- Time helpers ---------- */
const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = 7 * MS_DAY;
const startOfWeek = (ms: number) => weekStartMs(ms, WEEK_START_DOW);

/** Year anchor = week containing Jan 1 aligned to WEEK_START_DOW */
function yearWeek0(year: number) {
  const jan1 = new Date(year, 0, 1).getTime();
  return startOfWeek(jan1);
}

/** Exactly 12 weeks per quarter. No overlaps. Stable keys. */
function weeksForQuarter(year: number, q: 1 | 2 | 3 | 4): number[] {
  const base = yearWeek0(year) + (q - 1) * 12 * MS_WEEK;
  const out: number[] = [];
  for (let i = 0; i < 12; i++) out.push(base + i * MS_WEEK);
  return out;
}

function weekNumberOfYear(weekStart: number) {
  const y = new Date(weekStart).getFullYear();
  const y0 = yearWeek0(y);
  return Math.floor((weekStart - y0) / MS_WEEK) + 1;
}

/* ---------- Weekly Row ---------- */
function WeeklyRow({
  weekStart,
  onOpenWeek,
  currentWeekStart,
}: {
  weekStart: number;
  onOpenWeek: (ms: number) => void;
  currentWeekStart: number;
}) {
  useWeeklyGoals(); // subscribe to store updates
  const goalsRec = getWeek(weekStart).goals || {};
  const items = Object.keys(goalsRec);

  const [open, setOpen] = React.useState<boolean>(weekStart >= currentWeekStart);
  const [compose, setCompose] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [isDrop, setIsDrop] = React.useState(false);

  const code = `W${String(weekNumberOfYear(weekStart)).padStart(2, "0")}`;
  const sub = new Date(weekStart).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const isCurrent = weekStart === currentWeekStart;

  const onAdd = () => {
    const name = draft.trim();
    if (!name) return;
    if (Object.keys(getWeek(weekStart).goals).length >= 3) return;
    setGoal(weekStart, name, "planned");
    setDraft("");
    setCompose(false);
  };

  const allowDrop = (e: React.DragEvent) => {
    if (Array.from(e.dataTransfer.types).includes(DND_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsDrop(true);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDrop(false);
    const payload = e.dataTransfer.getData(DND_MIME);
    if (!payload) return;
    try {
      const { goal, from, status } = JSON.parse(payload) as {
        goal: string;
        from: number;
        status: "planned" | "done";
      };
      if (!goal || from === weekStart) return;
      // capacity guard
      if (Object.keys(getWeek(weekStart).goals || {}).length >= 3) return;
      setGoal(weekStart, goal, status);
      clearGoal(from, goal);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className={`yvWeek ${open ? "is-open" : "is-closed"} ${isCurrent ? "is-current" : ""}`}>
      <div className="yvWeekHeader">
        <button
          type="button"
          className="yvWeekMeta"
          onClick={() => onOpenWeek(weekStart)}
          title="Open in Week view"
        >
          <span className="yvWeekCode">{code}</span>
          <span className="yvWeekDate">{sub}</span>
          <span className="yvBadge">{items.length}/3</span>
        </button>

        <div className="yvWeekHeaderRight">
          <button
            type="button"
            className="yvWeekCaret"
            aria-expanded={open}
            aria-label={open ? "Collapse week" : "Expand week"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "▾" : "▸"}
          </button>
        </div>
      </div>

      <div
        className={`yvWeekBody${isDrop ? " is-drop" : ""}`}
        onDragOver={allowDrop}
        onDragLeave={() => setIsDrop(false)}
        onDrop={onDrop}
      >
        <div className="yvGoals">
          {items.map((g) => {
            const status = goalsRec[g];
            const checked = status === "done";
            return (
              <div
                className="yvGoalItem"
                key={g}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DND_MIME, JSON.stringify({ goal: g, from: weekStart, status }));
                  e.dataTransfer.effectAllowed = "move";
                }}
                title="Drag to another week"
              >
                <ToggleButton checked={checked} onChange={() => toggleGoal(weekStart, g)} />
                <div className="yvGoalText" style={{ textDecoration: checked ? "line-through" : "none" }}>
                  {g}
                </div>
                <button
                  type="button"
                  className="yvXBtn"
                  aria-label={`Remove ${g}`}
                  title="Remove"
                  onClick={() => clearGoal(weekStart, g)}
                >
                  ×
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
    </section>
  );
}

/* ---------- Main Year View ---------- */
export default function YearView() {
  const selectedMs = useDateStore((s) => dayMs(s.selected));
  const year = new Date(selectedMs).getFullYear();
  const todayWeekStart = startOfWeek(Date.now());

  const openWeek = React.useCallback((weekMs: number) => {
    useDateStore.getState().setMs(weekMs);
    setView("week");
  }, []);

  const goYear = React.useCallback(
    (delta: number) => {
      const d = new Date(selectedMs);
      d.setFullYear(d.getFullYear() + delta);
      d.setHours(0, 0, 0, 0);
      useDateStore.getState().setMs(d.getTime());
    },
    [selectedMs]
  );

  const currentQ = (Math.floor(new Date(selectedMs).getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  const [openQs, setOpenQs] = React.useState<Set<1 | 2 | 3 | 4>>(new Set([currentQ]));
  const toggleQ = React.useCallback((q: 1 | 2 | 3 | 4) => {
    setOpenQs((prev) => {
      const next = new Set(prev);
      next.has(q) ? next.delete(q) : next.add(q);
      return next as Set<1 | 2 | 3 | 4>;
    });
  }, []);

  const qWeeks = React.useMemo(
    () => ({
      1: weeksForQuarter(year, 1),
      2: weeksForQuarter(year, 2),
      3: weeksForQuarter(year, 3),
      4: weeksForQuarter(year, 4),
    }),
    [year]
  );

  const monthsLabel = (q: 1 | 2 | 3 | 4) => ["JAN–MAR", "APR–JUN", "JUL–SEP", "OCT–DEC"][q - 1];

  return (
    <div className="yvContainer">
      {/* Year banner */}
      <div className="yvBannerWrap">
        <div className="yvBanner">
          <button type="button" className="yvChev" aria-label="Previous year" onClick={() => goYear(-1)}>
            ‹
          </button>
          <div style={{ textAlign: "center" }}>
            <div className="yvTitle" aria-live="polite">{`YEAR ${year}`}</div>
            <div className="yvSubTitle">{`JAN–DEC, ${year}`}</div>
          </div>
          <button type="button" className="yvChev" aria-label="Next year" onClick={() => goYear(+1)}>
            ›
          </button>
        </div>
      </div>

      {/* Quarters */}
      {([1, 2, 3, 4] as const).map((q) => (
        <section key={q} className={`yvQuarter ${!openQs.has(q) ? "yvCollapsed" : ""}`}>
          <div
            className="yvHeader"
            onClick={() => toggleQ(q)}
            role="button"
            aria-expanded={openQs.has(q)}
            aria-label={`Toggle Q${q}`}
          >
            <div className="yvHLeft">
              <div className="yvQLabel">{`Q${q}`}</div>
              <div className="yvQMonths">{monthsLabel(q)}</div>
            </div>
            <div className="yvHRight">
              <div>Up to 3 goals / week</div>
              <div className="yvChevQ">{openQs.has(q) ? "▾" : "▸"}</div>
            </div>
          </div>

          <div className="yvBody">
            <div className="yvWeeks">
              {qWeeks[q].map((w) => (
                <WeeklyRow
                  key={w}
                  weekStart={w}
                  onOpenWeek={openWeek}
                  currentWeekStart={todayWeekStart}
                />
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

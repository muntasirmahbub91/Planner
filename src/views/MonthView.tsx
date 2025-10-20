// src/views/MonthView.tsx
// Weekly single-pill calendar:
// - Click WEEK NUMBER or the WEEK PILL → navigate to /week for that exact week
// - Click a DAY CELL (partition) → navigate to /day for that date
// - Infinite scroll across years, editable week start, month tint, reminder dots

import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import "./MonthView.css";
import { useNavigate } from "react-router-dom";
import { useDateStore, dayMs } from "@/stores/dateStore";
import * as RemindersMod from "@/stores/remindersStore";

/* ---------- types ---------- */
type Reminder = { id: string; title: string; note?: string; at?: any; when?: any; datetime?: any; date?: any };
type AnyStoreShape =
  | { items?: Reminder[] }
  | { byId?: Record<string, Reminder>; order?: string[] }
  | Record<string, unknown>;

/* ---------- reminders adapter (zustand or plain object) ---------- */
function useRemindersAny<T>(selector: (s: AnyStoreShape) => T): T {
  const hook =
    (RemindersMod as any).useRemindersStore ??
    (RemindersMod as any).useReminders ??
    (RemindersMod as any).useReminderStore;
  if (typeof hook === "function") return hook(selector);
  const store = (RemindersMod as any).remindersStore;
  if (store?.getState && store?.subscribe) {
    const snap = useSyncExternalStore(store.subscribe, store.getState, store.getState);
    return selector(snap as AnyStoreShape);
  }
  const empty = { items: [] as Reminder[], byId: {} as Record<string, Reminder>, order: [] as string[] };
  return selector(empty);
}

/* ---------- date helpers ---------- */
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameYMD = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const YMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function startOfWeek(d: Date, weekStart: number) { const x = new Date(d); x.setHours(0,0,0,0); const diff = (x.getDay()-weekStart+7)%7; return addDays(x,-diff); }
function parseReminderDate(x: any): Date | null {
  if (!x) return null;
  if (x instanceof Date) return isNaN(+x) ? null : x;
  if (typeof x === "string" || typeof x === "number") { const d = new Date(x); return isNaN(+d) ? null : d; }
  if (x.date && typeof x.date === "string") { const d = new Date(x.time ? `${x.date}T${x.time}` : x.date); return isNaN(+d) ? null : d; }
  return null;
}

/* ---------- settings: week start ---------- */
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const labelsFrom = (s: number) => [...WEEKDAY_LABELS.slice(s), ...WEEKDAY_LABELS.slice(0, s)];
const loadWeekStart = () => { const raw = localStorage.getItem("planner.weekStart"); const n = raw ? Number(raw) : 2; return Number.isFinite(n) ? ((n%7)+7)%7 : 2; };
const saveWeekStart = (n: number) => localStorage.setItem("planner.weekStart", String(n));

/* ---------- reminder presence ---------- */
function buildReminderSet(state: AnyStoreShape) {
  const set = new Set<string>();
  const push = (r: any) => {
    const d = parseReminderDate(r?.at) ?? parseReminderDate(r?.when) ?? parseReminderDate(r?.datetime) ?? parseReminderDate(r?.date);
    if (d) set.add(YMD(d));
  };
  if (Array.isArray((state as any)?.items)) { for (const r of (state as any).items) push(r); return set; }
  const byId = (state as any)?.byId; const order = (state as any)?.order;
  if (byId && Array.isArray(order)) for (const id of order) push((byId as any)[id]);
  return set;
}

/* ---------- week number (relative to chosen start) ---------- */
function weekNumberForYear(d: Date, weekStart: number) {
  const y = d.getFullYear();
  const y0 = startOfWeek(new Date(y, 0, 1), weekStart);
  const ms = d.getTime() - y0.getTime();
  return ms < 0 ? 0 : Math.floor(ms / (7 * 24 * 60 * 60 * 1000)) + 1;
}

/* ---------- component ---------- */
export default function MonthView() {
  const navigate = useNavigate();
  const selectedEpochDay = useDateStore(s => s.selected);
  const setMs = useDateStore(s => s.setMs);
  const setTodaySelected = useDateStore(s => s.setTodaySelected);
  const anchor = new Date(dayMs(selectedEpochDay));

  const [weekStart, setWeekStart] = useState(loadWeekStart());
  const labels = labelsFrom(weekStart);

  const remindersState = useRemindersAny(s => s);
  const reminderSet = useMemo(() => buildReminderSet(remindersState), [remindersState]);

  // navigation helpers
  const openDay = (d: Date) => { useDateStore.getState().setMs(d.getTime()); navigate("/day"); };
  const openWeek = (start: Date) => { useDateStore.getState().setMs(start.getTime()); navigate("/week"); };

  // virtual window
  const ROW_H = 56;
  const INITIAL_BEFORE = 60, INITIAL_AFTER = 120;
  const [baseStart, setBaseStart] = useState<Date>(() => startOfWeek(anchor, weekStart));
  const [before, setBefore] = useState(INITIAL_BEFORE);
  const [after, setAfter] = useState(INITIAL_AFTER);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = startOfWeek(anchor, weekStart);
    setBaseStart(s); setBefore(INITIAL_BEFORE); setAfter(INITIAL_AFTER);
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = INITIAL_BEFORE * ROW_H; });
  }, [anchor.getTime(), weekStart]);

  useLayoutEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = INITIAL_BEFORE * ROW_H; }, []);

  const onScroll = () => {
    const el = scrollRef.current; if (!el) return;
    const top = el.scrollTop, max = el.scrollHeight - el.clientHeight;
    if (top < 10 * ROW_H) {
      setBefore(b => b + 52);
      setBaseStart(s => addDays(s, -52 * 7));
      el.scrollTop = top + 52 * ROW_H;
    }
    if (max - top < 10 * ROW_H) setAfter(a => a + 52);
  };

  const weeks = useMemo(() => {
    const list: { start: Date; days: Date[]; weekNo: number; yearLabel?: number }[] = [];
    let s = addDays(baseStart, -before * 7);
    const total = before + after;
    let prevYear = -1;
    for (let i = 0; i < total; i++) {
      const start = addDays(s, i * 7);
      const days = Array.from({ length: 7 }, (_, k) => addDays(start, k));
      const wn = weekNumberForYear(start, weekStart);
      const yearHere = start.getFullYear();
      const yearLabel = yearHere !== prevYear ? yearHere : undefined;
      if (yearLabel !== undefined) prevYear = yearHere;
      list.push({ start, days, weekNo: wn, yearLabel });
    }
    return list;
  }, [baseStart.getTime(), before, after, weekStart]);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  return (
    <main className="mv" role="main">
      {/* header */}
      <section className="mv-banner" aria-label="Week navigation">
        <button className="mv-chev" aria-label="Previous week"
          onClick={() => { const prev = addDays(startOfWeek(anchor, weekStart), -7); setMs(prev.getTime()); }}>‹</button>

        <div className="mv-bannerCenter">
          <div className="mv-title" aria-live="polite">{anchor.getFullYear()}</div>
          <button className="mv-todayBtn" onClick={() => { setTodaySelected(); navigate("/day"); }}>Today</button>
          <select
            aria-label="Week starts on"
            className="mv-todayBtn"
            value={weekStart}
            onChange={(e) => { const v = Number(e.target.value); setWeekStart(v); saveWeekStart(v); }}
          >
            <option value={6}>Saturday</option>
            <option value={0}>Sunday</option>
            <option value={1}>Monday</option>
            <option value={2}>Tuesday</option>
          </select>
        </div>

        <button className="mv-chev" aria-label="Next week"
          onClick={() => { const next = addDays(startOfWeek(anchor, weekStart), 7); setMs(next.getTime()); }}>›</button>
      </section>

      {/* weekday ribbon */}
      <section style={{ marginBottom: 8 }}>
        <div className="mv-weekRibbon">
          {labels.map((lab, i) => <div key={i} className="mv-weekRibbonCell">{lab}</div>)}
        </div>
      </section>

      {/* scroller */}
      <section className="mv-scroll" onScroll={onScroll} ref={scrollRef} aria-label="Weeks scroller">
        {weeks.map(({ start, days, weekNo, yearLabel }, idx) => {
          const monthStartIdx = days.findIndex(d => d.getDate() === 1);
          const monthParity = days[0].getMonth() % 2;

          return (
            <div className="mv-weekRow" key={`${start.toISOString()}-${idx}`}>
              {/* year line */}
              {yearLabel !== undefined && <div className="mv-yearChip">{yearLabel}</div>}

              {/* week number → WeekView */}
              <button
                type="button"
                className="mv-weekNo"
                title={`Week ${weekNo}`}
                onClick={() => openWeek(start)}
              >
                W{String(weekNo).padStart(2, "0")}
              </button>

              {/* week pill → WeekView. day partitions → DayView */}
              <button
                type="button"
                className={`mv-weekPillOne ${monthParity ? "mv-pTintB" : "mv-pTintA"}`}
                onClick={() => openWeek(start)}
                aria-label={`Week ${weekNo} starting ${start.toDateString()}. Click to open week.`}
              >
                <div className="mv-partitions">
                  {days.map((d, i) => {
                    const isToday = sameYMD(d, today);
                    const isPast = d < today;
                    const hasReminder = reminderSet.has(YMD(d));
                    const isNewMonthEdge = i === monthStartIdx;
                    const mCls = `mv-m${d.getMonth()}`; // 0..11
                    return (
                      <div
                        key={i}
                        className={
                          `mv-part ${isPast ? "mv-partPast" : "mv-partFuture"} ${isToday ? "mv-partToday" : ""} ${isNewMonthEdge ? "mv-partNewMonth" : ""} ${mCls}`
                        }
                        style={{ left: `${(i / 7) * 100}%` }}
                        onClick={(e) => { e.stopPropagation(); openDay(d); }}
                        role="button"
                        title={d.toDateString()}
                        aria-label={`${d.toDateString()}${hasReminder ? " has reminders" : ""}`}
                      >
                        <span className="mv-partNum">{d.getDate()}</span>
                        {hasReminder && <span className="mv-remDot" aria-hidden="true" />}
                      </div>
                    );
                  })}
                </div>
              </button>
            </div>
          );
        })}
      </section>
    </main>
  );
}

import React, { useMemo, useState } from "react";
import {
  useHabits,
  getWindow,
  setState,
  setName,
  addHabit,
  removeHabit,
  pastelFromId,
} from "@/stores/habits";
import "./HabitSection.css";

type Row = { id: string; name: string; states?: boolean[]; state?: Record<number | string, boolean> };

const ensureSeven = (arr: boolean[] = []) => {
  const out = arr.slice(0, 7);
  while (out.length < 7) out.push(false);
  return out;
};

export default function HabitSection({ anchorMs }: { anchorMs: number }) {
  // subscribe and get a changing reference so memo recomputes on updates
  const storeState = useHabits();

  // recompute window when anchor or store changes
  const { days, rows } = useMemo(() => {
    const win = getWindow(anchorMs) || { days: [], rows: [] };
    return {
      days: Array.isArray(win.days) ? win.days : [],
      rows: Array.isArray(win.rows) ? (win.rows as Row[]) : [],
    };
  }, [anchorMs, storeState]);

  const isToday = (ms: number) =>
    new Date(ms).toDateString() === new Date().toDateString();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const atCap = rows.length >= 5;

  function addNow() {
    const t = draft.trim();
    if (!t) return;
    addHabit(t);
    setDraft("");
    setAdding(false);
  }

  return (
    <details className="habits" open>
      <summary className="habits__summary">
        <span>HABITS</span>
        {!atCap && (
          <button
            className="circlePlus circlePlus--blue"
            onClick={(e) => {
              e.preventDefault();
              setAdding((v) => !v);
            }}
            aria-label="Add habit"
            title="Add habit"
          >
            +
          </button>
        )}
      </summary>

      {adding && (
        <div className="habits__add">
          <input
            className="fldInput"
            placeholder="Habit name…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addNow();
              if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            maxLength={40}
            aria-label="Habit name"
          />
          <button className="btn btn--primary" onClick={addNow} aria-label="Confirm add">
            Add
          </button>
        </div>
      )}

      <div className="habGrid">
        <div className="hHead" />
        {days.map((d, i) => (
          <div key={i} className="hHead">
            {new Date(d).toLocaleDateString(undefined, { weekday: "short" })}
          </div>
        ))}

        {rows.length === 0 && (
          <div className="hEmpty" style={{ gridColumn: "1 / -1" }}>
            No habits
          </div>
        )}

        {rows.map((r) => {
          // support either r.states[7] or r.state[dayMs]
          const rowStates = ensureSeven(
            r.states ??
              days.map((d) => Boolean(r.state?.[d] ?? r.state?.[String(d)]))
          );
          return (
            <React.Fragment key={r.id}>
              <div className="hName" style={{ background: pastelFromId(r.id) }}>
                <input
                  className="hNameInput"
                  value={r.name}
                  onChange={(e) => setName(r.id, e.target.value)}
                  aria-label={`Rename ${r.name}`}
                />
                <button
                  className="icon hDel"
                  onClick={() => removeHabit(r.id)}
                  aria-label={`Delete ${r.name}`}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
              {rowStates.map((done, idx) => {
                const d = days[idx];
                return (
                  <button
                    key={idx}
                    className={`hCell ${isToday(d) ? "today" : ""} ${
                      done ? "done" : "neutral"
                    }`}
                    onClick={() => setState(r.id, d, !done)}
                    title={new Date(d).toDateString()}
                    aria-label={`Toggle ${new Date(d).toDateString()} for ${r.name}`}
                  >
                    {done ? "✓" : ""}
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </details>
  );
}

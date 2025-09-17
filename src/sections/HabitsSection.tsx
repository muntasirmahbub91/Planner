// src/sections/HabitsSection.tsx
import React, { useMemo, useState } from "react";
import AddButton from "@/components/AddButton";
import ToggleButton from "@/components/ToggleButton";
import {
  useDateStore,
  dayMs,
  WEEK_START_DOW,
  weekStartMs,
  DAY_MS,
} from "@/stores/dateStore";
import {
  useHabits,         // subscription tick
  listAll,           // Habit[]
  getWeekLog,        // (habitId, weekStartMs) => boolean[7]
  toggleDay,         // (habitId, weekStartMs, index) => void
  // Optional actions (will be feature-detected below)
  // add as addHabitMaybe,
  // rename as renameHabitMaybe,
} from "@/stores/habitsStore";

type Habit = {
  id: string;
  name: string;
  // optional legacy fields allowed; not used directly
};

const PILL = 28;

export default function HabitsSection() {
  // subscribe to store changes once; re-compute via selectors/memos
  const tick = useHabits();

  // selected day → start of that calendar week
  const selectedEday = useDateStore((s) => s.selected);
  const selectedMs = dayMs(selectedEday);
  const weekStart = weekStartMs(selectedMs, WEEK_START_DOW);

  // “today” at local midnight for future guard
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  // days in this calendar week
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart + i * DAY_MS),
    [weekStart]
  );

  // list habits
  const habits = useMemo(() => listAll(), [tick]);

  // compose state
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState("");

  // feature-detect store actions for add/rename
  const addHabit = (name: string) => {
    // try named export
    // @ts-ignore
    if (typeof (imported as any)?.add === "function") return (imported as any).add(name);
    // try common alternates on store instance
    // @ts-ignore
    const s = (useHabits as any).getState?.();
    const fn =
      s?.add ??
      s?.addHabit ??
      s?.create ??
      s?.createHabit;
    if (typeof fn === "function") return fn(name);
    console.warn("No add habit action available");
  };
  const renameHabit = (id: string, name: string) => {
    // @ts-ignore
    if (typeof (imported as any)?.rename === "function") return (imported as any).rename(id, name);
    // @ts-ignore
    const s = (useHabits as any).getState?.();
    const fn =
      s?.rename ??
      s?.renameHabit ??
      s?.updateName ??
      s?.update;
    if (typeof fn === "function") return fn(id, name);
    console.warn("No rename habit action available");
  };

  // Inline add
  function onAdd() {
    const name = draft.trim();
    if (!name) return;
    addHabit(name);
    setDraft("");
    setCompose(false);
  }

  return (
    <section
      aria-label="Habits"
      style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fbfdf6" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontWeight: 800 }}>HABITS</h3>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Week of{" "}
            {new Date(weekStart).toLocaleDateString(undefined, {
              month: "short",
              day: "2-digit",
            })}
          </div>
        </div>
        <AddButton aria-label="Add habit" onClick={() => setCompose((v) => !v)} />
      </div>

      {/* Add box */}
      {compose && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAdd();
              if (e.key === "Escape") {
                setDraft("");
                setCompose(false);
              }
            }}
            placeholder="Habit name…"
            aria-label="Habit name"
            style={{
              flex: "1 1 auto",
              height: 32,
              padding: "0 8px",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              outline: "none",
              fontSize: 14,
            }}
            maxLength={60}
            autoFocus
          />
          <button
            onClick={onAdd}
            style={{
              height: 32,
              padding: "0 10px",
              border: "1px solid #16a34a",
              background: "#16a34a",
              color: "#fff",
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            Add
          </button>
        </div>
      )}

      {/* Weekday header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `auto repeat(7, ${PILL}px)`,
          gap: 8,
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <div />
        {days.map((d, i) => (
          <div
            key={d}
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              background: "#fff",
              border: "1px solid #e5e7eb",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: 11,
              opacity: d > todayStart ? 0.4 : 1,
            }}
            aria-hidden
            aria-current={i === 6 ? "date" : undefined}
            title={new Date(d).toDateString()}
          >
            {"SMTWTFS"[new Date(d).getDay()]}
          </div>
        ))}
      </div>

      {/* Habit rows */}
      <div style={{ display: "grid", gap: 6 }}>
        {habits.map((h: Habit) => {
          const log = getWeekLog(h.id, weekStart); // boolean[7]
          return (
            <div
              key={h.id}
              style={{
                display: "grid",
                gridTemplateColumns: `auto repeat(7, ${PILL}px)`,
                gap: 8,
                alignItems: "center",
              }}
            >
              <InlineEditable
                value={h.name}
                onCommit={(v) => renameHabit(h.id, v)}
                ariaLabel={`Rename ${h.name}`}
              />
              {log.map((v, i) => {
                const dayStart = days[i];
                const isFuture = dayStart > todayStart;
                return (
                  <ToggleButton
                    key={i}
                    ariaLabel={`Toggle ${h.name} for ${new Date(dayStart).toDateString()}`}
                    value={!!v}
                    disabled={isFuture}
                    className="ui-HabitToggle"
                    onChange={() => {
                      if (!isFuture) toggleDay(h.id, weekStart, i);
                    }}
                  />
                );
              })}
            </div>
          );
        })}

        {habits.length === 0 && (
          <div style={{ padding: 8, color: "#64748b", fontStyle: "italic", textAlign: "center", fontSize: 14 }}>
            No habits yet. Click + to add one.
          </div>
        )}
      </div>
    </section>
  );
}

/* Inline rename control */
function InlineEditable({
  value,
  onCommit,
  ariaLabel,
}: {
  value: string;
  onCommit: (v: string) => void;
  ariaLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  return editing ? (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setEditing(false);
        onCommit(text.trim() || value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setEditing(false);
          onCommit(text.trim() || value);
        }
        if (e.key === "Escape") {
          setText(value);
          setEditing(false);
        }
      }}
      aria-label={ariaLabel}
      style={{
        height: 32,
        padding: "0 8px",
        border: "1px solid #cbd5e1",
        borderRadius: 8,
        outline: "none",
        fontSize: 14,
      }}
      autoFocus
    />
  ) : (
    <button
      type="button"
      onClick={() => {
        setText(value);
        setEditing(true);
      }}
      style={{
        textAlign: "left",
        background: "transparent",
        border: "none",
        padding: "4px 6px",
        fontWeight: 600,
        fontSize: 14,
        cursor: "text",
      }}
      aria-label={ariaLabel}
      title="Rename"
    >
      {value}
    </button>
  );
}

// Workaround to allow feature-detecting optional named exports without TS errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const imported = null as unknown as {
  add?: (name: string) => void;
  rename?: (id: string, name: string) => void;
};

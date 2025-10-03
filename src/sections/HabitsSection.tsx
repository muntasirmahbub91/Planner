// src/sections/HabitsSection.tsx — header minus, row select, confirm delete
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
  useHabits,
  listAll,
  getWeekLog,
  toggleDay,
} from "@/stores/habitsStore";

type Habit = { id: string; name: string };

const PILL = 24;

export default function HabitsSection() {
  const tick = useHabits();

  const selectedEday = useDateStore((s) => s.selected);
  const selectedMs = dayMs(selectedEday);
  const weekStart = weekStartMs(selectedMs, WEEK_START_DOW);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart + i * DAY_MS),
    [weekStart]
  );

  const habits = useMemo(() => listAll(), [tick]);

  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // --- store action adapters ---
  const addHabit = (name: string) => {
    // @ts-ignore
    const s = (useHabits as any).getState?.();
    const fn = s?.add ?? s?.addHabit ?? s?.create ?? s?.createHabit;
    if (typeof fn === "function") return fn(name);
  };
  const renameHabit = (id: string, name: string) => {
    // @ts-ignore
    const s = (useHabits as any).getState?.();
    const fn = s?.rename ?? s?.renameHabit ?? s?.updateName ?? s?.update;
    if (typeof fn === "function") return fn(id, name);
  };
  const removeHabit = (id: string) => {
    // @ts-ignore
    const s = (useHabits as any).getState?.();
    const fn = s?.remove ?? s?.delete ?? s?.deleteHabit ?? s?.removeHabit;
    if (typeof fn === "function") return fn(id);
  };

  function onAdd() {
    const name = draft.trim();
    if (!name) return;
    addHabit(name);
    setDraft("");
    setCompose(false);
  }

  function onDeleteSelected() {
    if (!selectedId) return;
    const h = habits.find((x: Habit) => x.id === selectedId);
    const ok = window.confirm(`Delete habit “${h?.name ?? "Untitled"}”?`);
    if (!ok) return;
    removeHabit(selectedId);
    setSelectedId(null);
  }

  return (
    <section
      aria-label="Habits"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 12,
        background: "#fbfdf6",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontWeight: 800 }}>HABITS</h3>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Week of{" "}
            {new Date(weekStart).toLocaleDateString(undefined, {
              month: "short",
              day: "2-digit",
            })}
          </div>
        </div>

        <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          {/* Global minus LEFT of green + */}
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={!selectedId}
            title={
              selectedId ? "Delete selected habit" : "Select a habit to delete"
            }
            aria-label="Delete selected habit"
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              border: "1px solid #fecaca",
              background: "#fee2e2",
              color: "#b91c1c",
              fontWeight: 900,
              cursor: selectedId ? "pointer" : "not-allowed",
              opacity: selectedId ? 1 : 0.6,
            }}
          >
            –
          </button>

          <AddButton
            aria-label="Add habit"
            onClick={() => setCompose((v) => !v)}
          />
        </div>
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
              padding: "0 8px",
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

      {/* Weekday header */}
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
        {days.map((d) => (
          <div
            key={d}
            style={{
              width: PILL,
              height: PILL,
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              fontSize: 11,
              borderRadius: 999,
              background: "#fff",
              border: "1px solid #e5e7eb",
              opacity: d > todayStart ? 0.4 : 1,
            }}
            aria-hidden
            title={new Date(d).toDateString()}
          >
            {"SMTWTFS"[new Date(d).getDay()]}
          </div>
        ))}
      </div>

      {/* Habit rows (click to select) */}
      <div style={{ display: "grid", gap: 6 }}>
        {habits.map((h: Habit) => {
          const log = getWeekLog(h.id, weekStart);
          const selected = selectedId === h.id;
          return (
            <div
              key={h.id}
              onClick={() => setSelectedId(h.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setSelectedId(h.id);
              }}
              style={{
                display: "grid",
                gridTemplateColumns: `auto repeat(7, ${PILL}px)`,
                gap: 8,
                alignItems: "center",
                padding: 6,
                borderRadius: 10,
                border: selected ? "2px solid #94a3b8" : "1px solid #e5e7eb",
                background: selected ? "#f1f5f9" : "transparent",
                cursor: "pointer",
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
                  <div
                    key={i}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: PILL,
                      height: PILL,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <ToggleButton
                      ariaLabel={`Toggle ${h.name} for ${new Date(
                        dayStart
                      ).toDateString()}`}
                      value={!!v}
                      disabled={isFuture}
                      className="ui-HabitToggle"
                      onChange={() => {
                        if (!isFuture) toggleDay(h.id, weekStart, i);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}

        {habits.length === 0 && (
          <div
            style={{
              padding: 8,
              color: "#64748b",
              fontStyle: "italic",
              textAlign: "center",
              fontSize: 14,
            }}
          >
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
        background: "#fff",
      }}
      autoFocus
    />
  ) : (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
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

// src/sections/HabitsSection.tsx — unified grid, fixed name column, compact multiline editor (no outline)
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

const CELL = 24;      // toggle pill size
const NAME_W = 180;   // fixed name column width

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

  // store adapters
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
    if (window.confirm(`Delete habit “${h?.name ?? "Untitled"}”?`)) {
      removeHabit(selectedId);
      setSelectedId(null);
    }
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
          <button
            type="button"
            onClick={onDeleteSelected}
            disabled={!selectedId}
            title={selectedId ? "Delete selected habit" : "Select a habit to delete"}
            aria-label="Delete selected habit"
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              border: "1px solid #fecaca",
              background: "#fee2e2",
              color: "#b91c1c",
              fontWeight: 900,
              fontSize: 18,
              lineHeight: 1,
              cursor: selectedId ? "pointer" : "not-allowed",
              opacity: selectedId ? 1 : 0.6,
            }}
          >
            –
          </button>
          <AddButton aria-label="Add habit" onClick={() => setCompose((v) => !v)} />
        </div>
      </div>

      {/* Composer */}
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
              background: "#fff",
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

      {/* Unified grid: header row + aligned rows */}
      <div style={{ overflowX: "auto", padding: "0 6px" }}>
        <div
          role="grid"
          aria-rowcount={habits.length + 1}
          aria-colcount={8}
          style={{
            display: "grid",
            gridTemplateColumns: `${NAME_W}px repeat(7, ${CELL}px)`,
            rowGap: 8,
          }}
        >
          {/* Header row */}
          <div role="row" style={{ display: "contents" }}>
            <div role="columnheader" />
            {days.map((d) => {
              const disabled = d > todayStart;
              return (
                <div
                  key={d}
                  role="columnheader"
                  title={new Date(d).toDateString()}
                  style={{
                    width: CELL,
                    height: CELL,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 999,
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    opacity: disabled ? 0.4 : 1,
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  {"SMTWTFS"[new Date(d).getDay()]}
                </div>
              );
            })}
          </div>

          {/* Data rows */}
          {habits.map((h: Habit) => {
            const log = getWeekLog(h.id, weekStart);
            const selected = selectedId === h.id;
            return (
              <div key={h.id} role="row" style={{ display: "contents" }}>
                {/* Name cell — confined to NAME_W */}
                <div
                  role="rowheader"
                  onClick={() => setSelectedId(h.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedId(h.id);
                  }}
                  tabIndex={0}
                  style={{
                    width: NAME_W,
                    minWidth: 0,
                    padding: "6px 8px",
                    borderRadius: 10,
                    border: selected ? "2px solid #94a3b8" : "1px solid #e5e7eb",
                    background: selected ? "#f1f5f9" : "#ffffff",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    boxSizing: "border-box",
                    cursor: "pointer",
                  }}
                  title={h.name}
                >
                  <InlineEditable
                    value={h.name}
                    onCommit={(v) => renameHabit(h.id, v)}
                    ariaLabel={`Rename ${h.name}`}
                  />
                </div>

                {/* Seven aligned toggle cells */}
                {log.map((v, i) => {
                  const dayStart = days[i];
                  const isFuture = dayStart > todayStart;
                  return (
                    <div
                      key={i}
                      role="gridcell"
                      style={{
                        width: CELL,
                        height: CELL,
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
                        onChange={() => {
                          if (!isFuture) toggleDay(h.id, weekStart, i);
                        }}
                        sizePx={CELL}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* Inline rename control — compact, borderless textarea that wraps to a second line */
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
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setEditing(false);
        onCommit(text.trim() || value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          setEditing(false);
          onCommit(text.trim() || value);
        }
        if (e.key === "Escape") {
          setText(value);
          setEditing(false);
        }
      }}
      aria-label={ariaLabel}
      rows={2}
      style={{
        width: "140px",         // compact editor width
        maxWidth: "100%",
        boxSizing: "border-box",
        padding: "6px 8px",
        border: "0",            // no visible outline/border
        outline: "0",
        boxShadow: "none",
        borderRadius: 8,
        background: "transparent",
        fontSize: 14,
        lineHeight: 1.25,
        resize: "none",
        overflow: "hidden",
        color: "inherit",
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
        padding: "4px 0",
        fontWeight: 600,
        fontSize: 14,
        cursor: "text",
        width: "100%",
      }}
      aria-label={ariaLabel}
      title="Rename"
    >
      {value}
    </button>
  );
}

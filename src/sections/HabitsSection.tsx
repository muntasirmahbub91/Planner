import React, { useMemo, useState } from "react";
import AddButton from "@/components/AddButton";
import ToggleButton from "@/components/ToggleButton";
import { useHabitsStore, type Habit } from "@/stores/habitsStore";

const DAYS = ["S","S","M","T","W","T","F"];
const MAX_HABITS = 5;

export default function HabitSection() {
  const habits = useHabitsStore(s => s.habits);
  const add = useHabitsStore(s => s.add);
  const rename = useHabitsStore(s => s.rename);
  const setToggle = useHabitsStore(s => s.setToggle);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const atCap = habits.length >= MAX_HABITS;
  const gridTemplate = useMemo<React.CSSProperties>(
    () => ({ display: "grid", gridTemplateColumns: "1fr repeat(7, 36px)", gap: 12 }),
    []
  );

  function addNow() {
    if (atCap) return;
    add(draft.trim());
    setDraft("");
    setAdding(false);
  }

  return (
    <section style={box}>
      <header className="Habits__header" style={{ ...header, position: "relative", zIndex: 2 }}>
        <h3 style={title}>HABITS</h3>
        <AddButton
          size="sm"
          ariaLabel={atCap ? "Habit cap reached" : "Add habit"}
          title={atCap ? "Habit cap reached" : "Add habit"}
          onClick={() => { if (!atCap) setAdding(v => !v); }}
        />
      </header>

      {adding && !atCap && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addNow();
              if (e.key === "Escape") { setDraft(""); setAdding(false); }
            }}
            placeholder="Habit name…"
            aria-label="Habit name"
            style={input}
            maxLength={40}
            autoFocus
          />
          <button onClick={addNow} style={primaryBtn} aria-label="Confirm add">Add</button>
        </div>
      )}

      {/* Days header */}
      <div style={{ ...gridTemplate, alignItems: "center", marginBottom: 8 }}>
        <div />
        {DAYS.map((d, i) => (
          <div key={i} style={dayBadge} aria-hidden>{d}</div>
        ))}
      </div>

      {/* Habit rows */}
      <div style={{ display: "grid", gap: 10 }}>
        {habits.map((h: Habit) => (
          <div key={h.id} style={{ ...gridTemplate, alignItems: "center" }}>
            <InlineEditable
              value={h.name}
              onCommit={(v) => rename(h.id, v)}
              ariaLabel={`Rename ${h.name}`}
            />
            {h.toggles.map((on: boolean, i: number) => (
              <ToggleButton
                key={i}
                ariaLabel={`Toggle ${h.name} day ${i + 1}`}
                pressed={!!on}
                onChange={(next) => setToggle(h.id, i, next)}
                className="ui-HabitToggle"
              />
            ))}
          </div>
        ))}

        {habits.length === 0 && (
          <div style={empty}>No habits yet. Click + to add one.</div>
        )}
      </div>
    </section>
  );
}

/* tiny styles */
const box: React.CSSProperties = {
  border:"1px solid #e5e7eb", borderRadius:12, padding:16, background:"#fbfdf6",
};
const header: React.CSSProperties = { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 };
const title: React.CSSProperties = { margin:0, fontSize:20, fontWeight:800 };
const input: React.CSSProperties = {
  flex:"1 1 auto", height:36, padding:"0 10px", border:"1px solid #cbd5e1", borderRadius:8, outline:"none",
};
const primaryBtn: React.CSSProperties = {
  height:36, padding:"0 14px", border:"1px solid #16a34a", background:"#16a34a", color:"#fff", borderRadius:8,
};
const dayBadge: React.CSSProperties = {
  width:32, height:32, borderRadius:999, background:"#fff", border:"1px solid #e5e7eb",
  display:"grid", placeItems:"center", fontWeight:700,
};
const empty: React.CSSProperties = { padding:12, color:"#64748b", fontStyle:"italic", textAlign:"center" };

/* minimal inline editable */
function InlineEditable({
  value, onCommit, ariaLabel,
}: { value: string; onCommit: (v: string) => void; ariaLabel?: string; }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  return editing ? (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => { setEditing(false); onCommit(text.trim() || value); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { setEditing(false); onCommit(text.trim() || value); }
        if (e.key === "Escape") { setText(value); setEditing(false); }
      }}
      aria-label={ariaLabel}
      style={input}
      autoFocus
    />
  ) : (
    <button
      type="button"
      onClick={() => setEditing(true)}
      style={{ textAlign:"left", background:"transparent", border:"none", padding:"6px 8px", fontWeight:600 }}
      aria-label={ariaLabel}
      title="Rename"
    >
      {value}
    </button>
  );
}

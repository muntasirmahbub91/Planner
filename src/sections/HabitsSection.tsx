// HabitSection.tsx (tight version)
import React, { useMemo, useState } from "react";
import AddButton from "@/components/AddButton";
import ToggleButton from "@/components/ToggleButton";
import { useHabitsStore, type Habit } from "@/stores/habitsStore";

const DAYS = ["S","S","M","T","W","T","F"];
const MAX_HABITS = 5;

/* compact sizing */
const PAD = 12;
const GAP = 8;
const PILL = 28;     // toggle size
const DAY = 22;      // day badge size
const FS_TITLE = 16;
const FS_TEXT = 14;
const FS_DAY = 11;

export default function HabitSection() {
  const habits = useHabitsStore(s => s.habits);
  const add = useHabitsStore(s => s.add);
  const rename = useHabitsStore(s => s.rename);
  const setToggle = useHabitsStore(s => s.setToggle);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const atCap = habits.length >= MAX_HABITS;
  const gridTemplate = useMemo<React.CSSProperties>(
    () => ({ display: "grid", gridTemplateColumns: `auto repeat(7, ${PILL}px)`, gap: GAP }),
    []
  );

  function addNow() {
    if (atCap) return;
    const t = draft.trim();
    if (!t) return;
    add(t);
    setDraft("");
    setAdding(false);
  }

  return (
    <section style={box}>
      <header className="Habits__header" style={header}>
        <h3 style={title}>HABITS</h3>
        <AddButton
          size="sm"
          ariaLabel={atCap ? "Habit cap reached" : "Add habit"}
          title={atCap ? "Habit cap reached" : "Add habit"}
          onClick={() => { if (!atCap) setAdding(v => !v); }}
        />
      </header>

      {adding && !atCap && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
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
      <div style={{ ...gridTemplate, alignItems: "center", marginBottom: 6 }}>
        <div />
        {DAYS.map((d, i) => (
          <div key={i} style={dayBadge} aria-hidden>{d}</div>
        ))}
      </div>

      {/* Habit rows */}
      <div style={{ display: "grid", gap: 6 }}>
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

/* compact styles */
const box: React.CSSProperties = {
  border:"1px solid #e5e7eb", borderRadius:12, padding:PAD, background:"#fbfdf6",
};
const header: React.CSSProperties = { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 };
const title: React.CSSProperties = { margin:0, fontSize:FS_TITLE, fontWeight:800, letterSpacing:.3 };
const input: React.CSSProperties = {
  flex:"1 1 auto", height:32, padding:"0 8px", border:"1px solid #cbd5e1", borderRadius:8, outline:"none", fontSize:16
};
const primaryBtn: React.CSSProperties = {
  height:32, padding:"0 10px", border:"1px solid #16a34a", background:"#16a34a", color:"#fff", borderRadius:8, fontSize:14
};
const dayBadge: React.CSSProperties = {
  width:DAY, height:DAY, borderRadius:999, background:"#fff", border:"1px solid #e5e7eb",
  display:"grid", placeItems:"center", fontWeight:700, fontSize:FS_DAY
};
const empty: React.CSSProperties = { padding:8, color:"#64748b", fontStyle:"italic", textAlign:"center", fontSize:FS_TEXT };

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
      style={{ textAlign:"left", background:"transparent", border:"none", padding:"4px 6px", fontWeight:600, fontSize:14 }}
      aria-label={ariaLabel}
      title="Rename"
    >
      {value}
    </button>
  );
}

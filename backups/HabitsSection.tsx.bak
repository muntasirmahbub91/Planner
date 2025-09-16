// src/sections/HabitsSection.tsx
import React, { useMemo, useState } from "react";
import AddButton from "@/components/AddButton";
import ToggleButton from "@/components/ToggleButton";
import { useHabitsStore, type Habit } from "@/stores/habitsStore";
import { useDateStore } from "@/stores/dateStore";

/* sizing */
const PAD = 12, GAP = 8, PILL = 28, DAY = 22, FS_TITLE = 16, FS_TEXT = 14, FS_DAY = 11;
const dayLetter = (eDay: number) => ["S","M","T","W","T","F","S"][new Date(eDay * 86400000).getDay()];
const last7 = (anchor: number) => Array.from({ length: 7 }, (_, i) => anchor - 6 + i);

export default function HabitsSection() {
  const hydrated = useHabitsStore(s => s._hydrated); // non-blocking
  const habits = useHabitsStore(s => s.habits);
  const add = useHabitsStore(s => s.add);
  const rename = useHabitsStore(s => s.rename);
  const setForDay = useHabitsStore(s => s.setForDay);

  const anchor = useDateStore(s => s.followHabits === "dayview" ? s.selected : s.today);
  const today = useDateStore(s => s.today);
  const days = useMemo(() => last7(anchor), [anchor]);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function addNow() {
    const t = draft.trim();
    if (!t) return;
    add(t);
    setDraft("");
    setAdding(false);
  }

  return (
    <section style={box} aria-label="Habits">
      <header style={header}>
        <h3 style={title}>HABITS</h3>
        <AddButton size="sm" ariaLabel="Add habit" title="Add habit" onClick={() => setAdding(v => !v)} />
      </header>

      {adding && (
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

      {!hydrated && <div style={{opacity:.6, fontSize:12, marginBottom:6}}>Loading habits…</div>}

      <div style={{ display: "grid", gridTemplateColumns: `auto repeat(7, ${PILL}px)`, gap: GAP, alignItems: "center", marginBottom: 6 }}>
        <div />
        {days.map((d, i) => (
          <div
            key={d}
            style={{ ...dayBadge, opacity: d > today ? 0.4 : 1, outline: i === 6 ? "2px solid #e6e6e6" : "none", outlineOffset: 0 }}
            aria-hidden
            aria-current={i === 6 ? "date" : undefined}
            title={new Date(d * 86400000).toDateString()}
          >
            {dayLetter(d)}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {habits.map((h: Habit) => (
          <div key={h.id} style={{ display: "grid", gridTemplateColumns: `auto repeat(7, ${PILL}px)`, gap: GAP, alignItems: "center" }}>
            <InlineEditable value={h.name} onCommit={(v) => rename(h.id, v)} ariaLabel={`Rename ${h.name}`} />
            {days.map((d) => {
              const pressed = !!h.log[d];
              const isFuture = d > today;
              return (
                <ToggleButton
                  key={d}
                  ariaLabel={`Toggle ${h.name} for ${new Date(d * 86400000).toDateString()}`}
                  pressed={pressed}
                  disabled={isFuture}
                  className="ui-HabitToggle"
                  onClick={() => !isFuture && setForDay(h.id, d, !pressed)}
                  onChange={(next: any) => setForDay(h.id, d, typeof next === "boolean" ? next : !pressed)}
                />
              );
            })}
          </div>
        ))}

        {hydrated && habits.length === 0 && (
          <div style={empty}>No habits yet. Click + to add one.</div>
        )}
      </div>
    </section>
  );
}

/* styles */
const box: React.CSSProperties = { border:"1px solid #e5e7eb", borderRadius:12, padding:PAD, background:"#fbfdf6" };
const header: React.CSSProperties = { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 };
const title: React.CSSProperties = { margin:0, fontSize:FS_TITLE, fontWeight:800, letterSpacing:.3 };
const input: React.CSSProperties = { flex:"1 1 auto", height:32, padding:"0 8px", border:"1px solid #cbd5e1", borderRadius:8, outline:"none", fontSize:16 };
const primaryBtn: React.CSSProperties = { height:32, padding:"0 10px", border:"1px solid #16a34a", background:"#16a34a", color:"#fff", borderRadius:8, fontSize:14 };
const dayBadge: React.CSSProperties = { width:DAY, height:DAY, borderRadius:999, background:"#fff", border:"1px solid #e5e7eb", display:"grid", placeItems:"center", fontWeight:700, fontSize:FS_DAY };
const empty: React.CSSProperties = { padding:8, color:"#64748b", fontStyle:"italic", textAlign:"center", fontSize:FS_TEXT };

function InlineEditable({ value, onCommit, ariaLabel }: { value: string; onCommit: (v: string) => void; ariaLabel?: string; }) {
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
    <button type="button" onClick={() => setEditing(true)} style={{ textAlign:"left", background:"transparent", border:"none", padding:"4px 6px", fontWeight:600, fontSize:14 }} aria-label={ariaLabel} title="Rename">
      {value}
    </button>
  );
}

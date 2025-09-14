import React, { useEffect, useState } from "react";
import journal, { useJournal } from "@/stores/journal";

type Props = {
  dayMs: number;
  placeholder?: string;
  onSaved?: () => void;
};

export function JournalEntryEditor({ dayMs, placeholder, onSaved }: Props) {
  useJournal(); // subscribe to changes
  const [text, setText] = useState("");

  useEffect(() => {
    setText(journal.get(dayMs) || "");
  }, [dayMs]);

  function save() {
    journal.set(dayMs, text);
    onSaved?.();
  }
  function clearEntry() {
    setText("");
    journal.set(dayMs, "");
    onSaved?.();
  }

  const subtitle = new Intl.DateTimeFormat(undefined, {
    weekday: "long", month: "short", day: "2-digit", year: "numeric"
  }).format(dayMs);

  return (
    <div style={{border:"1px solid #eee", borderRadius:12, background:"#fff", padding:12, display:"grid", gap:8}}>
      <div style={{fontWeight:700}}>{subtitle}</div>
      <textarea
        value={text}
        onChange={(e)=>setText(e.target.value)}
        placeholder={placeholder || "Write…"}
        style={{minHeight:260, resize:"vertical", border:"1px solid #ddd", borderRadius:8, padding:10}}
      />
      <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
        <button onClick={clearEntry} style={{border:"1px solid #ddd", background:"#fff", borderRadius:8, padding:"6px 10px"}}>Clear</button>
        <button onClick={save} style={{border:"1px solid #111", background:"#111", color:"#fff", borderRadius:8, padding:"6px 12px"}}>Save</button>
      </div>
    </div>
  );
}

export default JournalEntryEditor;

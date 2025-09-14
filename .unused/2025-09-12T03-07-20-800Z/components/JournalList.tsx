import React from "react";
import journal, { useJournal } from "@/stores/journal";

type Props = {
  days?: number;                 // how many days back to list
  onSelect?: (dayMs: number) => void;
};

export function JournalList({ days = 60, onSelect }: Props) {
  useJournal(); // subscribe

  const items = journal.listRecent(days); // newest first already

  return (
    <div style={{border:"1px solid #eee", borderRadius:12, background:"#fff", padding:10, display:"grid", gap:6}}>
      {items.length === 0 && <div style={{opacity:.6, textAlign:"center"}}>No entries</div>}
      {items.map(e => {
        const title = new Intl.DateTimeFormat(undefined, {
          weekday: "short", month: "short", day: "2-digit", year: "numeric"
        }).format(e.day);
        const preview = e.text.split(/\r?\n/)[0]?.slice(0,80) || "";
        return (
          <button
            key={e.day}
            onClick={() => onSelect?.(e.day)}
            style={{
              textAlign:"left", border:"1px solid #ddd", background:"#fff",
              borderRadius:10, padding:"8px 10px", display:"grid", gap:2
            }}
          >
            <div style={{fontWeight:700}}>{title}</div>
            {preview && <div style={{fontSize:12, opacity:.75}}>{preview}</div>}
          </button>
        );
      })}
    </div>
  );
}

export default JournalList;

import React from "react";
import { useMode, toggleMode, type Mode } from "@/stores/modeStore";

export default function BottomBar() {
  const mode = useMode();
  const items: Exclude<Mode,"none">[] = ["tasks","projects","reminders","journal"];
  const label = (x: Exclude<Mode,"none">) => x.toUpperCase();
  return (
    <div style={{display:"flex", justifyContent:"center", padding:"12px"}}>
      <div className="bottombar" style={{background:"#000", color:"#fff", borderRadius:999, padding:"6px", display:"flex", gap:6}}>
        {items.map(x => (
          <button
            key={x}
            type="button"
            onClick={() => toggleMode(x)}
            className={`bb-item ${mode===x ? "active" : ""}`}
            style={{
              background: mode===x ? "#fff" : "#111",
              color: mode===x ? "#000" : "#fff",
              borderRadius:999, padding:"8px 12px", border:"none"
            }}
          >
            {label(x)}
          </button>
        ))}
      </div>
    </div>
  );
}

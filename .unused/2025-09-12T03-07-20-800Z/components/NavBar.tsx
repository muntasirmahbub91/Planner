import React from "react";
import type { View } from "@/stores/viewStore";

type Props = {
  value: View;
  onChange: (v: View) => void;
};

const tabs: View[] = ["day", "week", "month", "year"];

export default function NavBar({ value, onChange }: Props) {
  return (
    <div className="navbar" style={{display:"flex", justifyContent:"center", gap:12, padding:"8px 12px", borderBottom:"1px solid #ddd"}}>
      {tabs.map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`nav-tab ${t === value ? "active" : ""}`}
          style={{
            textTransform:"uppercase",
            fontSize:14,
            padding:"6px 10px",
            borderRadius:999,
            border:"1px solid transparent",
            ...(t===value ? {background:"#ffe8cc", borderColor:"#ffa94d"} : {})
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

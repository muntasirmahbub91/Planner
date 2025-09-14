import React, { useState } from "react";

export default function WeekGoalsWindow() {
  const [value, setValue] = useState("");
  return (
    <section style={{ border: "1px dashed #cdd6ff", borderRadius: 12, padding: 12, background: "#fcfcff" }}>
      <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>WEEKLY GOALS</div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="List 3–5 concrete goals for this week…"
        style={{ width: "100%", minHeight: 80, borderRadius: 10, border: "1px solid #e5e7eb", padding: 10, resize: "vertical" }}
      />
    </section>
  );
}

import React from "react";

export default function MonthView() {
  return (
    <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
      <div
        role="status"
        aria-live="polite"
        style={{
          width: "100%",
          maxWidth: 720,
          border: "1px solid #f59e0b",
          background: "#fffbeb",
          color: "#78350f",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              width: 28,
              height: 28,
              borderRadius: 9999,
              background: "#f59e0b",
              color: "white",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
          >
            ★
          </span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Month View — Pro Feature</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>
              The calendar month view is available in the <strong>Pro version</strong>. Upgrade to unlock the full
              calendar with task and reminder filters and day navigation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

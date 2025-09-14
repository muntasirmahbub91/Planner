import React from "react";

export default function Header() {
  return (
    <div className="topbar">
      <span className="logo">PLANNER</span>
      <button
        className="today-btn"
        onClick={() => {
          const event = new CustomEvent("today-click");
          window.dispatchEvent(event);
        }}
      >
        TODAY
      </button>
    </div>
  );
}

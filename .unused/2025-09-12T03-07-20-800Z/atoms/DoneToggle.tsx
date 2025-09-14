// src/atoms/DoneToggle.tsx
// Tri-state toggle for tasks: empty → ✓ (done) → ✗ (not done).
// Visual styles come from global.css (.triState, .is-yes, .is-no).
// Accessible with aria-pressed and keyboard (Enter/Space).

import React from "react";
import cx from "classnames";

export type DoneState = "empty" | "yes" | "no";

type Props = {
  value: DoneState;
  onChange: (next: DoneState) => void;
  className?: string;
  size?: number; // px, default 24
};

export default function DoneToggle({ value, onChange, className, size = 24 }: Props) {
  const nextState: DoneState =
    value === "empty" ? "yes" : value === "yes" ? "no" : "empty";

  const handleClick = () => {
    onChange(nextState);
  };

  return (
    <button
      type="button"
      className={cx("triState", className, {
        "is-yes": value === "yes",
        "is-no": value === "no"
      })}
      style={{ width: size, height: size }}
      onClick={handleClick}
      aria-pressed={value !== "empty"}
      aria-label={
        value === "yes"
          ? "Marked complete"
          : value === "no"
          ? "Marked failed"
          : "Not marked"
      }
    >
      {value === "yes" ? "✓" : value === "no" ? "✗" : ""}
    </button>
  );
}

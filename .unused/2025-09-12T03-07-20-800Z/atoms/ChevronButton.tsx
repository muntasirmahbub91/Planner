// src/atoms/ChevronButton.tsx
// Small reusable button with left/right chevron symbol.
// Used by DateStrip, carousels, or other navigators.
// Styling: global.css (.dateStrip-button can be reused, or .button variants).

import React from "react";
import cx from "classnames";

type Direction = "left" | "right";

type Props = {
  direction: Direction;
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
  size?: number; // px, default 36
};

export default function ChevronButton({
  direction,
  onClick,
  ariaLabel,
  className,
  size = 36
}: Props) {
  return (
    <button
      type="button"
      className={cx("dateStrip-button", className)}
      aria-label={ariaLabel || (direction === "left" ? "Previous" : "Next")}
      onClick={onClick}
      style={{ width: size, height: size }}
    >
      {direction === "left" ? "‹" : "›"}
    </button>
  );
}

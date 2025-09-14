// src/atoms/Badge.tsx
// Small status label. Can be used for tags, counts, or status chips.
// Styling: global.css (use .badge base + modifiers as needed).

import React from "react";
import cx from "classnames";

type Variant = "default" | "accent" | "success" | "danger" | "muted";

type Props = {
  label: string | number;
  variant?: Variant;
  className?: string;
  title?: string;
  rounded?: boolean; // pill vs square
};

export default function Badge({
  label,
  variant = "default",
  className,
  title,
  rounded = true
}: Props) {
  const classes = cx(
    "badge",
    {
      "badge--accent": variant === "accent",
      "badge--success": variant === "success",
      "badge--danger": variant === "danger",
      "badge--muted": variant === "muted",
      "badge--rounded": rounded
    },
    className
  );

  return (
    <span className={classes} title={title}>
      {label}
    </span>
  );
}

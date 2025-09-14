// src/atoms/Button.tsx
// Shared button atom using global.css skins:
// .button, .button--ghost, .button--accent, .button--success, .button--danger
// sizes: .button--sm, .button--lg

import React from "react";
import cx from "classnames";

type Variant = "default" | "ghost" | "accent" | "success" | "danger";
type Size = "sm" | "md" | "lg";

type Props = {
  label?: string;                 // optional text label
  title?: string;                 // tooltip
  variant?: Variant;              // visual style
  size?: Size;                    // sm | md | lg
  className?: string;             // extra classes
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;     // overrides label if provided
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;             // if rendering icon-only buttons
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function Button({
  label,
  title,
  variant = "default",
  size = "md",
  className,
  disabled,
  onClick,
  children,
  type = "button",
  ariaLabel,
  leftIcon,
  rightIcon
}: Props) {
  const classes = cx(
    "button",
    {
      "button--ghost": variant === "ghost",
      "button--accent": variant === "accent",
      "button--success": variant === "success",
      "button--danger": variant === "danger",
      "button--sm": size === "sm",
      "button--lg": size === "lg"
    },
    className
  );

  const content = children ?? label;

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel || (typeof content === "string" ? content : undefined)}
    >
      {leftIcon ? <span aria-hidden="true">{leftIcon}</span> : null}
      {content}
      {rightIcon ? <span aria-hidden="true">{rightIcon}</span> : null}
    </button>
  );
}

export default Button;

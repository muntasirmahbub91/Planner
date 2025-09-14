import React from "react";
import "./AddButton.css";

type Props = {
  ariaLabel?: string;
  title?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
};

export default function AddButton({
  ariaLabel = "Add",
  title,
  onClick,
  className = "",
  disabled = false,
  size = "sm",
}: Props) {
  const sz = size === "lg" ? "AddButton--lg" : size === "md" ? "AddButton--md" : "AddButton--sm";
  return (
    <button
      type="button"
      className={`AddButton ${sz} ${className}`.trim()}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="AddButton__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </span>
    </button>
  );
}

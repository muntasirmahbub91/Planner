import React from "react";
import "./ToggleButton.css";

type Props = {
  ariaLabel: string;
  value: boolean;
  disabled?: boolean;
  className?: string;
  onChange: (next?: boolean) => void;
  sizePx?: number; // optional
};

export default function ToggleButton({
  ariaLabel,
  value,
  disabled,
  className,
  onChange,
  sizePx,
}: Props) {
  const style = sizePx ? ({ ["--tgl-size" as any]: `${sizePx}px` } as React.CSSProperties) : undefined;
  return (
    <span className="ui-ToggleButton__hit" style={style}>
      <button
        type="button"
        className={`ui-ToggleButton ${value ? "is-on" : "is-off"} ${className ?? ""}`}
        aria-pressed={value}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => onChange(!value)}
      >
        <svg className="ui-ToggleButton__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5l4 4L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </span>
  );
}

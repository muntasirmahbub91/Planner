import { useState } from "react";
import "./ToggleButton.css";

type ToggleButtonProps = {
  value?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  sizePx?: number;      // visual circle size; hit target stays >= 44
  hitSizePx?: number;   // optional explicit hit size
};

export default function ToggleButton({
  value,
  onChange,
  disabled,
  className = "",
  sizePx,
  hitSizePx,
}: ToggleButtonProps) {
  const [internal, setInternal] = useState(false);
  const on = value ?? internal;

  const toggle = () => {
    if (disabled) return;
    const next = !on;
    onChange?.(next);
    if (value === undefined) setInternal(next);
  };

  const style =
    sizePx || hitSizePx
      ? ({
          ["--tgl-size" as any]: sizePx ? `${sizePx}px` : undefined,
          ["--tgl-hit" as any]: hitSizePx ? `${hitSizePx}px` : undefined,
        } as React.CSSProperties)
      : undefined;

  return (
    <span className="ui-ToggleButton__hit" style={style}>
      <button
        type="button"
        className={`ui-ToggleButton ${on ? "is-on" : ""} ${className}`}
        role="switch"
        aria-checked={on}
        aria-label={on ? "On" : "Off"}
        onClick={toggle}
        disabled={disabled}
      >
        <svg className="ui-ToggleButton__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 12.5l4 4 8-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sr-only">{on ? "On" : "Off"}</span>
      </button>
    </span>
  );
}

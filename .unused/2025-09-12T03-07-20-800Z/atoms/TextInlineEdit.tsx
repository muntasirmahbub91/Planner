// src/atoms/TextInlineEdit.tsx
// Inline editable text field. Renders static <span> until clicked,
// then turns into <input>. Blur/Enter commits, Escape cancels.
// Styling: global.css (.input, .textInline, .textInline.is-editing)

import React, { useState, useRef, useEffect } from "react";
import cx from "classnames";

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  maxLength?: number;
};

export default function TextInlineEdit({
  value,
  onChange,
  placeholder = "Click to edit",
  className,
  autoFocus = false,
  maxLength
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // When switching to editing, focus the input
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Keep draft in sync if external value changes
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== value) onChange(trimmed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <span
      className={cx("textInline", className, { "is-editing": editing })}
      onClick={() => setEditing(true)}
    >
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          className="input"
          value={draft}
          maxLength={maxLength}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
        />
      ) : (
        <span className="textInline-display">
          {value || <span className="textInline-placeholder">{placeholder}</span>}
        </span>
      )}
    </span>
  );
}

// compat named export for modules importing {TextInlineEdit}

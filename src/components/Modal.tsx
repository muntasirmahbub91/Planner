import React, { useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ open, title, onClose, children }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement as HTMLElement;

    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // focus dialog
    setTimeout(() => cardRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lastActiveRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="modalCard"
        role="dialog"
        aria-modal="true"
        {...(title ? { "aria-labelledby": titleId } : { "aria-label": "Dialog" })}
        onClick={(e) => e.stopPropagation()}
        ref={cardRef}
        tabIndex={-1}
      >
        {title ? <h2 id={titleId} className="modalTitle">{title}</h2> : null}
        <div className="modalBody">{children}</div>
        <button className="modalClose" onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>,
    document.body
  );
}

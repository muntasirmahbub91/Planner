// src/components/Modal.tsx
import React, { useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const sel = [
    "[autofocus]",
    "input:not([disabled])",
    "textarea:not([disabled])",
    "select:not([disabled])",
    "button:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
    "a[href]",
  ].join(",");
  return Array.from(root.querySelectorAll<HTMLElement>(sel)).filter((el) => !el.hasAttribute("inert") && !el.getAttribute("aria-hidden"));
}

export default function Modal({ open, title, onClose, children }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Focus, ESC, scroll lock, and focus trap
  useEffect(() => {
    if (!open) return;

    lastActiveRef.current = document.activeElement as HTMLElement;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus first focusable element once on open
    const focusFirst = () => {
      const card = cardRef.current;
      const first = getFocusable(card)[0] ?? card;
      first?.focus?.({ preventScroll: true } as any);
    };
    // Next frame to ensure children mounted
    const raf = requestAnimationFrame(focusFirst);

    // Trap Tab within modal + handle Escape
    const onKeyDownCapture = (e: KeyboardEvent) => {
      if (!cardRef.current) return;

      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const items = getFocusable(cardRef.current);
      if (items.length === 0) {
        // keep focus on card
        cardRef.current.focus({ preventScroll: true } as any);
        e.preventDefault();
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      const idx = Math.max(0, items.indexOf(active || items[0]));
      const next = e.shiftKey ? (idx - 1 + items.length) % items.length : (idx + 1) % items.length;
      items[next].focus({ preventScroll: true } as any);
      e.preventDefault();
    };

    document.addEventListener("keydown", onKeyDownCapture, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDownCapture, true);
      document.body.style.overflow = prevOverflow;
      lastActiveRef.current?.focus?.({ preventScroll: true } as any);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modalOverlay"
      ref={overlayRef}
      onMouseDown={(e) => {
        // close only when clicking the overlay, not inside the card
        if (e.target === overlayRef.current) onClose();
      }}
      // Block background handlers from reacting to modal interactions
      onKeyDownCapture={(e) => {
        if ((e as any).key !== "Escape") e.stopPropagation();
      }}
      onPointerDownCapture={(e) => e.stopPropagation()}
    >
      <div
        className="modalCard"
        role="dialog"
        aria-modal="true"
        {...(title ? { "aria-labelledby": titleId } : { "aria-label": "Dialog" })}
        ref={cardRef}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title ? <h2 id={titleId} className="modalTitle">{title}</h2> : null}
        <div className="modalBody">{children}</div>
        <button className="modalClose" onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>,
    document.body
  );
}

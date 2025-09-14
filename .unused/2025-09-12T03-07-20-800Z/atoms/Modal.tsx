// src/atoms/Modal.tsx
// Lightweight modal with portal, focus management, ESC/backdrop close.
// Styling hooks: .modal-backdrop, .modal, .modal-header, .modal-title,
// .modal-body, .modal-footer. Uses tokens from global.css (cards/buttons).

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import cx from "classnames";
import { Button } from "./Button";

type Props = {
  open: boolean;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;              // custom actions; if undefined, renders default Close
  onClose: () => void;
  closeOnBackdrop?: boolean;             // default true
  closeOnEsc?: boolean;                  // default true
  className?: string;                    // extra classes on dialog
  ariaLabel?: string;                    // if no title, provide accessible label
  width?: number | string;               // e.g., 520 or "40rem"
};

export default function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  closeOnBackdrop = true,
  closeOnEsc = true,
  className,
  ariaLabel,
  width = 520
}: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Lock body scroll and manage focus
  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    const { style } = document.body;
    const prevOverflow = style.overflow;
    style.overflow = "hidden";

    // Focus the first focusable element in dialog
    const toFocus =
      dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) || dialogRef.current;
    toFocus?.focus();

    return () => {
      style.overflow = prevOverflow;
      prevFocusRef.current?.focus?.();
    };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      // Simple focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled"));
        if (!focusables.length) {
          e.preventDefault();
          (dialogRef.current as HTMLElement).focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement;
        const forward = !e.shiftKey;
        if (forward && active === last) {
          e.preventDefault();
          first.focus();
        } else if (!forward && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  const dialogStyles: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    maxWidth: "90vw"
  };

  return createPortal(
    <div
      ref={backdropRef}
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (!closeOnBackdrop) return;
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={cx("modal card", className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-label={!title ? ariaLabel : undefined}
        tabIndex={-1}
        style={dialogStyles}
        onMouseDown={(e) => {
          // Prevent backdrop handler when clicking inside
          e.stopPropagation();
        }}
      >
        {(title || onClose) && (
          <div className="modal-header">
            {title ? (
              <h2 id="modal-title" className="modal-title">
                {title}
              </h2>
            ) : (
              <span />
            )}
            <Button
              ariaLabel="Close"
              title="Close"
              variant="ghost"
              size="sm"
              onClick={onClose}
              label="✕"
            />
          </div>
        )}

        <div className="modal-body">{children}</div>

        <div className="modal-footer">
          {footer ?? (
            <Button label="Close" variant="ghost" onClick={onClose} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// compat named export for modules importing {Modal}

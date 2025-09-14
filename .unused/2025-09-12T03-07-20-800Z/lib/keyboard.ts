// src/lib/keyboard.ts
// Centralized keyboard shortcuts for undo/redo.

import * as undo from "@/lib/undo";

/**
 * Install global keyboard handler.
 * - Ctrl/Cmd+Z → undo()
 * - Ctrl/Cmd+Shift+Z → redo()
 */
export function installUndoHotkeys() {
  function onKey(e: KeyboardEvent) {
    const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
    const mod = isMac ? e.metaKey : e.ctrlKey;
    const key = e.key.toLowerCase();

    if (mod && key === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        undo.redo();
      } else {
        undo.undo();
      }
    }
  }

  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}

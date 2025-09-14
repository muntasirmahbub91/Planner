// src/components/UndoToast.tsx
// Shows last action label with Undo/Redo. Auto-dismiss on ttl expiry.

import React, { useEffect, useState } from "react";
import * as undo from "@/lib/undo";

export default function UndoToast() {
  const [label, setLabel] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    function tick() {
      if (!undo.canUndo() && !undo.canRedo()) {
        setLabel(null);
        setExpiresAt(null);
        return;
      }
      // Show generic label (last record). In real app, label could come from undo slot metadata.
      setLabel("Last action");
      setExpiresAt(Date.now() + 15_000);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setLabel(null);
        setExpiresAt(null);
      }, 15_000);
    }

    // For demo, poll every second
    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!label) return null;

  return (
    <div className="undoToast" role="status">
      <span className="msg">{label}</span>
      <div className="actions">
        <button onClick={() => undo.undo()}>Undo</button>
        <button onClick={() => undo.redo()}>Redo</button>
      </div>
    </div>
  );
}

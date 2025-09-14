// src/hooks/useMinuteTick.ts
// Window-scoped minute tick. Guards with page visibility.

import { useEffect } from "react";

/**
 * Calls cb every minute while page is visible.
 */
export function useMinuteTick(cb: () => void) {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    function tick() {
      if (document.visibilityState === "visible") {
        try { cb(); } catch (e) { console.error("useMinuteTick callback error", e); }
      }
    }

    // Align to minute boundary
    const now = Date.now();
    const delay = 60_000 - (now % 60_000);
    const start = setTimeout(() => {
      tick();
      timer = setInterval(tick, 60_000);
    }, delay);

    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, [cb]);
}

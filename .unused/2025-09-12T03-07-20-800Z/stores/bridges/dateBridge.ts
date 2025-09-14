import * as mod from "@/stores/dateStore";

export function useSetDate(): (iso: string) => void {
  try {
    const hook: any = (mod as any).useDateStore || (mod as any).default || (mod as any).dateStore || (mod as any).store;
    if (hook?.getState) {
      const st = hook.getState();
      const fn =
        st?.setDate ??
        st?.setSelectedDate ??
        st?.setDay ??
        st?.set;
      if (typeof fn === "function") {
        return (iso: string) => fn(iso);
      }
    }
    if (typeof (mod as any).setDate === "function") {
      return (iso: string) => (mod as any).setDate(iso);
    }
  } catch {}
  // Fallback: persist selection for DayView to read
  return (iso: string) => {
    try { localStorage.setItem("selectedDate", iso); } catch {}
  };
}

// src/sections/RemindersWindow.tsx
import React, { useMemo } from "react";
import { useDateStore } from "@/stores/dateStore";
import { useReminders, listAll, toggleDone, remove } from "@/stores/remindersStore";
import ToggleButton from "@/components/ToggleButton";

/* Helpers */
const DAY = 24 * 60 * 60 * 1000;
function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function Row({
  id,
  title,
  when,
  done,
}: {
  id: string;
  title: string;
  when: number;
  done: boolean;
}) {
  const onToggle = (next: boolean) => {
    try {
      // prefer signature (id, next)
      // @ts-ignore
      toggleDone(id, next);
    } catch {
      // fallback to toggle signature (id)
      // @ts-ignore
      toggleDone(id);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 8, alignItems: "center" }}>
      <ToggleButton value={done} onChange={onToggle} />
      <div>
        <div style={{ fontWeight: 600, textDecoration: done ? "line-through" : "none" }}>{title}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {new Date(when).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
        </div>
      </div>
      <button
        onClick={() => remove(id)}
        style={{ border: "1px solid #ddd", background: "#fff", borderRadius: 8, padding: "4px 8px" }}
      >
        Delete
      </button>
    </div>
  );
}

export default function RemindersWindow() {
  // subscribe so UI updates when store changes
  useReminders();

  // anchor day from date store
  const ds: any = useDateStore();
  const anchorMs = typeof ds === "number" ? ds : ds && typeof ds.getMs === "function" ? ds.getMs() : Date.now();
  const dayStart = startOfDay(anchorMs);
  const dayEnd = dayStart + DAY;

  // filter only reminders for this day
  const items = useMemo(() => {
    const all = listAll();
    return all
      .filter((r: any) => {
        const when = r.when ?? r.whenMs ?? r.at ?? r.atMs ?? r.time ?? r.timeMs ?? 0;
        return when >= dayStart && when < dayEnd;
      })
      .slice()
      .sort((a: any, b: any) => {
        const aw = a.when ?? a.whenMs ?? a.at ?? a.atMs ?? a.time ?? a.timeMs ?? 0;
        const bw = b.when ?? b.whenMs ?? b.at ?? b.atMs ?? b.time ?? b.timeMs ?? 0;
        return aw - bw;
      });
  }, [dayStart, dayEnd]);

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0 8px" }}>
        <h3 style={{ margin: 0 }}>Reminders</h3>
        {/* Add button removed by request */}
      </div>

      <div style={{ border: "1px solid #e5e5e5", borderRadius: 16, padding: 12, background: "#fff", display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 8 }}>
          {items.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No reminders for this day</div>
          ) : (
            items.map((r: any) => (
              <Row
                key={r.id ?? String(r.when ?? r.whenMs ?? r.at ?? r.atMs ?? r.time ?? r.timeMs ?? Math.random())}
                id={r.id ?? String(r.when ?? r.whenMs ?? r.at ?? r.atMs ?? r.time ?? r.timeMs)}
                title={r.title ?? r.text ?? ""}
                when={r.when ?? r.whenMs ?? r.at ?? r.atMs ?? r.time ?? r.timeMs ?? 0}
                done={Boolean(r.done ?? r.completed ?? r.isDone ?? false)}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

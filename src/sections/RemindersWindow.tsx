// src/sections/RemindersWindow.tsx
import React, { useMemo } from "react";
import { useReminders, type Reminder } from "@/stores/remindersStore";
import { useDateStore, dayMs, DAY_MS } from "@/stores/dateStore";

/* helpers */
const baseTime = (r: Reminder) => r.snoozeMs ?? r.atMs;
const spanMs = (r: Reminder) => Math.max(1, r.windowDays ?? 7) * DAY_MS;

// Visible only if the SELECTED DAY lies within [base - span, base + span]
const isVisibleOn = (r: Reminder, refEndOfDayMs: number) => {
  const b = baseTime(r);
  const s = spanMs(r);
  return refEndOfDayMs >= b - s && refEndOfDayMs <= b + s;
};

type Props = { hideOverdue?: boolean };

export default function RemindersWindow({ hideOverdue }: Props) {
  // Selected day frame and reference (end of selected day)
  const selected = useDateStore((s) => s.selected);
  const startMs = dayMs(selected);
  const endMs = startMs + DAY_MS;
  const refMs = endMs - 1;

  // Data
  const byId = useReminders((s) => s.byId);
  const order = useReminders((s) => s.order);

  // Filter by per-reminder window around its own time, relative to the selected day
  const visible = useMemo(() => {
    const arr = order.map((id) => byId[id]).filter(Boolean) as Reminder[];
    return arr.filter((r) => isVisibleOn(r, refMs));
  }, [order, byId, refMs]);

  const sortByTime = (a: Reminder, b: Reminder) => baseTime(a) - baseTime(b);

  const todays = useMemo(
    () => visible.filter((r) => { const t = baseTime(r); return t >= startMs && t < endMs; }).sort(sortByTime),
    [visible, startMs, endMs]
  );
  const overdue = useMemo(
    () => visible.filter((r) => !r.done && baseTime(r) < startMs).sort(sortByTime),
    [visible, startMs]
  );
  const upcoming = useMemo(
    () => visible.filter((r) => baseTime(r) >= endMs).sort(sortByTime),
    [visible, endMs]
  );

  return (
    <section aria-label="Reminders" style={{ display: "grid", gap: 12 }}>
      <h3 style={{ margin: "32px 0 0", fontWeight: 800 }}>REMINDERS</h3>

      {!hideOverdue && overdue.length > 0 && (
        <Block title="Overdue">
          <List items={overdue} />
        </Block>
      )}

      <Block title="Today">
        {todays.length === 0 ? <Empty text="No reminders" /> : <List items={todays} />}
      </Block>

      {upcoming.length > 0 && (
        <Block title="Upcoming">
          <List items={upcoming} />
        </Block>
      )}
    </section>
  );
}

/* minimal subcomponents */
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>{title}</div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ opacity: 0.6 }}>{text}</div>;
}

function List({ items }: { items: Reminder[] }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((r) => {
        const dt = new Date(baseTime(r));
        const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" }).format(dt);
        const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(dt);
        return (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 8,
              padding: 8,
              border: "1px solid #eee",
              borderRadius: 12,
              background: "#fff",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  textDecoration: r.done ? "line-through" : "none",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.title || "(untitled)"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {date} · {time}
              </div>
            </div>
            {/* read-only; no controls */}
          </div>
        );
      })}
    </div>
  );
}

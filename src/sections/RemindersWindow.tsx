import React, { useMemo, useCallback } from "react";
import { useDateStore, dayMs, DAY_MS } from "@/stores/dateStore";
import { useReminders, listAll, toggleDone, remove as removeReminder } from "@/stores/remindersStore";
import ToggleButton from "@/components/ToggleButton";

type Reminder = {
  id: string;
  title: string;
  when: number; // ms since epoch
  done?: boolean;
  note?: string;
};

function formatTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function RemindersWindow({ hideOverdue = false }: { hideOverdue?: boolean }) {
  // subscribe
  const tick = useReminders();

  // selected civil day
  const selectedEday = useDateStore((s) => s.selected);
  const selectedStart = dayMs(selectedEday);
  const selectedEnd = selectedStart + DAY_MS;

  // derive
  const { today, overdue } = useMemo(() => {
    const all = listAll() as Reminder[];
    const overdue = all.filter((r) => !r.done && r.when < selectedStart).sort((a, b) => a.when - b.when);
    const today = all
      .filter((r) => r.when >= selectedStart && r.when < selectedEnd)
      .sort((a, b) => a.when - b.when);
    return { today, overdue };
  }, [tick, selectedStart, selectedEnd]);

  const onToggle = useCallback((id: string, next: boolean) => {
    try {
      // @ts-ignore tolerate both signatures
      toggleDone(id, next);
    } catch {
      // @ts-ignore legacy signature
      toggleDone(id);
    }
  }, []);

  const onRemove = useCallback((id: string) => removeReminder(id), []);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      <header style={{ padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ fontWeight: 800, letterSpacing: ".06em" }}>REMINDERS</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          {new Date(selectedStart).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </div>
      </header>

      {!hideOverdue && (
        <section style={{ padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Overdue</div>
          {overdue.length === 0 ? (
            <div style={{ fontSize: 13, color: "#94a3b8" }}>Nothing overdue.</div>
          ) : (
            <div>
              {overdue.map((r) => (
                <Row key={r.id} r={r} onToggle={onToggle} onRemove={onRemove} />
              ))}
            </div>
          )}
        </section>
      )}

      {!hideOverdue && <hr style={{ margin: 0, border: 0, borderTop: "1px solid #e5e7eb" }} />}

      <section style={{ padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>Today</div>
        {today.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94a3b8" }}>No reminders today.</div>
        ) : (
          <div>
            {today.map((r) => (
              <Row key={r.id} r={r} onToggle={onToggle} onRemove={onRemove} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ r, onToggle, onRemove }: { r: Reminder; onToggle: (id: string, next: boolean) => void; onRemove: (id: string) => void }) {
  const done = !!r.done;
  return (
    <div
      role="listitem"
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr auto auto",
        gap: 8,
        alignItems: "center",
        padding: "6px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <ToggleButton checked={done} onChange={(next) => onToggle(r.id, next)} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, textDecoration: done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.title}
        </div>
        {r.note ? <div style={{ fontSize: 12, color: "#64748b" }}>{r.note}</div> : null}
      </div>
      <div style={{ fontVariantNumeric: "tabular-nums", color: "#334155" }}>{formatTime(r.when)}</div>
      <button
        onClick={() => onRemove(r.id)}
        style={{ border: 0, background: "transparent", color: "#dc2626", cursor: "pointer", padding: 4 }}
        aria-label="Delete reminder"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}

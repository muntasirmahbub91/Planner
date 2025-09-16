// src/sections/RemindersWindow.tsx
import React, { useMemo, memo, useCallback } from "react";
import { useDateStore } from "@/stores/dateStore";
import { useReminders } from "@/stores/remindersStore";
import ToggleButton from "@/components/ToggleButton";

/* --- Time helpers --- */
const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const getWhen = (r: any): number =>
  r.when ?? r.whenMs ?? r.at ?? r.atMs ?? r.time ?? r.timeMs ?? 0;
const getId = (r: any): string => r.id ?? String(getWhen(r));
const getTitle = (r: any): string => r.title ?? r.text ?? "" as string;
const getDone = (r: any): boolean =>
  Boolean(r.done ?? r.completed ?? r.isDone ?? false);

/* --- Row --- */
type RowProps = {
  id: string;
  title: string;
  when: number;
  done: boolean;
  onToggle: (id: string, next: boolean) => void;
  onDelete: (id: string) => void;
};

const Row = memo(function Row({
  id,
  title,
  when,
  done,
  onToggle,
  onDelete,
}: RowProps) {
  const onChange = useCallback((next: boolean) => onToggle(id, next), [id, onToggle]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "36px 1fr auto",
        gap: 8,
        alignItems: "center",
      }}
    >
      <ToggleButton value={done} onChange={onChange} />
      <div>
        <div
          style={{
            fontWeight: 600,
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          {new Date(when).toLocaleDateString(undefined, {
            month: "short",
            day: "2-digit",
          })}
        </div>
      </div>
      <button
        onClick={() => onDelete(id)}
        style={{
          border: "1px solid #ddd",
          background: "#fff",
          borderRadius: 8,
          padding: "4px 8px",
          cursor: "pointer",
        }}
      >
        Delete
      </button>
    </div>
  );
});

/* --- Main --- */
export default function RemindersWindow() {
  // Selected day anchor
  const selectedMs = useDateStore((s: any) => s.selected ?? s.now ?? Date.now());
  const dayStart = startOfDay(selectedMs);
  const dayEnd = dayStart + DAY;

  // Subscribe once to the store. Prefer items + actions from the hook.
  const { items, listAll, toggleDone, remove } = useReminders((s: any) => ({
    items: s.items,               // if your store exposes items
    listAll: s.listAll,           // if your store exposes a getter
    toggleDone: s.toggleDone,
    remove: s.remove,
  }));

  // Source of truth: use listAll() if present, else items array.
  const all: any[] = useMemo(() => {
    try {
      return typeof listAll === "function" ? listAll() ?? [] : items ?? [];
    } catch {
      return items ?? [];
    }
  }, [items, listAll]);

  // Stable action wrappers. Accept both signatures: (id,next) and (id).
  const handleToggle = useCallback(
    (id: string, next: boolean) => {
      try {
        toggleDone(id, next);
      } catch {
        toggleDone(id);
      }
    },
    [toggleDone]
  );

  const handleDelete = useCallback((id: string) => remove(id), [remove]);

  // Filter and sort by the selected day
  const dayItems = useMemo(() => {
    return all
      .filter((r) => {
        const w = getWhen(r);
        return w >= dayStart && w < dayEnd;
      })
      .slice()
      .sort((a, b) => getWhen(a) - getWhen(b));
  }, [all, dayStart, dayEnd]);

  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "12px 0 8px",
        }}
      >
        <h3 style={{ margin: 0 }}>Reminders</h3>
      </div>

      <div
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 16,
          padding: 12,
          background: "#fff",
          display: "grid",
          gap: 12,
        }}
      >
        {dayItems.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No reminders for this day</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {dayItems.map((r) => {
              const id = getId(r);
              const when = getWhen(r);
              return (
                <Row
                  key={id}
                  id={id}
                  title={getTitle(r)}
                  when={when}
                  done={getDone(r)}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

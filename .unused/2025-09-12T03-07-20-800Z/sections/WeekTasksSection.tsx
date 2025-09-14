// src/sections/WeekTasksSection.tsx
import React, { useMemo } from "react";
import { useDateStore } from "@/stores/dateStore";
import { tasksOnDay } from "@/stores/tasksStore";

type WeekStart = "mon" | "sun";

function startOfWeekMs(anchorMs: number, weekStart: WeekStart = "mon"): number {
  const d = new Date(anchorMs);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun..6=Sat
  const shift = weekStart === "mon" ? (dow === 0 ? -6 : 1 - dow) : -dow;
  d.setDate(d.getDate() + shift);
  return d.getTime();
}

function addDays(ms: number, n: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatHeading(ms: number): { weekday: string; pretty: string } {
  const d = new Date(ms);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "long" }),
    pretty: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
  };
}

export default function WeekTasksSection({ weekStart = "mon" as WeekStart }: { weekStart?: WeekStart }) {
  const { getMs } = useDateStore();
  const anchorMs = getMs ? getMs() : Date.now();

  const days = useMemo(() => {
    const start = startOfWeekMs(anchorMs, weekStart);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchorMs, weekStart]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {days.map((ms) => {
        const { weekday, pretty } = formatHeading(ms);
        // Be permissive about task shape to avoid tight coupling.
        const items =
          ((typeof tasksOnDay === "function" ? tasksOnDay(ms) : []) as Array<{
            id: string;
            text?: string;
            title?: string;
            completedAt?: number;
            done?: boolean;
          }>) || [];

        return (
          <div key={ms} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                borderBottom: "1px solid #f1f1f1",
                paddingBottom: 6,
                marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <strong style={{ fontSize: 16 }}>{weekday}</strong>
                <span style={{ fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: ".03em" }}>
                  {pretty}
                </span>
              </div>
              <span style={{ fontSize: 12, color: "#888" }}>{items.length} tasks</span>
            </div>

            {items.length === 0 ? (
              <div style={{ fontSize: 13, color: "#888" }}>No tasks scheduled.</div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((t) => {
                  const label = t.text ?? t.title ?? "";
                  const done = typeof t.done === "boolean" ? t.done : Boolean(t.completedAt);
                  return (
                    <li
                      key={t.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        border: "1px solid #f2f2f2",
                        borderRadius: 10,
                        background: done ? "#fafafa" : "#fff",
                        opacity: done ? 0.7 : 1,
                      }}
                    >
                      <input type="checkbox" checked={done} readOnly />
                      <span style={{ textDecoration: done ? "line-through" : "none" }}>{label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

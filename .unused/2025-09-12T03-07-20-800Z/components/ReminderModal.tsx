// src/components/ReminderModal.tsx
import React, { useMemo, useState } from "react";
import styles from "./ReminderModal.module.css";

import Modal from "@/atoms/Modal";
import { Button } from "@/atoms/Button";

type Alerts = { daysBefore: number; count: number };

interface ReminderModalProps {
  open: boolean;
  mode: "add" | "edit";
  initial: {
    title: string;
    when: number; // ms since epoch (local time basis)
    alerts?: Alerts | null;
  };
  onCancel: () => void;
  onSubmit: (payload: { title: string; when: number; alerts?: Alerts | null }) => void;
}

/**
 * ReminderModal
 * Fields:
 *  - Title (text)
 *  - Date/Time (datetime-local)
 *  - Alerts: daysBefore, count (non-negative)
 * No recurrence.
 */
export const ReminderModal: React.FC<ReminderModalProps> = ({
  open,
  mode,
  initial,
  onCancel,
  onSubmit,
}) => {
  const [title, setTitle] = useState(initial.title ?? "");
  const [dt, setDt] = useState(() => toLocalDatetimeLocal(initial.when));
  const [daysBefore, setDaysBefore] = useState<number>(initial.alerts?.daysBefore ?? 0);
  const [count, setCount] = useState<number>(initial.alerts?.count ?? 0);
  const [err, setErr] = useState<string | null>(null);

  const canSave = useMemo(() => {
    if (!title.trim()) return false;
    if (!dt) return false;
    if (daysBefore < 0 || count < 0) return false;
    return true;
  }, [title, dt, daysBefore, count]);

  const submit = () => {
    if (!canSave) {
      setErr("Fill all required fields with valid values.");
      return;
    }
    const whenMs = fromLocalDatetimeLocal(dt);
    const payload = {
      title: title.trim(),
      when: whenMs,
      alerts: { daysBefore: Number(daysBefore) || 0, count: Number(count) || 0 },
    };
    onSubmit(payload);
  };

  return (
    <Modal open={open} onClose={onCancel} title={mode === "add" ? "New Reminder" : "Edit Reminder"}>
      <div className={styles.body}>
        <label className={styles.field}>
          <span className={styles.label}>Title</span>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (err) setErr(null);
            }}
            className={styles.input}
            placeholder="Reminder title"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Date &amp; time</span>
          <input
            type="datetime-local"
            value={dt}
            onChange={(e) => {
              setDt(e.target.value);
              if (err) setErr(null);
            }}
            className={styles.input}
          />
        </label>

        <div className={styles.grid2}>
          <label className={styles.field}>
            <span className={styles.label}>Alert: days before</span>
            <input
              type="number"
              min={0}
              step={1}
              value={daysBefore}
              onChange={(e) => setDaysBefore(safeInt(e.target.value, 0))}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Alert count</span>
            <input
              type="number"
              min={0}
              step={1}
              value={count}
              onChange={(e) => setCount(safeInt(e.target.value, 0))}
              className={styles.input}
            />
          </label>
        </div>

        {err && <div className={styles.error}>{err}</div>}

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!canSave} onClick={submit}>
            {mode === "add" ? "Create" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Helpers

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Convert ms → "YYYY-MM-DDTHH:MM" in local time for <input type="datetime-local"> */
function toLocalDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

/** Convert "YYYY-MM-DDTHH:MM" (local) → ms epoch */
function fromLocalDatetimeLocal(s: string): number {
  const [date, time] = s.split("T");
  const [yy, mm, dd] = date.split("-").map((x) => parseInt(x, 10));
  const [HH, MM] = time.split(":").map((x) => parseInt(x, 10));
  const d = new Date(yy, mm - 1, dd, HH, MM, 0, 0);
  return d.getTime();
}

function safeInt(v: string, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

// src/stores/reminders.ts
// One-shot (non-recurring) reminders with finite alerts.
// Each reminder can have multiple alert timestamps. When an alert fires,
// move it from alertsMs[] → firedMs[]. Reminders can be completed or archived.
//
// Data model notes
// - dueMs: canonical target time (local epoch ms)
// - alertsMs: pending alert times (ms) that can trigger notifications
// - firedMs: historical alert times already fired
// - done: user-marked completion (separate from archive)
// - archived: hidden from active views
//
// Query helpers provided:
// - listUpcoming(fromMs, toMs): pending alerts in a range
// - listDueOnDay(dateMs): reminders whose due date falls on that local day
//
// Mutations provided:
// - addReminder, renameReminder, setDue, setNotes
// - addAlert, removeAlert, acknowledgeAlert, snoozeAlert
// - markDone, markUndone, archiveReminder, unarchiveReminder, removeReminder

import { createStore } from "@/lib/store";
import { clampToLocalMidnight, shiftDays } from "@/lib/time";
import { scopedId } from "@/lib/ids";

/* --------------------------------- types -------------------------------- */

export type Reminder = {
  id: string;
  title: string;
  notes?: string;

  dueMs: number;          // canonical due timestamp
  alertsMs: number[];     // future alert timestamps
  firedMs: number[];      // past alert timestamps (history)

  done?: boolean;         // explicit completion
  archived?: boolean;     // hide from active views

  createdAt: number;
  updatedAt: number;
};

export type RemindersState = {
  items: Record<string, Reminder>;
};

const fallback: RemindersState = { items: {} };

/* --------------------------------- store -------------------------------- */

export const remindersStore = createStore<RemindersState>({
  key: "data.reminders.v1",
  version: 1,
  fallback,
  migrate: (raw: any): RemindersState => {
    if (raw && typeof raw === "object" && raw.items) return raw as RemindersState;
    return fallback;
  }
});

/* ------------------------------ internals -------------------------------- */

function sortNumsAsc(xs: number[]) {
  return [...xs].sort((a, b) => a - b);
}

function uniq(xs: number[]) {
  return Array.from(new Set(xs));
}

function get(id: string): Reminder | undefined {
  return remindersStore.get().items[id];
}

function writeMany(rs: Reminder[]) {
  const s = remindersStore.get();
  const items = { ...s.items };
  rs.forEach((r) => (items[r.id] = r));
  remindersStore.set({ items });
}

function writeOne(r: Reminder) {
  writeMany([r]);
}

/* --------------------------------- queries ------------------------------- */

/** Active, non-archived reminders. */
export function allActive(): Reminder[] {
  const s = remindersStore.get();
  return Object.values(s.items).filter((r) => !r.archived);
}

/** Reminders whose due date is on given local day. */
export function listDueOnDay(dateMs: number): Reminder[] {
  const start = clampToLocalMidnight(dateMs);
  const end = clampToLocalMidnight(shiftDays(start, 1).getTime()) - 1;
  return allActive()
    .filter((r) => r.dueMs >= start && r.dueMs <= end)
    .sort((a, b) => a.dueMs - b.dueMs || a.createdAt - b.createdAt);
}

/** Pending alerts that fall within [fromMs, toMs). */
export function listUpcoming(fromMs: number, toMs: number): Array<{
  reminder: Reminder;
  alertMs: number;
}> {
  const out: Array<{ reminder: Reminder; alertMs: number }> = [];
  allActive().forEach((r) => {
    r.alertsMs.forEach((t) => {
      if (t >= fromMs && t < toMs) out.push({ reminder: r, alertMs: t });
    });
  });
  // Soonest first
  return out.sort((a, b) => a.alertMs - b.alertMs);
}

/* --------------------------------- mutations ----------------------------- */

export function addReminder(input: {
  title: string;
  dueMs: number;
  notes?: string;
  alertsMs?: number[]; // default: single alert at dueMs
}): Reminder {
  const now = Date.now();
  const r: Reminder = {
    id: scopedId("rem"),
    title: input.title.trim(),
    notes: input.notes?.trim() || undefined,
    dueMs: input.dueMs,
    alertsMs: sortNumsAsc(uniq(input.alertsMs?.length ? input.alertsMs : [input.dueMs])),
    firedMs: [],
    createdAt: now,
    updatedAt: now
  };
  writeOne(r);
  return r;
}

export function renameReminder(id: string, title: string) {
  const cur = get(id);
  if (!cur) return;
  writeOne({ ...cur, title: title.trim(), updatedAt: Date.now() });
}

export function setNotes(id: string, notes?: string) {
  const cur = get(id);
  if (!cur) return;
  writeOne({ ...cur, notes: notes?.trim() || undefined, updatedAt: Date.now() });
}

export function setDue(id: string, dueMs: number, keepAlerts = true) {
  const cur = get(id);
  if (!cur) return;
  const nextAlerts = keepAlerts ? cur.alertsMs : [dueMs];
  writeOne({
    ...cur,
    dueMs,
    alertsMs: sortNumsAsc(uniq(nextAlerts)),
    updatedAt: Date.now()
  });
}

export function addAlert(id: string, alertMs: number) {
  const cur = get(id);
  if (!cur) return;
  writeOne({
    ...cur,
    alertsMs: sortNumsAsc(uniq([...cur.alertsMs, alertMs])),
    updatedAt: Date.now()
  });
}

export function removeAlert(id: string, alertMs: number) {
  const cur = get(id);
  if (!cur) return;
  writeOne({
    ...cur,
    alertsMs: cur.alertsMs.filter((t) => t !== alertMs),
    updatedAt: Date.now()
  });
}

/** Move one alert from alertsMs → firedMs when it triggers. */
export function acknowledgeAlert(id: string, alertMs: number) {
  const cur = get(id);
  if (!cur) return;
  if (!cur.alertsMs.includes(alertMs)) return;
  writeOne({
    ...cur,
    alertsMs: cur.alertsMs.filter((t) => t !== alertMs),
    firedMs: sortNumsAsc(uniq([...cur.firedMs, alertMs])),
    updatedAt: Date.now()
  });
}

/** Quick snooze by N minutes. Returns new alert timestamp. */
export function snoozeAlert(id: string, baseAlertMs: number, minutes: number): number | undefined {
  const cur = get(id);
  if (!cur) return;
  const next = baseAlertMs + minutes * 60_000;
  addAlert(id, next);
  return next;
}

export function markDone(id: string) {
  const cur = get(id);
  if (!cur) return;
  writeOne({ ...cur, done: true, updatedAt: Date.now() });
}

export function markUndone(id: string) {
  const cur = get(id);
  if (!cur) return;
  writeOne({ ...cur, done: false, updatedAt: Date.now() });
}

export function archiveReminder(id: string) {
  const cur = get(id);
  if (!cur) return;
  writeOne({ ...cur, archived: true, updatedAt: Date.now() });
}

export function unarchiveReminder(id: string) {
  const cur = get(id);
  if (!cur) return;
  writeOne({ ...cur, archived: false, updatedAt: Date.now() });
}

/** Hard delete. Prefer archive in UI. */
export function removeReminder(id: string) {
  const s = remindersStore.get();
  if (!s.items[id]) return;
  const items = { ...s.items };
  delete items[id];
  remindersStore.set({ items });
}


// --- compat hook: useReminders (minimal) ---
export function useReminders(): { items: Record<string, unknown> } { return { items: {} }; }


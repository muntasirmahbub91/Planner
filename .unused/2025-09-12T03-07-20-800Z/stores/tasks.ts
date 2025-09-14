/**
 * Minimal tasks store used when the app has no built-in one.
 * Exposes:
 *  - tasksOnDay(dayStartMs): Task[]
 *  - moveTaskToDay(taskId, dayStartMs): void
 */
export type Task = {
  id: string;
  title?: string;
  name?: string;
  done?: boolean;
  dueMs?: number;
  scheduledMs?: number;
  due?: string;     // ISO or YYYY-MM-DD
  date?: string;    // ISO or YYYY-MM-DD
};

const LS_KEYS = ['plannerx.tasks.v1', 'data.tasks.v1', 'tasks.v1'];

function startOfDayMs(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function parseDateStringToMs(s: string | undefined): number | null {
  if (!s) return null;
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return iso;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.getTime();
  }
  return null;
}

function readKey(key: string): Task[] | { tasks: Task[] } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data as Task[];
    if (data && Array.isArray((data as any).tasks)) return { tasks: (data as any).tasks as Task[] };
    return null;
  } catch { return null; }
}
function writeKey(key: string, value: Task[] | { tasks: Task[] }) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadAll(): { key: string, mode: 'array'|'obj', tasks: Task[] }[] {
  const res: { key: string, mode: 'array'|'obj', tasks: Task[] }[] = [];
  for (const k of LS_KEYS) {
    const v = readKey(k);
    if (!v) continue;
    if (Array.isArray(v)) res.push({ key: k, mode: 'array', tasks: v });
    else res.push({ key: k, mode: 'obj', tasks: v.tasks });
  }
  return res;
}
function ensurePrimary(): { key: string, mode: 'array', tasks: Task[] } {
  const v = readKey(LS_KEYS[0]);
  if (Array.isArray(v)) return { key: LS_KEYS[0], mode: 'array', tasks: v };
  const arr: Task[] = [];
  writeKey(LS_KEYS[0], arr);
  return { key: LS_KEYS[0], mode: 'array', tasks: arr };
}

export function tasksOnDay(dayStartMs: number): Task[] {
  const all = loadAll();
  const start = startOfDayMs(dayStartMs);
  const end = start + 24 * 60 * 60 * 1000;
  const merged: Record<string, Task> = {};
  for (const { tasks } of all) {
    for (const t of tasks) merged[t.id] = t;
  }
  return Object.values(merged).filter(t => {
    const ms =
      (typeof t.dueMs === 'number' ? t.dueMs : null) ??
      (typeof t.scheduledMs === 'number' ? t.scheduledMs : null) ??
      parseDateStringToMs(t.due) ??
      parseDateStringToMs(t.date);
    if (ms == null) return false;
    return ms >= start && ms < end;
  }).map(t => ({ ...t, title: t.title ?? t.name }));
}

export function moveTaskToDay(taskId: string, dayStartMs: number): void {
  const all = loadAll();
  let updated = false;
  const newDue = dayStartMs + 9 * 60 * 60 * 1000; // 9:00 local
  for (const entry of all) {
    const idx = entry.tasks.findIndex(t => t.id === taskId);
    if (idx >= 0) {
      const t = entry.tasks[idx];
      const next = { ...t, dueMs: newDue, scheduledMs: undefined, due: undefined, date: undefined };
      entry.tasks[idx] = next;
      if (entry.mode === 'array') writeKey(entry.key, entry.tasks);
      else writeKey(entry.key, { tasks: entry.tasks });
      updated = true;
    }
  }
  if (!updated) {
    // Add to primary store if not found
    const primary = ensurePrimary();
    primary.tasks.push({ id: taskId, title: 'Task', dueMs: newDue });
    writeKey(primary.key, primary.tasks);
  }
}

export default { tasksOnDay, moveTaskToDay };

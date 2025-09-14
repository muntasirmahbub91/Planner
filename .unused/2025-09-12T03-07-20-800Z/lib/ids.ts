// src/lib/ids.ts
// ID generators for Planner domain entities (tasks, reminders, projects, etc).

/** Random base36 string. Not cryptographically secure. */
export function uid(len: number = 8): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

/** Time-based ID: encodes ms timestamp + short random. */
export function timeId(): string {
  const ms = Date.now().toString(36);
  return `${ms}-${uid(4)}`;
}

/** Scoped ID with prefix. Example: "task_x7ab9c". */
export function scopedId(prefix: string): string {
  return `${prefix}_${uid(6)}`;
}

/** General-purpose ID generator for stores. */
export function newId(prefix: string): string {
  const ms = Date.now().toString(36);
  return `${prefix}_${ms}_${uid(5)}`;
}

/** Validator: lowercase alphanumeric and dashes/underscores only. */
export function isValidId(s: string | undefined): boolean {
  if (!s) return false;
  return /^[a-z0-9_-]+$/.test(s);
}

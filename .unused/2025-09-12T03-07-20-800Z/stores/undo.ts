// src/lib/undo.ts
// Single-slot, session-only Undo/Redo with optional TTL and compound grouping.
// Generic API. Callers supply inverse (and optional redo) closures.
// Idempotent guards prevent double-apply.

export type UndoError =
  | "empty"
  | "expired"
  | "already-applied";

export type UndoResult =
  | { ok: true }
  | { ok: false; error: UndoError };

type Entry = {
  label?: string;
  at: number;
  ttlMs: number;
  // apply inverse → returns a closure that redoes the original action
  inverse: () => void | (() => void) | Promise<void | (() => void)>;
  // redo hook (optional). If absent, redo uses the function returned by inverse()
  redo?: () => void | (() => void) | Promise<void | (() => void)>;
  token: number; // idempotency token
  applied: boolean; // inverse applied?
};

const TTL_MS_DEFAULT = 15_000;

let undoSlot: Entry | null = null;
let redoSlot: Entry | null = null;
let tokenSeq = 1;

// ---------- public API ----------

/**
 * Record a single undo step.
 * Supply an inverse closure. Optionally supply a redo closure.
 * If inverse returns a function, that return will be used as the redo closure when redo is missing.
 */
export function record(args: {
  label?: string;
  inverse: Entry["inverse"];
  redo?: Entry["redo"];
  ttlMs?: number;
}): void {
  undoSlot = {
    label: args.label,
    at: Date.now(),
    ttlMs: args.ttlMs ?? TTL_MS_DEFAULT,
    inverse: args.inverse,
    redo: args.redo,
    token: tokenSeq++,
    applied: false,
  };
  // New undo invalidates redo
  redoSlot = null;
}

/** Returns true if a valid undo is available. */
export function canUndo(): boolean {
  return isValid(undoSlot) && !undoSlot!.applied;
}

/** Returns true if a valid redo is available. */
export function canRedo(): boolean {
  return isValid(redoSlot) && !redoSlot!.applied;
}

/** Apply the inverse. Populates redoSlot. */
export async function undo(): Promise<UndoResult> {
  const slot = undoSlot;
  if (!slot) return { ok: false, error: "empty" };
  if (!isWithinTtl(slot)) {
    clearUndo();
    return { ok: false, error: "expired" };
  }
  if (slot.applied) return { ok: false, error: "already-applied" };

  // Run inverse. It may return a redo closure.
  const returned = await slot.inverse();
  slot.applied = true;

  // Prime redo
  redoSlot = {
    label: slot.label,
    at: Date.now(),
    ttlMs: slot.ttlMs,
    inverse: () => { /* placeholder, set below */ },
    redo: typeof returned === "function" ? returned : slot.redo,
    token: slot.token,
    applied: false,
  };

  // Single-shot slot semantics
  undoSlot = null;
  return { ok: true };
}

/** Reapply the original action if redo is available. */
export async function redo(): Promise<UndoResult> {
  const slot = redoSlot;
  if (!slot) return { ok: false, error: "empty" };
  if (!isWithinTtl(slot)) {
    clearRedo();
    return { ok: false, error: "expired" };
  }
  if (slot.applied) return { ok: false, error: "already-applied" };
  const redoFn = slot.redo;
  if (!redoFn) {
    // no-op redo when none recorded
    clearRedo();
    return { ok: false, error: "empty" };
  }

  const returned = await redoFn();
  slot.applied = true;

  // After redo, recreate undo using the function returned by redo (symmetry)
  undoSlot = {
    label: slot.label,
    at: Date.now(),
    ttlMs: slot.ttlMs,
    inverse: typeof returned === "function" ? returned : slot.inverse, // fall back
    redo: slot.redo,
    token: slot.token,
    applied: false,
  };

  redoSlot = null;
  return { ok: true };
}

/**
 * Group multiple record() calls into a single compound entry.
 * Usage:
 *   withCompoundUndo(() => { ...multiple record(...) calls... }, { label: "Batch" })
 */
export async function withCompoundUndo(
  fn: () => void | Promise<void>,
  opts?: { label?: string; ttlMs?: number }
): Promise<void> {
  const buffer: Entry[] = [];
  const originalRecord = record;

  // Monkey-patch record to buffer entries locally
  (record as any) = (args: Parameters<typeof record>[0]) => {
    buffer.push({
      label: args.label,
      at: Date.now(),
      ttlMs: args.ttlMs ?? TTL_MS_DEFAULT,
      inverse: args.inverse,
      redo: args.redo,
      token: tokenSeq++,
      applied: false,
    });
    // Do not touch global undo/redo here
  };

  try {
    await fn();
  } finally {
    // Restore record
    (record as any) = originalRecord;
  }

  if (buffer.length === 0) return;

  // Compose inverses to run in reverse order. Each may yield its own redo.
  originalRecord({
    label: opts?.label ?? "Compound",
    ttlMs: opts?.ttlMs ?? TTL_MS_DEFAULT,
    inverse: async () => {
      const redoFns: Array<() => Promise<void> | void> = [];
      for (let i = buffer.length - 1; i >= 0; i--) {
        const returned = await buffer[i].inverse();
        if (typeof returned === "function") redoFns.push(returned as any);
        else if (buffer[i].redo) redoFns.push(buffer[i].redo as any);
      }
      // Redo runs in forward order to reapply original actions
      return async () => {
        for (let i = 0; i < buffer.length; i++) {
          const r = buffer[i].redo ?? (() => {});
          await r();
        }
      };
    },
  });
}

// ---------- helpers ----------

function isWithinTtl(slot: Entry): boolean {
  return Date.now() - slot.at <= slot.ttlMs;
}

function isValid(slot: Entry | null): slot is Entry {
  return !!slot && isWithinTtl(slot);
}

function clearUndo() { undoSlot = null; }
function clearRedo() { redoSlot = null; }

// ---------- minimal toast hook (optional) ----------
// If you show a toast, you can import canUndo/canRedo to enable buttons.
// This file intentionally does not depend on UI.

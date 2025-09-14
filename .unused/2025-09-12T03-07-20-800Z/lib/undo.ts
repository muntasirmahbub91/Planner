// src/lib/undo.ts
export type UndoError = "empty" | "expired" | "already-applied";
export type UndoResult = { ok: true } | { ok: false; error: UndoError };

type Entry = {
  label?: string;
  at: number;
  ttlMs: number;
  inverse: () => void | (() => void) | Promise<void | (() => void)>;
  redo?: () => void | (() => void) | Promise<void | (() => void)>;
  token: number;
  applied: boolean;
};

const TTL_MS_DEFAULT = 15_000;
let undoSlot: Entry | null = null;
let redoSlot: Entry | null = null;
let tokenSeq = 1;

export function record(args: { label?: string; inverse: Entry["inverse"]; redo?: Entry["redo"]; ttlMs?: number }): void {
  undoSlot = { label: args.label, at: Date.now(), ttlMs: args.ttlMs ?? TTL_MS_DEFAULT, inverse: args.inverse, redo: args.redo, token: tokenSeq++, applied: false };
  redoSlot = null;
}
export function canUndo(): boolean { return !!undoSlot && Date.now() - undoSlot.at <= undoSlot.ttlMs && !undoSlot.applied; }
export function canRedo(): boolean { return !!redoSlot && Date.now() - redoSlot.at <= redoSlot.ttlMs && !redoSlot.applied; }

export async function undo(): Promise<UndoResult> {
  const slot = undoSlot;
  if (!slot) return { ok: false, error: "empty" };
  if (Date.now() - slot.at > slot.ttlMs) { undoSlot = null; return { ok: false, error: "expired" }; }
  if (slot.applied) return { ok: false, error: "already-applied" };
  const returned = await slot.inverse();
  slot.applied = true;
  redoSlot = { label: slot.label, at: Date.now(), ttlMs: slot.ttlMs, inverse: () => {}, redo: typeof returned === "function" ? returned : slot.redo, token: slot.token, applied: false };
  undoSlot = null;
  return { ok: true };
}
export async function redo(): Promise<UndoResult> {
  const slot = redoSlot;
  if (!slot) return { ok: false, error: "empty" };
  if (Date.now() - slot.at > slot.ttlMs) { redoSlot = null; return { ok: false, error: "expired" }; }
  if (slot.applied) return { ok: false, error: "already-applied" };
  const redoFn = slot.redo; if (!redoFn) { redoSlot = null; return { ok: false, error: "empty" }; }
  const returned = await redoFn();
  slot.applied = true;
  undoSlot = { label: slot.label, at: Date.now(), ttlMs: slot.ttlMs, inverse: typeof returned === "function" ? returned : slot.inverse, redo: slot.redo, token: slot.token, applied: false };
  redoSlot = null;
  return { ok: true };
}

export async function withCompoundUndo(fn: () => void | Promise<void>, opts?: { label?: string; ttlMs?: number }): Promise<void> {
  const buffer: Entry[] = [];
  const origRecord = record as any;
  (record as any) = (args: Parameters<typeof record>[0]) => buffer.push({ label: args.label, at: Date.now(), ttlMs: args.ttlMs ?? TTL_MS_DEFAULT, inverse: args.inverse, redo: args.redo, token: tokenSeq++, applied: false });
  try { await fn(); } finally { (record as any) = origRecord; }
  if (buffer.length === 0) return;
  origRecord({
    label: opts?.label ?? "Compound",
    ttlMs: opts?.ttlMs ?? TTL_MS_DEFAULT,
    inverse: async () => {
      const redos: Array<() => Promise<void> | void> = [];
      for (let i = buffer.length - 1; i >= 0; i--) {
        const r = await buffer[i].inverse();
        if (typeof r === "function") redos.push(r as any);
        else if (buffer[i].redo) redos.push(buffer[i].redo as any);
      }
      return async () => { for (let i = 0; i < buffer.length; i++) { const r = buffer[i].redo ?? (() => {}); await r(); } };
    }
  });
}

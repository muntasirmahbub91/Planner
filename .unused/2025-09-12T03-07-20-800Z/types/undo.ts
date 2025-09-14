// src/types/undo.ts
// Shared types for undo/redo system.

export type UndoError =
  | "none"
  | "expired"
  | "empty"
  | "stale";

export type UndoResult<T = void> =
  | { ok: true; data?: T; label?: string }
  | { ok: false; error: UndoError };

export type UndoActionLabel = string;

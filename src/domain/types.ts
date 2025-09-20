// src/domain/types.ts
import { z } from "zod";

/* ===== Task =====
   - dueMs can be null/undefined if unscheduled.
   - goalId/projectId are optional associations. */
export const TaskZ = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  done: z.boolean().default(false),

  // scheduling
  dueMs: z.number().int().nullable().optional(),

  // meta
  urgent: z.boolean().optional(),
  important: z.boolean().optional(),

  // completion
  completedAt: z.number().int().optional(),

  // associations
  goalId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
});
export type Task = z.infer<typeof TaskZ>;

/* ===== Reminder =====
   - atMs is the base time.
   - snoozeMs, if present, is the active time.
   - windowDays controls how long it stays visible after (snoozeMs||atMs). */
export const ReminderZ = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),

  // scheduling
  atMs: z.number().int(),
  snoozeMs: z.number().int().optional(),

  // optional note/body
  note: z.string().max(2000).optional(),

  // state
  done: z.boolean().default(false),
  completedAt: z.number().int().optional(),

  // visibility window (per reminder)
  windowDays: z.number().int().min(1).max(365).optional(),
});
export type Reminder = z.infer<typeof ReminderZ>;

/* Optional runtime guards */
export const isTask = (v: unknown): v is Task => TaskZ.safeParse(v).success;
export const isReminder = (v: unknown): v is Reminder => ReminderZ.safeParse(v).success;

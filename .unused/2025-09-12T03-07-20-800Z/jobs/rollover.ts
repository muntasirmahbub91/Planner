// src/jobs/rollover.ts
// Minute-tick rollover. Runs once per local day change. Batches moves via tasks.rolloverMove.

import { toDayStartMs } from "@/lib/time";
import * as storage from "@/lib/storage";
import * as tasks from "@/stores/tasks";

const STORE_KEY = "sys.lastRolloverDayKey.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

function readLast(): number | null {
  try { return storage.getLastRolloverDayKey?.() ?? storage.readWithBackup<number>(STORE_KEY) ?? null; }
  catch (e) { return null; }
}
function writeLast(dayKey: number) {
  try {
    if (typeof storage.setLastRolloverDayKey === "function") storage.setLastRolloverDayKey(dayKey);
    else storage.atomicJSONWrite(STORE_KEY, dayKey);
  } catch (e) { /* noop */ }
}

/**
 * Call this every minute. If local calendar day changed since last run, perform rollover once.
 */
export function onMinuteTick(): void {
  const todayKey = toDayStartMs(Date.now());
  const last = readLast();
  if (last === todayKey) return;

  // roll exactly yesterday -> backlog
  const yesterdayKey = todayKey - DAY_MS;
  try {
    tasks.rolloverMove(yesterdayKey);
    writeLast(todayKey);
  } catch (e) {
    // leave last key unchanged so we try again; no-op
  }
}

/** For dev/testing. Forces a single rollover for the given anchor day. */
export function forceRolloverFor(anchorMs: number): void {
  const todayKey = toDayStartMs(anchorMs);
  const yesterdayKey = todayKey - DAY_MS;
  try {
    tasks.rolloverMove(yesterdayKey);
    writeLast(todayKey);
  } catch (e) { /* noop */ }
}

export function runRolloverIfNeeded(): void { onMinuteTick(); }

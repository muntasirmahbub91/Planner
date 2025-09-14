import * as storage from "@/stores/storage";

type Prefs = { dayCap: number; weekStart: 0 | 1 };
const KEY = "prefs.v1";
const defaults: Prefs = { dayCap: 3, weekStart: 0 };

let prefs: Prefs = (() => storage.readWithBackup<Prefs>(KEY) ?? defaults)();

export function getDayCap() { return prefs.dayCap; }
export function getWeekStart() { return prefs.weekStart; }

export function setDayCap(n: number) {
  prefs = { ...prefs, dayCap: Math.max(1, Math.min(9, Math.floor(n))) };
  storage.atomicJSONWrite(KEY, prefs);
}
export function setWeekStart(w: 0 | 1) {
  prefs = { ...prefs, weekStart: w };
  storage.atomicJSONWrite(KEY, prefs);
}

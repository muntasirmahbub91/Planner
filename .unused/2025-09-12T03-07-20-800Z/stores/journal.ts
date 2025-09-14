import { useSyncExternalStore } from "react";

type Entry = { day: number; text: string; updatedAt: number };
const KEY = "data.journal.v1";

function dayStart(ms: number){ const d=new Date(ms); d.setHours(0,0,0,0); return d.getTime(); }
function dayKey(ms: number){ const d=new Date(dayStart(ms)); return d.toISOString().slice(0,10); }

function load(): Record<string, Entry> {
  try { const v = localStorage.getItem(KEY); return v? JSON.parse(v) : {}; } catch { return {}; }
}
function save(map: Record<string, Entry>){
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch {}
}

let map: Record<string, Entry> = load();
const subs = new Set<() => void>();
function emit(){ save(map); subs.forEach(f=>f()); }

export function subscribe(fn: () => void){ subs.add(fn); return () => subs.delete(fn); }
export function useJournal(){ return useSyncExternalStore(subscribe, ()=>map, ()=>map); }

export function get(ms: number): string {
  const k = dayKey(ms); return map[k]?.text ?? "";
}
export function set(ms: number, text: string){
  const k = dayKey(ms);
  map[k] = { day: dayStart(ms), text, updatedAt: Date.now() };
  emit();
}
export function remove(ms: number){
  const k = dayKey(ms); if(map[k]) { delete map[k]; emit(); }
}
export function listRecent(days: number): Array<{ day: number; text: string; updatedAt: number }> {
  const arr = Object.values(map).sort((a,b)=>b.day-a.day);
  const cut = Date.now() - days*86400000;
  return arr.filter(e=>e.day>=cut);
}

export const journal = { get, set, remove, listRecent, subscribe };
export default journal;

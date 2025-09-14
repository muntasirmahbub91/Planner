import { useSyncExternalStore } from "react";

export type Reminder = {
  id: string;
  title: string;
  when: number;                 // absolute ms
  alerts?: { daysBefore: number; count: number } | null;
  done: boolean;
  createdAt: number;
  updatedAt: number;
};

const KEY = "data.reminders.v1";

function uuid(){
  try { return crypto.randomUUID(); } catch {}
  return "r_"+Math.random().toString(36).slice(2,8)+Date.now().toString(36);
}
function safeRead(): Reminder[] {
  try { const t = localStorage.getItem(KEY); if (t) return JSON.parse(t); } catch {}
  return [];
}
function safeWrite(v: Reminder[]){
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {}
}

let data: Reminder[] = safeRead();
const subs = new Set<() => void>();
function emit(){ for (const f of subs) f(); safeWrite(data); }

export function subscribe(fn: () => void){ subs.add(fn); return () => subs.delete(fn); }
export function useReminders(){ return useSyncExternalStore(subscribe, ()=>data, ()=>data); }

export function listAll(): Reminder[] { return Array.isArray(data) ? data.slice() : []; }

export function add(p: { title: string; when: number; alerts?: {daysBefore:number;count:number}|null }){
  const r: Reminder = {
    id: uuid(),
    title: p.title.trim(),
    when: p.when,
    alerts: p.alerts ?? null,
    done: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  data = [r, ...listAll()]; emit(); return r.id;
}

export function update(id: string, patch: Partial<Reminder>){
  data = listAll().map(r => r.id===id ? { ...r, ...patch, updatedAt: Date.now() } : r);
  emit();
}

export function remove(id: string){
  data = listAll().filter(r => r.id !== id);
  emit();
}

export function toggleDone(id: string){
  const r = listAll().find(x=>x.id===id); if(!r) return;
  update(id, { done: !r.done });
}

function dayStart(ms:number){ const d=new Date(ms); d.setHours(0,0,0,0); return d.getTime(); }
function inRange(ms:number, a:number, b:number){ return ms>=a && ms<b; }

export function listForDay(dayMs:number){
  const start = dayStart(dayMs), end = start + 86400000;
  return listAll().filter(r => inRange(r.when, start, end))
                  .sort((a,b)=>a.when-b.when);
}

export type RangePreset = "today"|"tomorrow"|"thisWeek"|"thisMonth"|"thisYear";

export function listByPreset(nowMs:number, preset: RangePreset){
  const d = new Date(nowMs);
  const startDay = dayStart(nowMs);
  const addDays = (n:number)=> startDay + n*86400000;

  let a = startDay, b = startDay+86400000;
  if(preset==="tomorrow"){ a = addDays(1); b = addDays(2); }
  else if(preset==="thisWeek"){
    // week = Sat..Fri per spec; start = last Saturday
    const wd = d.getDay(); // 0 Sun..6 Sat
    const offsetToSat = (wd===6)?0:(wd+1); // days since last Sat
    a = dayStart(nowMs - offsetToSat*86400000);
    b = a + 7*86400000;
  } else if(preset==="thisMonth"){
    const m0 = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    a = dayStart(m0);
    b = dayStart(new Date(d.getFullYear(), d.getMonth()+1, 1).getTime());
  } else if(preset==="thisYear"){
    const y0 = new Date(d.getFullYear(), 0, 1).getTime();
    a = dayStart(y0);
    b = dayStart(new Date(d.getFullYear()+1, 0, 1).getTime());
  }
  return listAll().filter(r => inRange(r.when, a, b))
                  .sort((a,b)=>a.when-b.when);
}

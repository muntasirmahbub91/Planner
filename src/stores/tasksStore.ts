import { useSyncExternalStore } from "react";
export type Tri = 0|1|2;
export type Task = {
  id: string; title: string; dueMs: number|null;
  urgent: boolean; important: boolean; tri: Tri; done: boolean;
  createdMs: number;
  projectId?: string | null;
  goalId?: string | null;
};
function uuid(){ try { return crypto.randomUUID(); } catch { return 't_'+Math.random().toString(36).slice(2,10)+Date.now().toString(36); } }
const KEY="data.tasks.v1";
let data: Task[] = (()=>{
  try { const v = localStorage.getItem(KEY); if(v){ const a=JSON.parse(v); return Array.isArray(a)?a:[]; } } catch {}
  return [];
})();
const subs=new Set<() => void>();
function persist(){ try{ localStorage.setItem(KEY, JSON.stringify(data)); }catch{} }
function emit(){ subs.forEach(f=>f()); persist(); }
export function subscribe(fn: () => void){ subs.add(fn); return ()=>subs.delete(fn); }
export function useTasks(){ return useSyncExternalStore(subscribe, ()=>data, ()=>data); }
export function all(): Task[]{ return Array.isArray(data)? data : []; }
export function add(p: Partial<Task> & { title: string }){
  const t: Task = {
    id: uuid(),
    title: p.title,
    dueMs: p.dueMs ?? null,
    urgent: !!p.urgent,
    important: !!p.important,
    tri: (p.tri ?? 0) as Tri,
    done: !!p.done,
    createdMs: Date.now(),
    projectId: p.projectId ?? null,
    goalId: p.goalId ?? null,
  };
  data = [t, ...all()]; emit(); return t.id;
}
export function update(id: string, patch: Partial<Task>){
  data = all().map(t => t.id===id ? { ...t, ...patch } : t); emit();
}
export function remove(id: string){
  data = all().filter(t => t.id!==id); emit();
}
export function setDateFlags(id:string, dueMs:number|null, urgent:boolean, important:boolean){
  update(id, { dueMs, urgent, important });
}
export function byGoal(goalId: string){ return all().filter(t=>t.goalId===goalId); }
export function tasksOnDay(dayMs:number){
  const d = new Date(dayMs); d.setHours(0,0,0,0);
  const start = d.getTime(), end = start + 86400000;
  return all().filter(t => t.dueMs!=null && t.dueMs>=start && t.dueMs<end)
              .sort((a,b)=> (a.createdMs-b.createdMs));
}

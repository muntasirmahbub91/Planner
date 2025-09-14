import { useSyncExternalStore } from "react";
function uuid(){ try{return crypto.randomUUID()}catch{return 'p_'+Math.random().toString(36).slice(2,10)} }
export type Project = { id:string; name:string; createdMs:number; archived:boolean; };
export type Goal = { id:string; projectId:string; title:string; createdMs:number; archived:boolean; };
const KEY="data.projects.v1";
const KEYG="data.goals.v1";
let projects: Project[] = (()=>{
  try{ const v=localStorage.getItem(KEY); return v?JSON.parse(v):[] }catch{return []}
})();
let goals: Goal[] = (()=>{
  try{ const v=localStorage.getItem(KEYG); return v?JSON.parse(v):[] }catch{return []}
})();
const subs=new Set<() => void>();
function emit(){
  subs.forEach(f=>f());
  try{ localStorage.setItem(KEY, JSON.stringify(projects)); localStorage.setItem(KEYG, JSON.stringify(goals)); }catch{}
}
export function subscribe(fn: () => void){ subs.add(fn); return ()=>subs.delete(fn); }
export function useProjects(){ return useSyncExternalStore(subscribe, ()=>projects, ()=>projects); }
export function useGoals(){ return useSyncExternalStore(subscribe, ()=>goals, ()=>goals); }

export function listProjects(){ return projects.slice(); }
export function listGoals(pid:string){ return goals.filter(g=>g.projectId===pid && !g.archived); }

export function addProject(name:string){
  const p:Project={ id:uuid(), name, createdMs:Date.now(), archived:false };
  projects=[p,...projects]; emit(); return p.id;
}
export function archiveProject(id:string, val:boolean){
  projects=projects.map(p=>p.id===id?{...p, archived:val}:p); emit();
}
export function removeProject(id:string){
  projects=projects.filter(p=>p.id!==id);
  goals=goals.filter(g=>g.projectId!==id);
  emit();
}
export function addGoal(projectId:string, title:string){
  const g:Goal={ id:uuid(), projectId, title, createdMs:Date.now(), archived:false };
  goals=[g, ...goals]; emit(); return g.id;
}
export function archiveGoal(id:string, val:boolean){
  goals=goals.map(g=>g.id===id?{...g, archived:val}:g); emit();
}
export function removeGoal(id:string){
  goals=goals.filter(g=>g.id!==id); emit();
}

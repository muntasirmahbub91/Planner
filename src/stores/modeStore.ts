import { useSyncExternalStore } from "react";
export type Mode = "none" | "tasks" | "projects" | "reminders" | "journal";
const KEY = "ui.mode.v1";
const modes: Exclude<Mode,"none">[] = ["tasks","projects","reminders","journal"];

function getLS(k:string){ try{return localStorage.getItem(k);}catch{return null;} }
function setLS(k:string,v:string){ try{localStorage.setItem(k,v);}catch{} }

let state: Mode = ((): Mode => {
  const v = (getLS(KEY) || "none") as Mode;
  return (v==="none" || modes.includes(v as any)) ? v : "none";
})();

const subs = new Set<() => void>();
function emit(){ subs.forEach(f=>f()); }

export function getMode(){ return state; }
export function setMode(m: Mode){ if(state!==m){ state=m; setLS(KEY,m); emit(); } }
export function toggleMode(m: Exclude<Mode,"none">){ setMode(state===m ? "none" : m); }
export function subscribe(fn: () => void){ subs.add(fn); return () => subs.delete(fn); }
export function useMode(){ return useSyncExternalStore(subscribe, ()=>state, ()=>state); }

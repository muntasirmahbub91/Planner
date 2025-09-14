import React from "react";
import styles from "./YearView.module.css";
import { setView, type View } from "@/stores/viewStore";
import { useDateStore, setMs as setDateMs } from "@/stores/dateStore";
import { getGoals, addGoal, removeGoal } from "@/stores/weeklyGoals";
import { getGoalState, toggleGoalState, purgeUnknown } from "@/stores/weeklyGoalStates";
import AddButton from "@/components/AddButton";
import ToggleButton from "@/components/ToggleButton";

/** ---- time helpers ---- */
const MS_DAY = 24*60*60*1000;
const MS_WEEK = 7*MS_DAY;

function startOfDay(ms:number){ const d=new Date(ms); d.setHours(0,0,0,0); return d.getTime(); }
/** Saturday-start week */
function startOfWeekSaturday(ms:number){
  const d = new Date(startOfDay(ms));
  const dow = d.getDay(); // 0..6 (Sun..Sat)
  const toSat = dow === 6 ? 0 : -((dow + 1) % 7);
  d.setDate(d.getDate() + toSat);
  return d.getTime();
}
function startOfQuarter(year:number, q:1|2|3|4){ const m=(q-1)*3; const d=new Date(year,m,1); d.setHours(0,0,0,0); return d.getTime(); }
function nextQuarterStart(year:number, q:1|2|3|4){ return q<4 ? startOfQuarter(year,(q+1) as 2|3|4) : startOfQuarter(year+1,1); }

/** Week number of the YEAR (1..53), Saturday as first day. */
function weekNumberOfYear(weekStartMs:number): number {
  const d = new Date(weekStartMs);
  const yearStart = new Date(d.getFullYear(), 0, 1); yearStart.setHours(0,0,0,0);
  return Math.floor((weekStartMs - yearStart.getTime())/MS_WEEK) + 1;
}

/** ---- In-Quarter week list: Saturday starts within [qStart, nextQStart) ---- */
function quarterWeekStarts(year:number, q:1|2|3|4): number[] {
  const qStart = startOfQuarter(year, q);
  const qEnd   = nextQuarterStart(year, q);
  let w = startOfWeekSaturday(qStart);
  if (w < qStart) w += MS_WEEK;
  const out:number[] = [];
  while (w < qEnd) { out.push(w); w += MS_WEEK; }
  return out;
}

/** ---- Weekly row with inline goals ---- */
function WeeklyRow({ weekStartMs, onOpenWeek }:{
  weekStartMs:number; onOpenWeek:(ms:number)=>void;
}){
  const [items, setItems] = React.useState<string[]>(()=>getGoals(weekStartMs));
  const [states, setStates] = React.useState<Record<string, boolean>>(()=>purgeUnknown(weekStartMs, getGoals(weekStartMs)));
  React.useEffect(()=>{ const g=getGoals(weekStartMs); setItems(g); setStates(purgeUnknown(weekStartMs, g)); },[weekStartMs]);

  const [compose, setCompose] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const code = `W${String(weekNumberOfYear(weekStartMs)).padStart(2,"0")}`;
  const sub  = new Date(weekStartMs).toLocaleDateString(undefined, { month:"short", day:"2-digit" });

  function onAdd(){
    if(!draft.trim()) return;
    const next = addGoal(weekStartMs, draft.trim());
    setItems(next); setStates(purgeUnknown(weekStartMs,next)); setDraft(""); setCompose(false);
  }
  function onRemove(text:string){
    const next = removeGoal(weekStartMs, text);
    setItems(next); setStates(purgeUnknown(weekStartMs,next));
  }
  function onToggle(text:string){
    setStates(toggleGoalState(weekStartMs, text));
  }

  return (
    <div className={styles.weekRow}>
      <button className={styles.weekBtn} onClick={()=>onOpenWeek(weekStartMs)} aria-label={`Open ${code}`}>
        <div className={styles.weekCode}>{code}</div>
        <div className={styles.weekSub}>{sub}</div>
      </button>
      <div className={styles.weekMain}>
        <div className={styles.goals}>
          {items.map(g=>(
            <div className={styles.goalItem} key={g}>
              <ToggleButton checked={!!(states[g] ?? getGoalState(weekStartMs,g))} onChange={()=>onToggle(g)} />
              <div className={styles.goalText} style={{textDecoration: (states[g] ?? getGoalState(weekStartMs,g)) ? 'line-through' : 'none'}}>{g}</div>
              <button className={styles.remove} onClick={()=>onRemove(g)} aria-label={`Remove ${g}`}>Remove</button>
            </div>
          ))}
        </div>
        <div className={styles.rowActions}>
          <AddButton aria-label="Add weekly goal" onClick={()=>setCompose(true)} disabled={items.length>=3} />
          {compose && items.length<3 && (
            <>
              <input
                className={styles.input}
                placeholder="Add a weekly goal…"
                value={draft}
                onChange={e=>setDraft(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'){ onAdd(); } if(e.key==='Escape'){ setCompose(false); setDraft(''); } }}
                maxLength={160}
                autoFocus
              />
              <AddButton aria-label="Confirm weekly goal" onClick={onAdd} disabled={!draft.trim()} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** ---- Quarter section (collapsible) ---- */
function QuarterSection({
  label, year, q, isOpen, onToggle, onOpenWeek
}:{
  label:"Q1"|"Q2"|"Q3"|"Q4";
  year:number; q:1|2|3|4;
  isOpen:boolean; onToggle:()=>void;
  onOpenWeek:(ms:number)=>void;
}){
  const weeks = quarterWeekStarts(year, q);
  const monthsLabel = q===1?"JAN–MAR":q===2?"APR–JUN":q===3?"JUL–SEP":"OCT–DEC";

  return (
    <section className={`${styles.quarter} ${!isOpen ? styles.collapsed : ""}`}>
      <div className={styles.header} onClick={onToggle} role="button" aria-expanded={isOpen} aria-label={`Toggle ${label}`}>
        <div className={styles.hLeft}>
          <div className={styles.qLabel}>{label}</div>
          <div className={styles.qMonths}>{monthsLabel}</div>
        </div>
        <div className={styles.hRight}>
          <div>Up to 3 goals / week</div>
          <div className={styles.chevQ}>{isOpen ? "▾" : "▸"}</div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.weeks}>
          {weeks.map((w)=>(
            <WeeklyRow key={w} weekStartMs={w} onOpenWeek={onOpenWeek} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** ---- YearView ---- */
export default function YearView(){
  const ms = useDateStore();
  const year = new Date(ms).getFullYear();

  const openWeek = (weekMs:number) => { setDateMs(weekMs); setView("week" as View); };
  const go = (delta:number) => {
    const d = new Date(ms);
    d.setFullYear(d.getFullYear()+delta);
    d.setHours(0,0,0,0);
    setDateMs(d.getTime());
  };

  const m = new Date(ms).getMonth(); // 0..11
  const currentQ = (Math.floor(m/3)+1) as 1|2|3|4;

  // Multi-open quarters. Allows zero open (all collapsed).
  const [openQs, setOpenQs] = React.useState<Set<1|2|3|4>>(new Set([currentQ]));
  const toggleQ = (q:1|2|3|4) =>
    setOpenQs(prev => { const next=new Set(prev); next.has(q)?next.delete(q):next.add(q); return next; });

  return (
    <div className={styles.container}>
      {/* Year banner under tabs */}
      <div className={styles.bannerWrap}>
        <div className={styles.banner}>
          <button className={styles.chev} aria-label="Previous year" onClick={()=>go(-1)}>‹</button>
          <div style={{textAlign:'center'}}>
            <div className={styles.title}>{`YEAR ${year}`}</div>
            <div className={styles.subTitle}>{`JAN–DEC, ${year}`}</div>
          </div>
          <button className={styles.chev} aria-label="Next year" onClick={()=>go(+1)}>›</button>
        </div>
      </div>

      <div className={styles.qGrid}>
        <QuarterSection label="Q1" year={year} q={1} isOpen={openQs.has(1)} onToggle={()=>toggleQ(1)} onOpenWeek={openWeek} />
        <QuarterSection label="Q2" year={year} q={2} isOpen={openQs.has(2)} onToggle={()=>toggleQ(2)} onOpenWeek={openWeek} />
        <QuarterSection label="Q3" year={year} q={3} isOpen={openQs.has(3)} onToggle={()=>toggleQ(3)} onOpenWeek={openWeek} />
        <QuarterSection label="Q4" year={year} q={4} isOpen={openQs.has(4)} onToggle={()=>toggleQ(4)} onOpenWeek={openWeek} />
      </div>
    </div>
  );
}

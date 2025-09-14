import React, { useMemo, useState } from "react";
import {
  useReminders, listAll, listByPreset, add, update, remove, toggleDone,
  type RangePreset
} from "@/stores/remindersStore";
import "./RemindersView.css";

function toLocalInput(ms:number){ const d=new Date(ms); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16); }
function fromLocalInput(v:string){ return new Date(v).getTime(); }

const PRESETS: RangePreset[] = ["today","tomorrow","thisWeek","thisMonth","thisYear"];
const LABEL: Record<RangePreset,string> = {
  today:"Today", tomorrow:"Tomorrow", thisWeek:"ThisWeek", thisMonth:"ThisMonth", thisYear:"ThisYear",
};

export default function RemindersView(){
  useReminders(); // subscribe
  const [active, setActive] = useState<Set<RangePreset>>(new Set());
  const [open, setOpen]   = useState(false);
  const [editId, setEditId] = useState<string|null>(null);

  // modal state
  const [title, setTitle] = useState("");
  const [when, setWhen]   = useState<string>(toLocalInput(Date.now()));
  const [daysBefore, setDaysBefore] = useState(0);
  const [count, setCount] = useState(0);

  function togglePreset(p: RangePreset){
    setActive(prev => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  const items = useMemo(()=>{
    if(active.size===0) return listAll().slice().sort((a,b)=>a.when-b.when);
    const now = Date.now();
    const map = new Map<string, ReturnType<typeof listAll>[number]>();
    for(const p of active){
      for(const r of listByPreset(now, p)) map.set(r.id, r);
    }
    return Array.from(map.values()).sort((a,b)=>a.when-b.when);
  }, [active, useReminders]); // useReminders subscribes; re-render on changes

  function openAdd(){
    setEditId(null);
    setTitle(""); setWhen(toLocalInput(Date.now())); setDaysBefore(0); setCount(0);
    setOpen(true);
  }
  function openEdit(id:string){
    const r = listAll().find(x=>x.id===id); if(!r) return;
    setEditId(id);
    setTitle(r.title); setWhen(toLocalInput(r.when));
    setDaysBefore(r.alerts?.daysBefore ?? 0); setCount(r.alerts?.count ?? 0);
    setOpen(true);
  }
  function commit(){
    const t = title.trim(); if(!t) return;
    const whenMs = when ? fromLocalInput(when) : Date.now();
    const alerts = (daysBefore>0 && count>0) ? { daysBefore, count } : null;
    editId ? update(editId, { title: t, when: whenMs, alerts })
           : add({ title: t, when: whenMs, alerts });
    setOpen(false);
  }

  return (
    <div className="remv" style={{padding:"12px 0 24px"}}>
      {/* Title on its own line */}
      <h2 className="remv__title" style={{margin:"0 0 8px", fontWeight:800}}>Reminders</h2>

      {/* Filters row below title */}
      <div className="remv__filters" style={{display:"flex", flexWrap:"wrap", gap:8, background:"#f5f5f5", padding:8, borderRadius:12}}>
        {PRESETS.map(p=>(
          <button
            key={p}
            type="button"
            onClick={()=>togglePreset(p)}
            aria-pressed={active.has(p)}
            style={{
              border:"1px solid #ddd",
              background: active.has(p) ? "#ffe8cc" : "#fff",
              borderRadius:999, padding:"6px 12px"
            }}
          >
            {LABEL[p]}
          </button>
        ))}
      </div>

      {/* Add button on its own line */}
      <div style={{margin:"10px 0"}}>
        <button
          type="button"
          onClick={openAdd}
          className="btn btn--primary"
          style={{border:"1px solid #111", background:"#111", color:"#fff", borderRadius:8, padding:"6px 12px"}}
        >
          Add reminder
        </button>
      </div>

      {/* List */}
      <div className="remv__list" style={{display:"grid", gap:8}}>
        {items.length===0 ? (
          <div className="empty" style={{opacity:0.6, textAlign:"center"}}>Empty</div>
        ) : items.map(r=>(
          <div key={r.id} className="row" style={{display:"grid", gridTemplateColumns:"28px 1fr auto", gap:8, alignItems:"center", border:"1px solid #eee", borderRadius:12, background:"#fff", padding:8}}>
            <button className={`dot ${r.done?"ok":""}`} onClick={()=>toggleDone(r.id)} style={{width:24,height:24,borderRadius:999,border:"1px solid #ccc", background:r.done?"#e7f8ec":"#fafafa"}}>{r.done?"✓":""}</button>
            <div className="rowMain" style={{display:"grid", gap:2}}>
              <div className={`rowTitle ${r.done?"done":""}`} style={{fontWeight:600, textDecoration:r.done?"line-through":"none"}}>{r.title}</div>
              <div className="rowMeta" style={{fontSize:12, opacity:0.7}}>{new Date(r.when).toLocaleString()}</div>
            </div>
            <div className="rowBtns" style={{display:"flex", gap:6}}>
              <button className="chip" onClick={()=>openEdit(r.id)} style={{border:"1px solid #ddd", background:"#fff", borderRadius:999, padding:"4px 10px"}}>Edit</button>
              <button className="chip danger" onClick={()=>remove(r.id)} style={{border:"1px solid #ffb3b3", background:"#fff", borderRadius:999, padding:"4px 10px"}}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {open && (
        <div role="dialog" aria-modal="true" onClick={()=>setOpen(false)} style={{position:"fixed", inset:0, background:"rgba(0,0,0,.35)", display:"grid", placeItems:"center", zIndex:50}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff", borderRadius:12, minWidth:320, maxWidth:560, padding:16}}>
            <h3 style={{margin:"0 0 8px"}}>{editId ? "Edit Reminder" : "Add Reminder"}</h3>
            <label style={{display:"grid", gap:4, margin:"6px 0"}}>
              <span style={{fontSize:12, opacity:.7}}>Title</span>
              <input value={title} onChange={e=>setTitle(e.target.value)} style={{border:"1px solid #ddd", borderRadius:8, padding:8}} autoFocus />
            </label>
            <label style={{display:"grid", gap:4, margin:"6px 0"}}>
              <span style={{fontSize:12, opacity:.7}}>Date & Time</span>
              <input type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)} style={{border:"1px solid #ddd", borderRadius:8, padding:8}} />
            </label>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
              <label style={{display:"grid", gap:4}}>
                <span style={{fontSize:12, opacity:.7}}>Days before</span>
                <input type="number" min="0" value={daysBefore} onChange={e=>setDaysBefore(parseInt(e.target.value||"0"))} style={{border:"1px solid #ddd", borderRadius:8, padding:8}} />
              </label>
              <label style={{display:"grid", gap:4}}>
                <span style={{fontSize:12, opacity:.7}}>Count</span>
                <input type="number" min="0" value={count} onChange={e=>setCount(parseInt(e.target.value||"0"))} style={{border:"1px solid #ddd", borderRadius:8, padding:8}} />
              </label>
            </div>
            <div style={{display:"flex", justifyContent:"flex-end", gap:8, marginTop:10}}>
              <button onClick={()=>setOpen(false)} style={{border:"1px solid #ddd", background:"#fff", borderRadius:8, padding:"6px 10px"}}>Cancel</button>
              <button onClick={commit} style={{border:"1px solid #111", background:"#111", color:"#fff", borderRadius:8, padding:"6px 10px"}}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

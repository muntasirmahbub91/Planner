import React, { useMemo, useState, useEffect, useRef } from "react";
import { add, all, remove, update, useTasks, type Task } from "@/stores/tasksStore";
import "./TasksView.css";
import ToggleButton from "@/components/ToggleButton";
import Modal from "@/components/Modal";

type ViewMode = "list" | "matrix";
type Bucket = "today" | "overdue" | "tomorrow" | "thisWeek" | "later" | "noDate";

const DAY = 86_400_000 as const;
const BUCKETS: Bucket[] = ["today", "overdue", "tomorrow", "thisWeek", "later", "noDate"];
const LABEL: Record<Bucket, string> = {
  today: "Today",
  overdue: "Overdue",
  tomorrow: "Tomorrow",
  thisWeek: "This week",
  later: "Later",
  noDate: "No date",
};

const atStart = (ms:number)=>{ const d=new Date(ms); d.setHours(0,0,0,0); return d.getTime(); };
const fmtShort = (ms:number|null)=> ms==null?"":new Date(ms).toLocaleDateString(undefined,{month:"short",day:"numeric"});

function bucketOf(t:Task, today=atStart(Date.now())):Bucket{
  if(t.dueMs==null) return "noDate";
  if(t.dueMs<today) return "overdue";
  if(t.dueMs===today) return "today";
  if(t.dueMs===today+DAY) return "tomorrow";
  if(t.dueMs<=today+6*DAY) return "thisWeek";
  return "later";
}

export default function TasksView(){
  useTasks();
  const tasks = all();

  const [mode,setMode] = useState<ViewMode>("matrix");
  const [filters,setFilters] = useState<Set<Bucket>>(new Set(["overdue","today"]));

  /* ------ Add Task (modal) ------ */
  const [addOpen,setAddOpen] = useState(false);
  const [draftTitle,setDraftTitle] = useState("");
  const [draftDate,setDraftDate] = useState("");
  const [draftU,setDraftU] = useState(false);
  const [draftI,setDraftI] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef  = useRef<HTMLInputElement>(null);

  useEffect(()=>{ if(addOpen) setTimeout(()=>titleRef.current?.focus(),0); },[addOpen]);
  const openDatePicker = ()=>{ const el=dateRef.current; if(!el) return; (el as any).showPicker?.() ?? el.click(); el.focus(); };
  const saveTask = ()=>{
    const title = draftTitle.trim().slice(0,50);
    if(!title) return;
    const dueMs = draftDate ? atStart(new Date(draftDate).getTime()) : null;
    add({ title, dueMs, urgent:draftU, important:draftI, tri:0, done:false });
    setDraftTitle(""); setDraftDate(""); setDraftU(false); setDraftI(false); setAddOpen(false);
  };

  /* ------ Selection + Edit (modal) ------ */
  const [sel,setSel] = useState<string|null>(null);
  const [editOpen,setEditOpen] = useState(false);

  const sorted = useMemo(()=>{
    const a = Array.isArray(tasks)?[...tasks]:[];
    a.sort((x,y)=>{
      const xd=x.dueMs??Number.MAX_SAFE_INTEGER, yd=y.dueMs??Number.MAX_SAFE_INTEGER;
      if(xd!==yd) return xd-yd;
      const xp=(x.urgent?2:0)+(x.important?1:0), yp=(y.urgent?2:0)+(y.important?1:0);
      if(xp!==yp) return yp-xp;
      return x.createdMs-y.createdMs;
    });
    return a;
  },[tasks]);

  const selTask = useMemo(()=> sorted.find(t=>t.id===sel) ?? null, [sorted,sel]);

  const [eTitle,setETitle] = useState("");
  const [eDate,setEDate] = useState("");
  const [eU,setEU] = useState(false);
  const [eI,setEI] = useState(false);
  const eDateRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{
    if(!editOpen || !selTask) return;
    setETitle(selTask.title);
    setEU(!!selTask.urgent);
    setEI(!!selTask.important);
    setEDate(selTask.dueMs ? new Date(selTask.dueMs).toISOString().slice(0,10) : "");
  },[editOpen,selTask]);

  useEffect(()=>{ if(!sel) setEditOpen(false); },[sel]);

  const openEditPicker = ()=>{ const el=eDateRef.current; if(!el) return; (el as any).showPicker?.() ?? el.click(); el.focus(); };
  const submitEdit = (e?:React.FormEvent)=>{
    if(e) e.preventDefault();
    if(!selTask) return;
    const title=eTitle.trim().slice(0,50);
    const dueMs=eDate ? atStart(new Date(eDate).getTime()) : null;
    update(selTask.id,{ title, dueMs, urgent:eU, important:eI });
    setEditOpen(false);
  };

  /* ------ Filtered list ------ */
  const pass = (t:Task)=> filters.size===0 ? true : filters.has(bucketOf(t));
  const flatList = useMemo(()=> sorted.filter(pass), [sorted,filters]);

  const toggleDoneTri = (t:Task)=>{
    const nextDone = !(t.done || t.tri===1);
    update(t.id,{ done:nextDone, tri:nextDone?1:0 });
  };

  return (
    <div className="tasks">
      <h1 className="tasks__h1" style={{textTransform:"uppercase", marginTop:40}}>TASKS</h1>
      <div className="tasks__sep" />

      {/* Add Task trigger */}
      <div className="addBlock">
        <div className="addBlockHeader">
          <button type="button" className="addBtn" aria-expanded={addOpen} onClick={()=>setAddOpen(true)}>
            Add task
          </button>
        </div>
      </div>

      {/* Add Task Modal */}
      <Modal open={addOpen} onClose={()=>setAddOpen(false)} title="Add task">
        <div className="composerRowInline" role="group" aria-label="New task">
          <input
            ref={titleRef}
            className="tinyInput"
            placeholder="Task title…"
            value={draftTitle}
            maxLength={50}
            onChange={e=>setDraftTitle(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==="Enter") saveTask(); if(e.key==="Escape") setAddOpen(false); }}
          />
          {/* hidden date input + icon trigger */}
          <input
            ref={dateRef}
            type="date"
            value={draftDate}
            onChange={e=>setDraftDate(e.target.value)}
            style={{ position:"fixed", left:-9999, top:-9999, width:1, height:1, opacity:0 }}
          />
          <button type="button" className="iconBtn" onClick={openDatePicker} aria-label="Pick date">📅</button>

          <button type="button" className={`pill ${draftU?"on":""}`} onClick={()=>setDraftU(v=>!v)}>U</button>
          <button type="button" className={`pill ${draftI?"on":""}`} onClick={()=>setDraftI(v=>!v)}>I</button>

          <button className="btn btn--primary" onClick={saveTask}>Save</button>
          <button className="btn" onClick={()=>setAddOpen(false)}>Cancel</button>
        </div>
      </Modal>

      {/* Toolbar */}
      <div className="toolbarLeft">
        <div className="seg">
          <button className={`seg-btn ${mode==="list"?"active":""}`} onClick={()=>setMode("list")}>List</button>
          <button className={`seg-btn ${mode==="matrix"?"active":""}`} onClick={()=>setMode("matrix")}>Matrix</button>
        </div>
        <button className="btn" disabled={!sel} onClick={()=>setEditOpen(v=>!v)}>
          {editOpen ? "Close" : "Edit"}
        </button>
      </div>

      {/* Edit Task Modal (no title) */}
      {selTask && (
        <Modal open={editOpen} onClose={()=>setEditOpen(false)}>
          <form className="composerRowInline" onSubmit={submitEdit} role="group" aria-label="Edit task">
            <input
              className="tinyInput"
              placeholder="Task title…"
              value={eTitle}
              maxLength={50}
              onChange={e=>setETitle(e.target.value)}
              autoFocus
            />
            {/* hidden date input + icon trigger */}
            <input
              ref={eDateRef}
              type="date"
              value={eDate}
              onChange={e=>setEDate(e.target.value)}
              style={{ position:"fixed", left:-9999, top:-9999, width:1, height:1, opacity:0 }}
            />
            <button type="button" className="iconBtn" onClick={openEditPicker} aria-label="Pick date">📅</button>

            <button type="button" className={`pill ${eU?"on":""}`} onClick={()=>setEU(v=>!v)}>U</button>
            <button type="button" className={`pill ${eI?"on":""}`} onClick={()=>setEI(v=>!v)}>I</button>

            <button type="submit" className="btn btn--primary">Save</button>
            <button type="button" className="btn" onClick={()=>setEditOpen(false)}>Cancel</button>
          </form>
        </Modal>
      )}

      {/* Filters */}
      <div className="filtersRow">
        {BUCKETS.map(k=>(
          <button
            key={k}
            className={`chipToggle ${filters.has(k)?"on":""}`}
            onClick={()=>setFilters(s=>{ const n=new Set(s); n.has(k)?n.delete(k):n.add(k); return n; })}
          >
            {LABEL[k]}
          </button>
        ))}
      </div>

      {/* Views */}
      {mode==="list" ? (
        <div className="list listTopGap">
          {flatList.length===0 && <div className="empty">Empty</div>}
          {flatList.map(t=>{
            const checked = t.done || t.tri===1;
            return (
              <label key={t.id} className={`row ${sel===t.id?"sel":""}`}>
                <ToggleButton checked={checked} onChange={()=>toggleDoneTri(t)} />
                <input type="radio" name="sel" checked={sel===t.id} onChange={()=>setSel(t.id)} style={{display:"none"}} />
                <div className="rowMain" onClick={()=>setSel(t.id)}>
                  <div className={`rowTitle ${checked?"done":""}`}>{t.title}</div>
                  <div className="rowMeta">{fmtShort(t.dueMs)} {t.urgent?"U":""}{t.important?" I":""}</div>
                </div>
                <div className="rowBtns">
                  <button type="button" className="icon" onClick={()=>remove(t.id)}>✕</button>
                </div>
              </label>
            );
          })}
        </div>
      ) : (
        <div className="matrixGrid">
          {[
            ["Urgent + Important (Do first)", (x:Task)=>x.urgent&&x.important],
            ["Important (Schedule)",          (x:Task)=>!x.urgent&&x.important],
            ["Urgent (Delegate)",             (x:Task)=>x.urgent&&!x.important],
            ["Not urgent & not important (Eliminate)", (x:Task)=>!x.urgent&&!x.important],
          ].map(([title, pred], idx)=>{
            const items = flatList.filter(pred as any);
            return (
              <section key={String(title)} className={`quadBox q-${idx}`}>
                <div className="quadHeader">{title as string}</div>
                <div className="quadBody">
                  <div className="list">
                    {items.length===0 && <div className="empty">Empty</div>}
                    {items.map(t=>{
                      const checked = t.done || t.tri===1;
                      return (
                        <label key={t.id} className={`row ${sel===t.id?"sel":""}`}>
                          <ToggleButton checked={checked} onChange={()=>toggleDoneTri(t)} />
                          <input type="radio" name="sel" checked={sel===t.id} onChange={()=>setSel(t.id)} style={{display:"none"}} />
                          <div className="rowMain" onClick={()=>setSel(t.id)}>
                            <div className={`rowTitle ${checked?"done":""}`}>{t.title}</div>
                            <div className="rowMeta">{fmtShort(t.dueMs)} {t.urgent?"U":""}{t.important?" I":""}</div>
                          </div>
                          <div className="rowBtns">
                            <button type="button" className="icon" onClick={()=>remove(t.id)}>✕</button>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

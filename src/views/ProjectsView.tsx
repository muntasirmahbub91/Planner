import React, { useMemo, useState } from "react";
import {
  useProjects, listProjects, addProject, archiveProject, removeProject,
  listGoals, addGoal, archiveGoal, removeGoal
} from "@/stores/projectsStore";
import {
  add as addTask, byGoal, setDateFlags, update as updateTask, remove as removeTask, type Task
} from "@/stores/tasksStore";
import "./ProjectsView.css";

const atStart = (ms:number)=>{ const d=new Date(ms); d.setHours(0,0,0,0); return d.getTime(); };
const fmtShort = (ms:number|null)=> ms==null ? "No date" : new Date(ms).toLocaleDateString(undefined,{month:"short",day:"numeric"});

export default function ProjectsView(){
  useProjects();
  const projects = listProjects();

  const [tab, setTab] = useState<"active"|"archived">("active");

  // Inline Add Project composer
  const [addOpen, setAddOpen] = useState(false);
  const [pName, setPName] = useState("");
  const [pNotes, setPNotes] = useState("");

  const show = useMemo(()=> projects.filter(p => tab==="active" ? !p.archived : p.archived), [projects, tab]);

  const saveProject = ()=>{
    const name = pName.trim(); if(!name) return;
    // store may ignore notes; kept for future
    addProject(name);
    setAddOpen(false); setPName(""); setPNotes("");
  };

  return (
    <div className="projects">
      <header className="prjHeader">
        <h1 className="prjTitle">Projects</h1>
        <div className="seg">
          <button className={`seg-btn ${tab==="active"?"active":""}`} onClick={()=>setTab("active")}>Active</button>
          <button className={`seg-btn ${tab==="archived"?"active":""}`} onClick={()=>setTab("archived")}>Archived</button>
        </div>
      </header>

      <div className="projects__sep" />

      {/* Add Project inline (no modal) */}
      <div className="addProjectWrap">
        <div><button className="btn btn--primary" onClick={()=>setAddOpen(v=>!v)}>Add Project</button></div>
        {addOpen && (
          <div className="addProjectBlock">
            <div className="addProjectRow">
              <input className="input" placeholder="Project name" value={pName} onChange={e=>setPName(e.target.value)} />
              <button className="btn btn--primary" onClick={saveProject}>Save</button>
              <button className="btn" onClick={()=>setAddOpen(false)}>Cancel</button>
            </div>
            <textarea placeholder="Notes (optional)" value={pNotes} onChange={e=>setPNotes(e.target.value)} />
          </div>
        )}
      </div>

      {/* Projects list */}
      <div className="stack">
        {show.length===0 && <div className="empty">No projects</div>}
        {show.map(p=>(
          <ProjectBlock key={p.id} pid={p.id} name={p.name} archived={p.archived}/>
        ))}
      </div>
    </div>
  );
}

/* ---------- Project ---------- */
function ProjectBlock({ pid, name, archived }:{ pid:string; name:string; archived:boolean }){
  const goals = listGoals(pid);

  // Inline goal composer
  const [gOpen, setGOpen] = useState(false);
  const [gTitle, setGTitle] = useState("");

  const addNewGoal = ()=>{
    const t=gTitle.trim(); if(!t) return;
    addGoal(pid, t);
    setGOpen(false); setGTitle("");
  };

  return (
    <section className="card projectBlock">
      <div className="cardHead">
        <div>
          <h2 className="projectTitle">{name}</h2>
          <div className="rowMeta">{goals.length} {goals.length===1?"goal":"goals"}</div>
        </div>
        <div className="actions">
          <button className="chip" onClick={()=>archiveProject(pid, !archived)}>{archived?"Unarchive":"Archive"}</button>
          <button className="chip danger" onClick={()=>removeProject(pid)}>Delete</button>
          <button className="chip" onClick={()=>setGOpen(v=>!v)}>Add Goal</button>
        </div>
      </div>

      {gOpen && (
        <div className="addProjectRow">
          <input className="input" placeholder="Goal title" value={gTitle} onChange={e=>setGTitle(e.target.value)} />
          <button className="btn btn--primary" onClick={addNewGoal}>Save</button>
          <button className="btn" onClick={()=>setGOpen(false)}>Cancel</button>
        </div>
      )}

      <div className="goalList">
        {goals.length===0 && <div className="empty">No goals yet</div>}
        {goals.map(g=>(
          <GoalBlock key={g.id} gid={g.id} title={g.title}/>
        ))}
      </div>
    </section>
  );
}

/* ---------- Goal ---------- */
function GoalBlock({ gid, title }:{ gid:string; title:string }){
  const tasks = byGoal(gid);

  // Add task inline
  const [draft, setDraft] = useState("");
  const addUnderGoal = ()=>{
    const t=draft.trim(); if(!t) return;
    addTask({ title:t, goalId: gid });
    setDraft("");
  };

  // Inline "Sync to Day" editor per row
  const [editId, setEditId] = useState<string|null>(null);
  const [dateStr, setDateStr] = useState("");
  const [u, setU] = useState(false);
  const [i, setI] = useState(false);

  const openEdit = (t:Task)=>{
    setEditId(t.id);
    setDateStr(t.dueMs ? new Date(t.dueMs).toISOString().slice(0,10) : "");
    setU(!!t.urgent); setI(!!t.important);
  };
  const saveEdit = ()=>{
    if(!editId) return;
    const due = dateStr ? atStart(new Date(dateStr).getTime()) : null;
    setDateFlags(editId, due, u, i);
    setEditId(null);
  };

  return (
    <article className="goalBlock">
      <h3 className="goalTitle">{title}</h3>

      <div className="addTaskRow">
        <input className="input" placeholder="Add task…" value={draft} onChange={e=>setDraft(e.target.value)} />
        <button className="btn btn--primary" onClick={addUnderGoal}>Add</button>
      </div>

      <div className="taskList">
        {tasks.length===0 && <div className="empty">No tasks</div>}
        {tasks.map(t=>{
          const done = t.done || t.tri===1;
          return (
            <div key={t.id} className="taskRow">
              <div className="taskMain">
                <div className={`taskTitle ${done?"done":""}`}>{t.title}</div>
                <div className="rowMeta">{fmtShort(t.dueMs)} {t.urgent?"U":""}{t.important?" I":""}</div>
              </div>
              <div className="actions">
                <button className="chip" onClick={()=>updateTask(t.id,{ tri: ((t.tri+1)%3) as any, done: ((t.tri+1)%3)===1 })}>
                  {t.tri===1?"✓":t.tri===2?"✗":"○"}
                </button>
                <button className="chip" onClick={()=>openEdit(t)}>Sync</button>
                <button className="chip danger" onClick={()=>removeTask(t.id)}>Delete</button>
              </div>

              {editId===t.id && (
                <div className="addTaskRow" style={{marginTop:8}}>
                  <input type="date" className="input" value={dateStr} onChange={e=>setDateStr(e.target.value)} />
                  <button className={`chip ${u?"btn--primary":""}`} onClick={()=>setU(v=>!v)}>U</button>
                  <button className={`chip ${i?"btn--primary":""}`} onClick={()=>setI(v=>!v)}>I</button>
                  <button className="btn btn--primary" onClick={saveEdit}>Save</button>
                  <button className="btn" onClick={()=>setEditId(null)}>Cancel</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

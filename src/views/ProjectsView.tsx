// src/views/ProjectsView.tsx
import React, { useMemo, useRef, useState } from "react";
import {
  useProjects, listProjects, addProject, archiveProject, removeProject,
  listGoals, addGoal
} from "@/stores/projectsStore";
import {
  useTasks,
  add as addTask,
  byGoal,
  update as updateTask,
  remove as removeTask,
  type Task
} from "@/stores/tasksStore";
import "./ProjectsView.css";

/* helpers */
const atStart = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const fmtShort = (ms: number | null) =>
  ms == null ? "No date" : new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function ProjectsView() {
  useProjects();
  const projects = listProjects();
  const [tab, setTab] = useState<"active" | "archived">("active");

  // add-project sheet
  const [adding, setAdding] = useState(false);
  const [pName, setPName] = useState("");
  const [pNotes, setPNotes] = useState("");
  const saveProject = () => {
    const name = pName.trim();
    if (!name) return;
    addProject(name);
    setAdding(false);
    setPName(""); setPNotes("");
  };

  const show = useMemo(
    () => projects.filter((p) => (tab === "active" ? !p.archived : p.archived)),
    [projects, tab]
  );

  return (
    <div className="projects">
      {/* Header row */}
      <header className="prjHeader">
        <h1 className="prjTitle">Projects</h1>
        <div className="prjControls">
          <div className="seg" role="tablist" aria-label="Project filter">
            <button
              className={`seg-btn ${tab === "active" ? "active" : ""}`}
              role="tab"
              aria-selected={tab === "active"}
              onClick={() => setTab("active")}
            >
              Active
            </button>
            <button
              className={`seg-btn ${tab === "archived" ? "active" : ""}`}
              role="tab"
              aria-selected={tab === "archived"}
              onClick={() => setTab("archived")}
            >
              Archived
            </button>
          </div>

          <button
            className="iconBtn prjAdd"
            aria-label="Add project"
            title="Add project"
            onClick={() => setAdding(v => !v)}
          >
            +
          </button>
        </div>
      </header>

      {/* Add project inline sheet */}
      {adding && (
        <div className="sheet addProjectSheet" role="dialog" aria-label="Add project">
          <div className="addProjectRow">
            <input
              className="input"
              placeholder="Project name"
              value={pName}
              onChange={(e) => setPName(e.target.value)}
            />
            <button className="btn btn--primary" onClick={saveProject}>Save</button>
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
          </div>
          <textarea
            placeholder="Notes (optional)"
            value={pNotes}
            onChange={(e) => setPNotes(e.target.value)}
          />
        </div>
      )}

      <div className="stack">
        {show.length === 0 && <div className="empty">No projects</div>}
        {show.map((p) => (
          <ProjectBlock key={p.id} pid={p.id} name={p.name} archived={p.archived} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Project ---------- */
function ProjectBlock({ pid, name, archived }: { pid: string; name: string; archived: boolean }) {
  const goals = listGoals(pid);

  const [open, setOpen] = useState(true);
  const [gOpen, setGOpen] = useState(false);
  const [gTitle, setGTitle] = useState("");
  const addNewGoal = () => {
    const t = gTitle.trim(); if (!t) return;
    addGoal(pid, t);
    setGOpen(false); setGTitle("");
  };

  const [menu, setMenu] = useState(false);

  // progress
  const version = useTasks((s) => s.version);
  const allGoalTasks = useMemo(
    () => goals.flatMap(g => byGoal(g.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, goals.map(g => g.id).join("|")]
  );
  const doneCount = allGoalTasks.filter(t => t.done || t.tri === 1).length;
  const totalCount = allGoalTasks.length;
  const progress = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <section className="projectRow" aria-labelledby={`prj-${pid}`}>
      <div className="projectHead">
        <button
          className="chev"
          aria-label={open ? "Collapse project" : "Expand project"}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          {open ? "▾" : "▸"}
        </button>

        <div className="projectHeadMain">
          <h2 id={`prj-${pid}`} className="projectTitle">{name}</h2>
          <div className="rowMeta">
            {goals.length} {goals.length === 1 ? "goal" : "goals"}
            {totalCount > 0 ? ` • ${doneCount}/${totalCount} done (${progress}%)` : null}
          </div>
          {totalCount > 0 && (
            <div className="progress">
              <div className="progress__bar" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        <div className="projectHeadAct">
          <button className="iconBtn" aria-label="Project menu" onClick={() => setMenu(v => !v)}>⋯</button>
          {menu && (
            <div className="menu" role="menu">
              <button className="menu__item" role="menuitem" onClick={() => { archiveProject(pid, !archived); setMenu(false); }}>
                {archived ? "Unarchive" : "Archive"}
              </button>
              <button className="menu__item danger" role="menuitem" onClick={() => { removeProject(pid); setMenu(false); }}>
                Delete
              </button>
              <button className="menu__item" role="menuitem" onClick={() => { setGOpen(true); setMenu(false); }}>
                Add goal
              </button>
            </div>
          )}
        </div>
      </div>

      {gOpen && (
        <div className="addProjectRow">
          <input className="input" placeholder="Goal title" value={gTitle} onChange={(e) => setGTitle(e.target.value)} />
          <button className="btn btn--primary" onClick={addNewGoal}>Save</button>
          <button className="btn" onClick={() => setGOpen(false)}>Cancel</button>
        </div>
      )}

      {open && (
        <div className="goalList">
          {goals.length === 0 && <div className="empty">No goals yet</div>}
          {goals.map((g) => (
            <GoalBlock key={g.id} gid={g.id} title={g.title} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------- Goal ---------- */
function GoalBlock({ gid, title }: { gid: string; title: string }) {
  const version = useTasks((s) => s.version);
  const tasks: Task[] = useMemo(() => byGoal(gid), [version, gid]);

  const [draft, setDraft] = useState("");
  const addUnderGoal = () => {
    const t = draft.trim(); if (!t) return;
    addTask({ title: t, goalId: gid });
    setDraft("");
  };

  // editor state
  const [editId, setEditId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState(""); // kept for compatibility
  const [dateStr, setDateStr] = useState("");
  const [u, setU] = useState(false);
  const [i, setI] = useState(false);

  // date picker
  const dateRef = useRef<HTMLInputElement | null>(null);
  const openDatePicker = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const el = dateRef.current;
    // @ts-ignore
    if (el && typeof el.showPicker === "function") { /* @ts-ignore */ el.showPicker(); }
    else if (el) { el.focus(); }
  };

  const openEdit = (t: Task) => {
    setEditId(t.id);
    setTitleDraft(t.title); // displayed in the row only
    setDateStr(t.dueMs ? new Date(t.dueMs).toISOString().slice(0, 10) : "");
    setU(!!t.urgent);
    setI(!!t.important);
  };

  const toggleTri = (t: Task) => {
    const nextTri = ((t.tri + 1) % 3) as typeof t.tri;
    updateTask(t.id, { tri: nextTri, done: nextTri === 1 });
  };

  return (
    <article className="goalBlock" aria-labelledby={`goal-${gid}`}>
      <h3 id={`goal-${gid}`} className="goalTitle">{title}</h3>

      <div className="addTaskRow">
        <input className="input" placeholder="Add task…" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn btn--primary" onClick={addUnderGoal}>Add</button>
      </div>

      <div className="taskList">
        {tasks.length === 0 && <div className="empty">No tasks</div>}
        {tasks.map((t) => {
          const done = t.done || t.tri === 1;
          const editing = editId === t.id;
          return (
            <div key={t.id} className={`taskRow ${editing ? "editing" : ""}`}>
              <div className="taskMain" onClick={() => openEdit(t)}>
                <div className={`taskTitle ${done ? "done" : ""}`}>{t.title || "Untitled task"}</div>
                <div className="rowMeta">
                  {fmtShort(t.dueMs)} {t.urgent ? "U" : ""}{t.important ? " I" : ""}
                </div>
              </div>
              <div className="actions">
                <button className="chip" onClick={() => toggleTri(t)} title="Toggle tri-state">
                  {t.tri === 1 ? "✓" : t.tri === 2 ? "✗" : "○"}
                </button>
                <button className="chip" onClick={() => openEdit(t)}>Sync</button>
                <button className="chip danger" onClick={() => removeTask(t.id)}>Delete</button>
              </div>

              {editing && (
                <div
                  className="sheet"
                  onPointerDown={(e)=>e.stopPropagation()}
                  onMouseDown={(e)=>e.stopPropagation()}
                >
                  {/* Row 1: Calendar + U + I */}
                  <div className="editRow scheduleRow">
                    <input
                      ref={dateRef}
                      type="date"
                      className="input date"
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      onClick={openDatePicker}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                    <button className={`chip ${u ? "is-on" : ""}`} onClick={() => setU(v => !v)}>U</button>
                    <button className={`chip ${i ? "is-on" : ""}`} onClick={() => setI(v => !v)}>I</button>
                  </div>

                  {/* Row 2: Sync/Delete/Save/Cancel */}
                  <div className="editRow controlsRow">
                    <span className="chip" aria-disabled>Sync</span>
                    <button
                      className="chip danger"
                      onClick={() => { removeTask(t.id); setEditId(null); }}
                    >
                      Delete
                    </button>
                    <div style={{ flex: 1 }} />
                    <button
                      className="btn btn--primary"
                      onClick={() => {
                        const dueMs = dateStr ? atStart(new Date(dateStr).getTime()) : null;
                        // keep title as-is; only schedule/flags update
                        updateTask(t.id, { title: titleDraft, dueMs, urgent: u, important: i });
                        setEditId(null);
                      }}
                    >
                      Save
                    </button>
                    <button className="btn" onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

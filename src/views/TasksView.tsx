// src/views/TasksView.tsx — drop-in rewrite: title + List/Matrix/Edit on one line, preserves all behavior
import React, { useMemo, useState, useEffect, useRef } from "react";
import "./TasksView.css";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import Modal from "@/components/Modal";
import {
  useTasks,
  all,
  add,
  update,
  remove,
  type Task,
} from "@/stores/tasksStore";

/* ---------- time helpers ---------- */
const DAY = 86_400_000;
const atStart = (ms: number) => { const d = new Date(ms); d.setHours(0,0,0,0); return d.getTime(); };
const todayStart = atStart(Date.now());
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fmtShort = (ms: number | null | undefined) =>
  ms == null ? "No date" : new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/* ---------- filters/buckets ---------- */
type Bucket = "today" | "overdue" | "tomorrow" | "thisWeek" | "later" | "noDate";
const BUCKETS: Bucket[] = ["today","overdue","tomorrow","thisWeek","later","noDate"];
const LABEL: Record<Bucket,string> = {
  today:"Today", overdue:"Overdue", tomorrow:"Tomorrow", thisWeek:"This week", later:"Later", noDate:"No date"
};
const bucketOf = (t: Task, base = todayStart): Bucket => {
  if (t.dueMs == null) return "noDate";
  const d = atStart(t.dueMs);
  if (d < base) return "overdue";
  if (d === base) return "today";
  if (d === base + DAY) return "tomorrow";
  if (d <= base + 6*DAY) return "thisWeek";
  return "later";
};

export default function TasksView(): JSX.Element {
  useTasks();
  const tasks = all();

  const [mode, setMode] = useState<"list"|"matrix">("list");
  const [filters, setFilters] = useState<Set<Bucket>>(new Set());

  const [selId, setSelId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDate, setDraftDate] = useState<string>("");
  const [draftU, setDraftU] = useState(false);
  const [draftI, setDraftI] = useState(false);
  const addTitleRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (addOpen) setTimeout(() => addTitleRef.current?.focus(), 0); }, [addOpen]);

  const saveAdd = () => {
    const title = draftTitle.trim().slice(0, 50);
    if (!title) return;
    const dueMs = draftDate ? atStart(new Date(draftDate).getTime()) : null;
    add({ title, dueMs, urgent: draftU, important: draftI, tri: 0, done: false });
    setDraftTitle(""); setDraftDate(""); setDraftU(false); setDraftI(false); setAddOpen(false);
  };

  const sorted: Task[] = useMemo(() => {
    const arr = Array.isArray(tasks) ? [...tasks] : [];
    arr.sort((a,b) => {
      const ap = (a.urgent?2:0) + (a.important?1:0);
      const bp = (b.urgent?2:0) + (b.important?1:0);
      if (ap !== bp) return bp - ap;
      const ad = a.dueMs ?? Number.MAX_SAFE_INTEGER;
      const bd = b.dueMs ?? Number.MAX_SAFE_INTEGER;
      if (ad !== bd) return ad - bd;
      return (a.createdMs ?? 0) - (b.createdMs ?? 0);
    });
    return arr;
  }, [tasks]);

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = { today:0, overdue:0, tomorrow:0, thisWeek:0, later:0, noDate:0 };
    sorted.forEach(t => { c[bucketOf(t)]++; });
    return c;
  }, [sorted]);

  const list = useMemo(
    () => sorted.filter(t => (filters.size === 0 ? true : filters.has(bucketOf(t)))),
    [sorted, filters]
  );

  const toggleDoneTri = (t: Task) => {
    const checked = t.done || t.tri === 1;
    const nextDone = !checked;
    update(t.id, { done: nextDone, tri: nextDone ? 1 : 0 });
  };
  const del = (id: string) => remove(id);

  const sel = useMemo(
    () => list.find(t => t.id === selId) ?? sorted.find(t => t.id === selId) ?? null,
    [list, sorted, selId]
  );
  const [eTitle, setETitle] = useState("");
  const [eDate, setEDate] = useState<string>("");
  const [eU, setEU] = useState(false);
  const [eI, setEI] = useState(false);
  useEffect(() => {
    if (!editOpen || !sel) return;
    setETitle(sel.title);
    setEU(!!sel.urgent);
    setEI(!!sel.important);
    setEDate(sel.dueMs ? new Date(sel.dueMs).toISOString().slice(0,10) : "");
  }, [editOpen, sel]);
  useEffect(() => { if (!selId) setEditOpen(false); }, [selId]);

  const submitEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sel) return;
    const title = eTitle.trim().slice(0, 50);
    const dueMs = eDate ? atStart(new Date(eDate).getTime()) : null;
    update(sel.id, { title, dueMs, urgent: eU, important: eI });
    setEditOpen(false);
  };

  return (
    <div className="tv-wrap">
      {/* header: title + mode on one line */}
      <header className="tv-header">
        <div className="tv-headRow">
          <h1 className="tv-title">Tasks</h1>
          <div className="tv-mode">
            <button className={`chip ${mode==="list"?"active":""}`} onClick={() => setMode("list")}>List</button>
            <button className={`chip ${mode==="matrix"?"active":""}`} onClick={() => setMode("matrix")}>Matrix</button>
            {sel && (
              <button className="chip" onClick={() => setEditOpen(v=>!v)}>{editOpen?"Close":"Edit"}</button>
            )}
          </div>
        </div>

        {/* filters with counts */}
        <div className="tv-filters" role="tablist" aria-label="Filters">
          {BUCKETS.map(k => (
            <button
              key={k}
              role="tab"
              aria-selected={filters.has(k)}
              className={`chip ${filters.has(k) ? "active" : ""}`}
              onClick={() =>
                setFilters(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; })
              }
            >
              {LABEL[k]} <span className="chipCount">{counts[k]}</span>
            </button>
          ))}
        </div>
      </header>

      {/* LIST */}
      {mode === "list" ? (
        <div className="tv-list" role="list">
          {list.length === 0 && <div className="empty">Empty</div>}
          {list.map(t => {
            const checked = t.done || t.tri === 1;
            const overdue = t.dueMs != null && atStart(t.dueMs) < todayStart && !checked;
            return (
              <div key={t.id} className="task-row" role="listitem">
                <button
                  className={`task-check ${checked ? "checked" : ""}`}
                  aria-pressed={checked}
                  aria-label={checked ? "Mark incomplete" : "Mark complete"}
                  onClick={() => toggleDoneTri(t)}
                />
                <div className="task-text" onClick={() => setSelId(t.id)}>
                  <div className={`task-title ${checked ? "done" : ""}`}>{t.title || "Untitled task"}</div>
                  <div className="task-meta">
                    <span className={overdue ? "overdue" : ""}>{fmtShort(t.dueMs)}</span>
                    {t.urgent && <span className="pill">U</span>}
                    {t.important && <span className="pill">I</span>}
                  </div>
                </div>
                <button className="task-x" aria-label="Delete task" onClick={() => del(t.id)}>×</button>
              </div>
            );
          })}
          <div style={{ height: 88 }} aria-hidden />
        </div>
      ) : (
        /* MATRIX (stacked sections) */
        <div className="matrixGrid">
          {[
            ["Urgent + Important (Do first)", (x: Task) => x.urgent && x.important],
            ["Important (Schedule)",          (x: Task) => !x.urgent && x.important],
            ["Urgent (Delegate)",             (x: Task) => x.urgent && !x.important],
            ["Not urgent & not important (Eliminate)", (x: Task) => !x.urgent && !x.important],
          ].map(([title, pred], idx) => {
            const items = list.filter(pred as any);
            return (
              <section key={String(title)} className={`quadBox q-${idx}`}>
                <div className="quadHeader">{title as string}</div>
                <div className="quadBody">
                  {items.length === 0 && <div className="empty">Empty</div>}
                  {items.map(t => {
                    const checked = t.done || t.tri === 1;
                    const overdue = t.dueMs != null && atStart(t.dueMs) < todayStart && !checked;
                    return (
                      <div key={t.id} className="task-row">
                        <button
                          className={`task-check ${checked ? "checked" : ""}`}
                          aria-pressed={checked}
                          aria-label={checked ? "Mark incomplete" : "Mark complete"}
                          onClick={() => toggleDoneTri(t)}
                        />
                        <div className="task-text" onClick={() => setSelId(t.id)}>
                          <div className={`task-title ${checked ? "done" : ""}`}>{t.title || "Untitled task"}</div>
                          <div className="task-meta">
                            <span className={overdue ? "overdue" : ""}>{fmtShort(t.dueMs)}</span>
                            {t.urgent && <span className="pill">U</span>}
                            {t.important && <span className="pill">I</span>}
                          </div>
                        </div>
                        <button className="task-x" aria-label="Delete task" onClick={() => del(t.id)}>×</button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* FAB add inside 480px layout (CSS positions within column) */}
      <button className="fab" aria-label="Add task" onClick={() => setAddOpen(true)}>＋</button>

      {/* ADD MODAL */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add task">
        <div className="tv-modal">
          <input
            ref={addTitleRef}
            className="tv-input"
            placeholder="Task title…"
            value={draftTitle}
            maxLength={50}
            onChange={e => setDraftTitle(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveAdd(); if (e.key === "Escape") setAddOpen(false); }}
          />
          <div className="tv-flags">
            <button className={`tv-flag ${draftU ? "on" : ""}`} onClick={() => setDraftU(v => !v)} aria-pressed={draftU} title="Urgent">U</button>
            <button className={`tv-flag ${draftI ? "on" : ""}`} onClick={() => setDraftI(v => !v)} aria-pressed={draftI} title="Important">I</button>
          </div>
          <div className="tv-datePicker">
            <DayPicker
              mode="single"
              weekStartsOn={1}
              selected={draftDate ? new Date(draftDate) : undefined}
              onSelect={d => { if (d) setDraftDate(toYmd(d)); }}
            />
            <div className="tv-dateMeta">Selected: {draftDate || "none"}</div>
          </div>
          <div className="tv-modalActions">
            <button className="tv-btn ghost" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="tv-btn" onClick={saveAdd} disabled={!draftTitle.trim()}>Save</button>
          </div>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      {sel && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit task">
          <form className="tv-modal" onSubmit={submitEdit}>
            <input
              className="tv-input"
              placeholder="Task title…"
              value={eTitle}
              maxLength={50}
              onChange={e => setETitle(e.target.value)}
              autoFocus
            />
            <div className="tv-flags">
              <button type="button" className={`tv-flag ${eU ? "on" : ""}`} onClick={() => setEU(v => !v)} aria-pressed={eU} title="Urgent">U</button>
              <button type="button" className={`tv-flag ${eI ? "on" : ""}`} onClick={() => setEI(v => !v)} aria-pressed={eI} title="Important">I</button>
            </div>
            <div className="tv-datePicker">
              <DayPicker
                mode="single"
                weekStartsOn={1}
                selected={eDate ? new Date(eDate) : undefined}
                onSelect={d => { setEDate(d ? toYmd(d) : ""); }}
              />
              <div className="tv-dateMeta">Selected: {eDate || "none"}</div>
            </div>
            <div className="tv-modalActions">
              <button type="button" className="tv-btn ghost" onClick={() => setEditOpen(false)}>Cancel</button>
              <button type="submit" className="tv-btn" disabled={!eTitle.trim()}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// src/components/ProjectTasksList.tsx
import React, { useMemo, useState } from "react";
import styles from "./ProjectTasksList.module.css";

import { Button } from "@/atoms/Button";
import { TaskListRow } from "@/components/TaskListRow";
import { SyncTaskDialog } from "@/components/SyncTaskDialog";
import { useProjects } from "@/stores/projects";
import { useTasks } from "@/stores/tasks";

type TaskState = "active" | "completed" | "deleted";
interface Task {
  id: string;
  text: string;
  date: number | null; // day-start ms local or null
  state: TaskState;
  flags?: { u?: boolean; i?: boolean };
}

type DateFilter = "all" | "dated" | "dateless";
type StatusFilter = "open" | "completed" | "all";

interface ProjectTasksListProps {
  projectId: string;
  /** Optional subproject name to prefilter. Must exactly match the stored string. */
  subproject?: string | null;
}

/**
 * ProjectTasksList
 * - Lists tasks belonging to a project by parsing the convention: "Project › Subproject: Body"
 * - Filter by subproject, date presence, and status
 * - Quick add: backlog or schedule via SyncTaskDialog
 */
export const ProjectTasksList: React.FC<ProjectTasksListProps> = ({
  projectId,
  subproject = null,
}) => {
  const projects = useProjects();
  const tasks = useTasks();
  const project = projects.get(projectId);

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [subFilter, setSubFilter] = useState<string | "ALL">(
    subproject ?? "ALL"
  );

  const [body, setBody] = useState("");
  const [selSub, setSelSub] = useState<string>(() => (subproject ?? (project?.subprojects?.[0] || "")));
  const [err, setErr] = useState<string | null>(null);
  const [openSync, setOpenSync] = useState(false);

  const projectName = project?.name ?? "";

  // Parse helpers
  const parseProjectTag = (t: Task) => {
    // Expect: "Project › Sub: Body" or "Project › Sub"
    const prefix = `${projectName} ›`;
    if (!t.text.startsWith(prefix)) return null;
    const rest = t.text.slice(prefix.length).trimStart();
    const colonIdx = rest.indexOf(":");
    const sub = colonIdx >= 0 ? rest.slice(0, colonIdx).trimEnd() : rest.trim();
    return { sub };
  };

  const all = useMemo<Task[]>(() => {
    // Pull everything and filter by project prefix.
    const list: Task[] = tasks.list();
    return list.filter((t) => t.state !== "deleted" && parseProjectTag(t));
  }, [tasks, projectName]);

  const subNames = useMemo<string[]>(() => {
    const set = new Set<string>();
    for (const t of all) {
      const tag = parseProjectTag(t);
      if (tag?.sub) set.add(tag.sub);
    }
    // Ensure configured subprojects appear even if empty
    for (const s of project?.subprojects ?? []) set.add(s);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [all, project?.subprojects]);

  const filtered = useMemo<Task[]>(() => {
    let items = all;

    if (subFilter !== "ALL") {
      items = items.filter((t) => parseProjectTag(t)?.sub === subFilter);
    }

    if (dateFilter === "dated") items = items.filter((t) => t.date != null);
    else if (dateFilter === "dateless") items = items.filter((t) => t.date == null);

    if (statusFilter === "open") items = items.filter((t) => t.state !== "completed");
    else if (statusFilter === "completed") items = items.filter((t) => t.state === "completed");

    // Sort: dated asc, then dateless, then alpha
    items = [...items].sort((a, b) => {
      const ad = a.date ?? Infinity;
      const bd = b.date ?? Infinity;
      if (ad !== bd) return ad - bd;
      return a.text.localeCompare(b.text);
    });

    return items;
  }, [all, subFilter, dateFilter, statusFilter]);

  if (!project) {
    return <div className={styles.missing}>Project not found.</div>;
  }

  const composedText = () => {
    const s = (selSub || "").trim();
    const b = body.trim();
    return b ? `${projectName} › ${s}: ${b}` : `${projectName} › ${s}`;
  };

  const addBacklog = () => {
    const text = composedText();
    if (!text.trim()) return;
    const res = tasks.add({ text, date: null });
    if (!res?.ok) setErr(res?.reason || "Could not add task.");
    else {
      setErr(null);
      setBody("");
    }
  };

  const scheduleConfirm = (payload: { date: number; u: boolean; i: boolean }) => {
    const text = composedText();
    if (!text.trim()) return;
    const res = tasks.add({
      text,
      date: payload.date,
      flags: { u: payload.u, i: payload.i },
    });
    if (!res?.ok) setErr(res?.reason || "Could not schedule task.");
    else {
      setErr(null);
      setBody("");
      setOpenSync(false);
    }
  };

  return (
    <div className={styles.wrap} aria-label="Project tasks">
      {/* Controls */}
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="Filters">
          <select
            className={styles.select}
            value={subFilter}
            onChange={(e) => setSubFilter(e.target.value as any)}
          >
            <option value="ALL">All subprojects</option>
            {subNames.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className={styles.select}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            aria-label="Date filter"
          >
            <option value="all">All</option>
            <option value="dated">Dated</option>
            <option value="dateless">Dateless</option>
          </select>

          <select
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="Status filter"
          >
            <option value="open">Open</option>
            <option value="completed">Completed</option>
            <option value="all">All</option>
          </select>
        </div>

        <div className={styles.count}>{filtered.length}</div>
      </div>

      {/* Quick add */}
      <div className={styles.addRow}>
        <select
          className={styles.select}
          value={selSub}
          onChange={(e) => setSelSub(e.target.value)}
        >
          {(project.subprojects ?? []).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="text"
          className={styles.input}
          placeholder="Task details"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addBacklog();
          }}
        />
        <Button variant="ghost" onClick={addBacklog}>
          Add to Backlog
        </Button>
        <Button variant="primary" onClick={() => setOpenSync(true)}>
          Add to Day
        </Button>
      </div>
      <div className={styles.preview}>{composedText()}</div>
      {err && (
        <div role="alert" className={styles.error}>
          {err}
        </div>
      )}

      {/* List */}
      <div className={styles.list} role="list">
        {filtered.map((t) => (
          <TaskListRow
            key={t.id}
            task={t}
            onSetDate={(id, date) => tasks.setDate(id, date)}
            onClearDate={(id) => tasks.setDate(id, null)}
            onDelete={(id) => tasks.deleteHard(id)}
            onEditText={(id, text) => tasks.setText(id, text)}
          />
        ))}
        {filtered.length === 0 && (
          <div className={styles.empty}>No matching tasks.</div>
        )}
      </div>

      {openSync && (
        <SyncTaskDialog
          initialDate={null}
          initialU={false}
          initialI={false}
          onConfirm={scheduleConfirm}
          onCancel={() => setOpenSync(false)}
        />
      )}
    </div>
  );
};

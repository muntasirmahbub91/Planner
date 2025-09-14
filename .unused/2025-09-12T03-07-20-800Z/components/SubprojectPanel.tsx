// src/components/SubprojectPanel.tsx
import React, { useMemo, useState } from "react";
import styles from "./SubprojectPanel.module.css";

import { TextInlineEdit } from "@/atoms/TextInlineEdit";
import { Button } from "@/atoms/Button";
import { SyncTaskDialog } from "@/components/SyncTaskDialog";
import { useProjects } from "@/stores/projects";
import { useTasks } from "@/stores/tasks";

interface SubprojectPanelProps {
  projectId: string;
  index: number; // subproject index in project.subprojects
  onClose: () => void;
}

/**
 * SubprojectPanel
 * - Rename or remove a subproject (string item in project.subprojects)
 * - Quick create: add backlog task or schedule a dated task via SyncTaskDialog
 *   Task text format: "Project › Subproject: {body}"
 */
export const SubprojectPanel: React.FC<SubprojectPanelProps> = ({
  projectId,
  index,
  onClose,
}) => {
  const projects = useProjects();
  const tasks = useTasks();

  const project = useMemo(() => projects.get(projectId) ?? null, [projects, projectId]);
  const subName = project?.subprojects?.[index] ?? null;

  const [err, setErr] = useState<string | null>(null);
  const [body, setBody] = useState<string>(""); // free-text body for task creation
  const [openSync, setOpenSync] = useState(false);

  if (!project || subName == null) {
    return (
      <div className={styles.missing}>
        Subproject not found.
        <div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const composed = (b: string) => {
    const p = (project.name || "").trim();
    const s = (subName || "").trim();
    const body = b.trim();
    return body ? `${p} › ${s}: ${body}` : `${p} › ${s}`;
  };

  const updateSub = (nextText: string) => {
    const arr = [...(project.subprojects ?? [])];
    arr[index] = nextText.trim();
    const res = projects.update(project.id, { subprojects: arr });
    if (res?.ok === false) setErr(res.reason || "Rename failed."); else setErr(null);
  };

  const removeSub = () => {
    if (!confirm("Remove this subproject?")) return;
    const arr = (project.subprojects ?? []).filter((_, i) => i !== index);
    const res = projects.update(project.id, { subprojects: arr });
    if (res?.ok === false) setErr(res.reason || "Remove failed.");
    else {
      setErr(null);
      onClose();
    }
  };

  const addBacklog = () => {
    const text = composed(body);
    if (!text.trim()) return;
    const res = tasks.add({ text, date: null });
    if (!res?.ok) setErr(res?.reason || "Could not add task."); else {
      setErr(null);
      setBody("");
    }
  };

  const handleSyncConfirm = (payload: { date: number; u: boolean; i: boolean }) => {
    const text = composed(body);
    if (!text.trim()) return;
    const res = tasks.add({
      text,
      date: payload.date,
      flags: { u: payload.u, i: payload.i },
    });
    if (!res?.ok) setErr(res?.reason || "Could not schedule task."); else {
      setErr(null);
      setBody("");
      setOpenSync(false);
    }
  };

  return (
    <div className={styles.panel} aria-label="Subproject panel">
      <header className={styles.header}>
        <TextInlineEdit
          value={subName}
          onCommit={updateSub}
          className={styles.title}
        />
        <div className={styles.hActions}>
          <Button variant="ghost" onClick={removeSub} aria-label="Remove subproject">
            Remove
          </Button>
          <Button variant="ghost" onClick={onClose} aria-label="Close panel">
            Close
          </Button>
        </div>
      </header>

      {err && (
        <div role="alert" className={styles.error}>
          {err}
        </div>
      )}

      <section className={styles.block} aria-label="Plan a task">
        <div className={styles.label}>Plan</div>
        <div className={styles.plan}>
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Task details"
            className={styles.input}
            onKeyDown={(e) => {
              if (e.key === "Enter") addBacklog();
            }}
          />
          <div className={styles.actions}>
            <Button variant="ghost" onClick={addBacklog}>Add to Backlog</Button>
            <Button variant="primary" onClick={() => setOpenSync(true)}>
              Add to Day
            </Button>
          </div>
          <div className={styles.preview} aria-label="Task preview">
            {composed(body)}
          </div>
        </div>
      </section>

      {openSync && (
        <SyncTaskDialog
          initialDate={null}
          initialU={false}
          initialI={false}
          onConfirm={handleSyncConfirm}
          onCancel={() => setOpenSync(false)}
        />
      )}
    </div>
  );
};
w
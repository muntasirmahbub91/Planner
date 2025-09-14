// src/components/ProjectCard.tsx
import React, { useMemo, useState } from "react";
import styles from "./ProjectCard.module.css";

import TextInlineEdit from "@/atoms/TextInlineEdit";
import { Button } from "@/atoms/Button";
import { useProjects } from "@/stores/projects";

interface Project {
  id: string;
  name: string;
  active: boolean;
  subprojects: string[];
}

interface ProjectCardProps {
  projectId: string;
  onClose: () => void;
}

/**
 * ProjectCard
 * - Title inline-editable
 * - Archive/Unarchive, Delete, Close
 * - Subprojects list with add/edit/remove
 * Store enforces “≤3 active projects”.
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({ projectId, onClose }) => {
  const projects = useProjects();
  const project = useMemo<Project | null>(() => projects.get(projectId) ?? null, [projects, projectId]);

  const [err, setErr] = useState<string | null>(null);
  const [newSub, setNewSub] = useState("");

  if (!project) {
    return (
      <div className={styles.missing}>
        Project not found.
        <div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const update = (patch: Partial<Project>) => {
    const res = projects.update(project.id, patch);
    if (res?.ok === false) {
      setErr(res.reason || "Update failed.");
    } else {
      setErr(null);
    }
  };

  const archiveToggle = () => {
    const res = project.active ? projects.archive(project.id) : projects.unarchive(project.id);
    if (res?.ok === false) setErr(res.reason || "Operation failed.");
    else setErr(null);
  };

  const remove = () => {
    if (confirm("Delete this project? This cannot be undone.")) {
      projects.delete(project.id);
      onClose();
    }
  };

  const addSub = () => {
    const v = newSub.trim();
    if (!v) return;
    update({ subprojects: [...(project.subprojects ?? []), v] });
    setNewSub("");
  };

  const editSub = (idx: number, text: string) => {
    const next = [...(project.subprojects ?? [])];
    next[idx] = text;
    update({ subprojects: next });
  };

  const removeSub = (idx: number) => {
    const next = (project.subprojects ?? []).filter((_, i) => i !== idx);
    update({ subprojects: next });
  };

  return (
    <div className={styles.card} aria-label="Project details">
      <header className={styles.header}>
        <TextInlineEdit
          value={project.name}
          onCommit={(t) => update({ name: t })}
          className={styles.title}
        />

        <div className={styles.hActions}>
          <Button
            variant={project.active ? "ghost" : "primary"}
            onClick={archiveToggle}
            aria-label={project.active ? "Archive project" : "Unarchive project"}
          >
            {project.active ? "Archive" : "Unarchive"}
          </Button>
          <Button variant="ghost" onClick={remove} aria-label="Delete project">
            ✕
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

      <section className={styles.block} aria-label="Status">
        <div className={styles.label}>Status</div>
        <div className={styles.value}>{project.active ? "Active" : "Archived"}</div>
      </section>

      <section className={styles.block} aria-label="Subprojects">
        <div className={styles.label}>Subprojects</div>

        {(project.subprojects?.length ?? 0) === 0 && (
          <div className={styles.empty}>No subprojects yet.</div>
        )}

        <div className={styles.subList}>
          {(project.subprojects ?? []).map((sp, idx) => (
            <div key={idx} className={styles.subRow}>
              <TextInlineEdit
                value={sp}
                onCommit={(t) => editSub(idx, t)}
                className={styles.subText}
              />
              <Button
                variant="ghost"
                className={styles.subRemove}
                aria-label="Remove subproject"
                onClick={() => removeSub(idx)}
              >
                ✕
              </Button>
            </div>
          ))}
        </div>

        <div className={styles.addRow}>
          <input
            type="text"
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            placeholder="New subproject"
            className={styles.input}
            onKeyDown={(e) => {
              if (e.key === "Enter") addSub();
            }}
          />
          <Button variant="ghost" onClick={addSub}>
            + Add
          </Button>
        </div>
      </section>
    </div>
  );
};

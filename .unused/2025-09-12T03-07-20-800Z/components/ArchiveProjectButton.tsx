// src/components/ArchiveProjectButton.tsx
import React, { useMemo, useState } from "react";
import styles from "./ArchiveProjectButton.module.css";

import { Button } from "@/atoms/Button";
import { useProjects } from "@/stores/projects";

interface ArchiveProjectButtonProps {
  projectId: string;
  /** If true, renders only an icon-like label */
  compact?: boolean;
  /** Called after a successful toggle */
  onDone?: (state: "archived" | "unarchived") => void;
  /** Called with error text on failure */
  onError?: (message: string) => void;
}

export const ArchiveProjectButton: React.FC<ArchiveProjectButtonProps> = ({
  projectId,
  compact = false,
  onDone,
  onError,
}) => {
  const projects = useProjects();
  const project = useMemo(() => projects.get(projectId) ?? null, [projects, projectId]);
  const [err, setErr] = useState<string | null>(null);

  if (!project) {
    return (
      <div className={styles.wrap}>
        <Button variant="ghost" disabled aria-label="Project missing">
          Archive
        </Button>
        <span className={styles.err}>Project not found.</span>
      </div>
    );
  }

  const doToggle = () => {
    const res = project.active ? projects.archive(project.id) : projects.unarchive(project.id);
    if (res?.ok === false) {
      const msg =
        res.reason === "limit"
          ? "Limit reached: at most 3 active projects."
          : res.reason || "Operation failed.";
      setErr(msg);
      onError?.(msg);
      return;
    }
    setErr(null);
    onDone?.(project.active ? "archived" : "unarchived");
  };

  const label = project.active ? (compact ? "Archive" : "Archive") : compact ? "Unarchive" : "Unarchive";

  return (
    <div className={styles.wrap} title={err || ""}>
      <Button
        variant={project.active ? "ghost" : "primary"}
        onClick={doToggle}
        aria-label={project.active ? "Archive project" : "Unarchive project"}
      >
        {label}
      </Button>
      {err && <span role="alert" className={styles.err}>{err}</span>}
    </div>
  );
};

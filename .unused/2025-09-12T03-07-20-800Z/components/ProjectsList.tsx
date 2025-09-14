// src/components/ProjectsList.tsx
import React, { useMemo, useState } from "react";
import styles from "./ProjectsList.module.css";

import { Button } from "@/atoms/Button";
import { useProjects } from "@/stores/projects";

type Filter = "active" | "archived";

interface ProjectsListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface Project {
  id: string;
  name: string;
  active: boolean;
  subprojects?: string[];
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  selectedId,
  onSelect,
}) => {
  const projects = useProjects();
  const [filter, setFilter] = useState<Filter>("active");

  const items = useMemo<Project[]>(() => {
    // Store contract: list(filter) → Project[]
    return projects.list(filter);
  }, [projects, filter]);

  const archive = (id: string) => {
    if (filter === "active") projects.archive(id);
  };

  const unarchive = (id: string) => {
    if (filter === "archived") projects.unarchive(id);
  };

  const remove = (id: string) => {
    if (confirm("Delete this project?")) projects.delete(id);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div role="radiogroup" aria-label="Project status">
          <Button
            role="radio"
            aria-checked={filter === "active"}
            variant={filter === "active" ? "primary" : "ghost"}
            className={styles.tab}
            onClick={() => setFilter("active")}
          >
            Active
          </Button>
          <Button
            role="radio"
            aria-checked={filter === "archived"}
            variant={filter === "archived" ? "primary" : "ghost"}
            className={styles.tab}
            onClick={() => setFilter("archived")}
          >
            Archived
          </Button>
        </div>
        <div className={styles.count}>{items.length}</div>
      </div>

      <div className={styles.list} role="list" aria-label={`${filter} projects`}>
        {items.map((p) => {
          const subCount = p.subprojects?.length ?? 0;
          const isSel = p.id === selectedId;
          return (
            <div
              key={p.id}
              role="listitem"
              className={`${styles.row} ${isSel ? styles.selected : ""}`}
              onClick={() => onSelect(p.id)}
            >
              <div className={styles.main}>
                <div className={styles.name} title={p.name}>
                  {p.name}
                </div>
                {subCount > 0 && (
                  <span className={styles.badge} aria-label="Subproject count">
                    {subCount}
                  </span>
                )}
              </div>

              <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                {filter === "active" ? (
                  <Button
                    variant="ghost"
                    aria-label="Archive project"
                    onClick={() => archive(p.id)}
                  >
                    Archive
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    aria-label="Unarchive project"
                    onClick={() => unarchive(p.id)}
                  >
                    Unarchive
                  </Button>
                )}
                <Button
                  variant="ghost"
                  aria-label="Delete project"
                  className={styles.delete}
                  onClick={() => remove(p.id)}
                >
                  ✕
                </Button>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className={styles.empty}>
            {filter === "active" ? "No active projects." : "No archived projects."}
          </div>
        )}
      </div>
    </div>
  );
};

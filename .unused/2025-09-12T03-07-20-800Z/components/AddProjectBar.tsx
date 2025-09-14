// src/components/AddProjectBar.tsx
import React, { useMemo, useState } from "react";
import styles from "./AddProjectBar.module.css";

import { Button } from "@/atoms/Button";
import { ProjectModal } from "@/components/ProjectModal";
import { useProjects } from "@/stores/projects";

type CreatePayload = {
  name: string;
  subprojects: string[];
  active: boolean;
};

export const AddProjectBar: React.FC = () => {
  const projects = useProjects();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const initial = useMemo(
    () => ({
      name: "",
      subprojects: [] as string[],
      active: false,
    }),
    []
  );

  const handleCreate = (payload: CreatePayload) => {
    const res = projects.add({
      name: payload.name.trim(),
      subprojects: payload.subprojects,
      active: payload.active,
    });
    if (!res?.ok) {
      setErr(
        res?.reason === "limit"
          ? "You can have at most 3 active projects."
          : res?.reason || "Unable to create project."
      );
      return;
    }
    setErr(null);
    setOpen(false);
  };

  return (
    <div className={styles.bar}>
      <div className={styles.spacer} />
      <Button variant="primary" onClick={() => setOpen(true)}>
        New Project
      </Button>
      {err && (
        <span role="alert" className={styles.error}>
          {err}
        </span>
      )}

      {open && (
        <ProjectModal
          open
          mode="add"
          initial={initial}
          onCancel={() => {
            setErr(null);
            setOpen(false);
          }}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
};

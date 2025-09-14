// src/components/ProjectModal.tsx
import React, { useMemo, useState } from "react";
import styles from "./ProjectModal.module.css";

import Modal from "@/atoms/Modal";
import { Button } from "@/atoms/Button";

type Mode = "add" | "edit";

interface ProjectModalProps {
  open: boolean;
  mode: Mode;
  initial: {
    name: string;
    subprojects: string[];
    active: boolean;
  };
  onCancel: () => void;
  onSubmit: (payload: { name: string; subprojects: string[]; active: boolean }) => void;
}

/**
 * ProjectModal
 * Fields:
 * - Name (required)
 * - Active toggle
 * - Subprojects [+] with add/remove rows
 */
export const ProjectModal: React.FC<ProjectModalProps> = ({
  open,
  mode,
  initial,
  onCancel,
  onSubmit,
}) => {
  const [name, setName] = useState<string>(initial.name ?? "");
  const [active, setActive] = useState<boolean>(!!initial.active);
  const [subs, setSubs] = useState<string[]>(
    Array.isArray(initial.subprojects) ? [...initial.subprojects] : []
  );
  const [err, setErr] = useState<string | null>(null);

  const canSave = useMemo(() => name.trim().length > 0, [name]);

  const addRow = () => setSubs((s) => [...s, ""]);
  const removeRow = (idx: number) => setSubs((s) => s.filter((_, i) => i !== idx));
  const setRow = (idx: number, val: string) =>
    setSubs((s) => s.map((v, i) => (i === idx ? val : v)));

  const submit = () => {
    if (!canSave) {
      setErr("Project name is required.");
      return;
    }
    const cleaned = subs.map((s) => s.trim()).filter((s) => s.length > 0);
    onSubmit({ name: name.trim(), subprojects: cleaned, active });
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === "add" ? "New Project" : "Edit Project"}
    >
      <div className={styles.body}>
        <label className={styles.field}>
          <span className={styles.label}>Project name</span>
          <input
            type="text"
            className={styles.input}
            placeholder="Project name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (err) setErr(null);
            }}
          />
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span>Active</span>
        </label>

        <div className={styles.sublist}>
          <div className={styles.subhdr}>Subprojects</div>
          {subs.length === 0 && (
            <div className={styles.subempty}>No subprojects yet.</div>
          )}
          {subs.map((val, idx) => (
            <div key={idx} className={styles.subrow}>
              <input
                type="text"
                className={styles.subinput}
                placeholder={`Subproject ${idx + 1}`}
                value={val}
                onChange={(e) => setRow(idx, e.target.value)}
              />
              <Button
                variant="ghost"
                className={styles.remove}
                aria-label="Remove subproject"
                onClick={() => removeRow(idx)}
              >
                ✕
              </Button>
            </div>
          ))}

          <Button variant="ghost" onClick={addRow} className={styles.addRow}>
            + Add subproject
          </Button>
        </div>

        {err && <div className={styles.error}>{err}</div>}

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!canSave} onClick={submit}>
            {mode === "add" ? "Create" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

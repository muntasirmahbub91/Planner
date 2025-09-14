// src/components/EisenhowerQuadrant.tsx
import React, { useMemo, useRef, useState } from "react";
import styles from "./EisenhowerQuadrant.module.css";
import { Button } from "@/atoms/Button";

type TaskState = "active" | "completed" | "deleted";
interface Task {
  id: string;
  text: string;
  date: number | null;
  state: TaskState;
  flags?: { u?: boolean; i?: boolean };
}

export type Quadrant = "ui" | "u" | "i" | "none";

interface EisenhowerQuadrantProps {
  quadrant: Quadrant;
  tasks: Task[];
  onReorder: (orderedIds: string[]) => void;
  onMoveAcross: (taskId: string, to: Quadrant, nextOrderIdsInDest: string[]) => void;
  onSyncRequest: (taskId: string) => void;
}

/**
 * EisenhowerQuadrant
 * - Renders a draggable list for one quadrant.
 * - Reorder within quadrant via HTML5 DnD.
 * - Drop onto the quadrant from another quadrant to move across.
 * - “Sync to Day” per task.
 */
export const EisenhowerQuadrant: React.FC<EisenhowerQuadrantProps> = ({
  quadrant,
  tasks,
  onReorder,
  onMoveAcross,
  onSyncRequest,
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const localOrder = useMemo(() => tasks.map((t) => t.id), [tasks]);

  // Hold a mutable draft order during drag-over to show insertion marker
  const draftOrderRef = useRef<string[]>(localOrder);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData("text/plain", JSON.stringify({ id, from: quadrant }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, overId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const payloadTxt = e.dataTransfer.getData("text/plain");
    if (!payloadTxt) return;

    const payload = safeParse(payloadTxt) as { id: string; from: Quadrant } | null;
    if (!payload) return;

    // Build a draft order for visual placement
    const current = tasks.map((t) => t.id).filter(Boolean);
    const withoutDragged = current.filter((x) => x !== payload.id);
    const idx = overId ? withoutDragged.indexOf(overId) : withoutDragged.length;
    withoutDragged.splice(idx < 0 ? withoutDragged.length : idx, 0, payload.id);
    draftOrderRef.current = withoutDragged;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const payloadTxt = e.dataTransfer.getData("text/plain");
    const payload = safeParse(payloadTxt) as { id: string; from: Quadrant } | null;
    if (!payload) return;

    const nextIds = draftOrderRef.current.length
      ? draftOrderRef.current
      : tasks.map((t) => t.id);

    if (payload.from === quadrant) {
      // Reorder within same quadrant
      onReorder(nextIds);
    } else {
      // Move across quadrants
      onMoveAcross(payload.id, quadrant, nextIds);
    }
    setDraggingId(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    draftOrderRef.current = localOrder;
  };

  const onKeyReorder = (id: string, dir: -1 | 1) => {
    const arr = tasks.map((t) => t.id);
    const i = arr.indexOf(id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onReorder(arr);
  };

  const renderList = () => {
    const order =
      draggingId && draftOrderRef.current.length ? draftOrderRef.current : localOrder;

    return order.map((id) => {
      const t = tasks.find((x) => x.id === id);
      if (!t) return null;

      return (
        <div
          key={t.id}
          className={`${styles.item} ${draggingId === t.id ? styles.dragging : ""}`}
          draggable
          onDragStart={(e) => handleDragStart(e, t.id)}
          onDragOver={(e) => handleDragOver(e, t.id)}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
        >
          <div className={styles.handle} aria-hidden="true">⋮⋮</div>
          <div className={styles.text} title={t.text}>
            {t.text}
          </div>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.kbd}
              aria-label="Move up"
              onClick={() => onKeyReorder(t.id, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.kbd}
              aria-label="Move down"
              onClick={() => onKeyReorder(t.id, 1)}
            >
              ↓
            </button>
            <Button
              variant="ghost"
              aria-label="Sync to Day"
              onClick={() => onSyncRequest(t.id)}
            >
              Sync
            </Button>
          </div>
        </div>
      );
    });
  };

  return (
    <div
      className={styles.quadrant}
      onDragOver={(e) => handleDragOver(e)}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      aria-label={`Quadrant ${quadrant}`}
    >
      {tasks.length === 0 && (
        <div className={styles.empty} onDragOver={(e) => handleDragOver(e)}>
          Drop tasks here
        </div>
      )}
      {renderList()}
    </div>
  );
};

function safeParse(x: string) {
  try {
    return JSON.parse(x);
  } catch {
    return null;
  }
}

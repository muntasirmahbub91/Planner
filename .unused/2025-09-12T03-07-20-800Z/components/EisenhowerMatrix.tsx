// src/components/EisenhowerMatrix.tsx
import React, { useMemo, useState } from "react";
import styles from "./EisenhowerMatrix.module.css";

import { EisenhowerQuadrant } from "@/components/EisenhowerQuadrant";
import { SyncTaskDialog } from "@/components/SyncTaskDialog";
import { useTasks } from "@/stores/tasks";

type TaskState = "active" | "completed" | "deleted";
interface Task {
  id: string;
  text: string;
  date: number | null; // backlog if null
  state: TaskState;
  flags?: { u?: boolean; i?: boolean };
}

/**
 * EisenhowerMatrix
 * - Groups BACKLOG tasks (date=null) into 4 quadrants by U/I flags
 * - Drag within/across quadrants updates order and flags
 * - “Sync to Day” opens dialog that schedules a copy to a specific date (cap enforced upstream)
 */
export const EisenhowerMatrix: React.FC = () => {
  const tasks = useTasks();

  // Backlog only per spec
  const backlog = useMemo<Task[]>(
    () =>
      tasks
        .list() // assume store returns all; TaskList already uses list(filters)
        .filter((t: Task) => t.state !== "deleted" && t.date == null),
    [tasks]
  );

  const q = useMemo(() => {
    const ui: Task[] = [];
    const u: Task[] = [];
    const i: Task[] = [];
    const none: Task[] = [];
    for (const t of backlog) {
      const uFlag = !!t.flags?.u;
      const iFlag = !!t.flags?.i;
      if (uFlag && iFlag) ui.push(t);
      else if (uFlag && !iFlag) u.push(t);
      else if (!uFlag && iFlag) i.push(t);
      else none.push(t);
    }
    return { ui, u, i, none };
  }, [backlog]);

  // Sync to Day dialog
  const [syncId, setSyncId] = useState<string | null>(null);
  const syncTask = useMemo(
    () => backlog.find((t) => t.id === syncId) || null,
    [syncId, backlog]
  );

  const handleReorder = (quadrant: "ui" | "u" | "i" | "none", orderedIds: string[]) => {
    tasks.reorderInQuadrant(quadrant, orderedIds);
  };

  const handleMoveAcross = (
    taskId: string,
    from: "ui" | "u" | "i" | "none",
    to: "ui" | "u" | "i" | "none",
    nextOrderIdsInDest: string[]
  ) => {
    // Update flags based on target quadrant
    const nextFlags =
      to === "ui"
        ? { u: true, i: true }
        : to === "u"
        ? { u: true, i: false }
        : to === "i"
        ? { u: false, i: true }
        : { u: false, i: false };
    tasks.setFlags(taskId, nextFlags);
    tasks.reorderInQuadrant(to, nextOrderIdsInDest);
  };

  const handleSyncConfirm = (payload: {
    date: number;
    u: boolean;
    i: boolean;
  }) => {
    if (!syncTask) return;
    tasks.add({
      text: syncTask.text,
      date: payload.date,
      flags: { u: payload.u, i: payload.i },
    }); // store enforces 3-per-day cap with replace/block
    setSyncId(null);
  };

  return (
    <div className={styles.matrix}>
      <div className={styles.cell}>
        <header className={styles.hdr}>Urgent + Important</header>
        <EisenhowerQuadrant
          quadrant="ui"
          tasks={q.ui}
          onReorder={(ids) => handleReorder("ui", ids)}
          onMoveAcross={(id, to, ids) => handleMoveAcross(id, "ui", to, ids)}
          onSyncRequest={(id) => setSyncId(id)}
        />
      </div>

      <div className={styles.cell}>
        <header className={styles.hdr}>Urgent + Not Important</header>
        <EisenhowerQuadrant
          quadrant="u"
          tasks={q.u}
          onReorder={(ids) => handleReorder("u", ids)}
          onMoveAcross={(id, to, ids) => handleMoveAcross(id, "u", to, ids)}
          onSyncRequest={(id) => setSyncId(id)}
        />
      </div>

      <div className={styles.cell}>
        <header className={styles.hdr}>Not Urgent + Important</header>
        <EisenhowerQuadrant
          quadrant="i"
          tasks={q.i}
          onReorder={(ids) => handleReorder("i", ids)}
          onMoveAcross={(id, to, ids) => handleMoveAcross(id, "i", to, ids)}
          onSyncRequest={(id) => setSyncId(id)}
        />
      </div>

      <div className={styles.cell}>
        <header className={styles.hdr}>Not Urgent + Not Important</header>
        <EisenhowerQuadrant
          quadrant="none"
          tasks={q.none}
          onReorder={(ids) => handleReorder("none", ids)}
          onMoveAcross={(id, to, ids) => handleMoveAcross(id, "none", to, ids)}
          onSyncRequest={(id) => setSyncId(id)}
        />
      </div>

      {syncTask && (
        <SyncTaskDialog
          initialDate={null}
          initialU={!!syncTask.flags?.u}
          initialI={!!syncTask.flags?.i}
          onConfirm={handleSyncConfirm}
          onCancel={() => setSyncId(null)}
        />
      )}
    </div>
  );
};

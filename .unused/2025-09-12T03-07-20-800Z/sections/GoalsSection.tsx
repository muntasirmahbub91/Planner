// src/sections/GoalsSection.tsx
// Weekly goals list for the given weekStartMs (local week anchor).
// Uses goals store APIs. Inline add, rename, complete, archive/remove.

import React, { useMemo, useState } from "react";
import TextInlineEdit from "@/atoms/TextInlineEdit";
import { Button } from "@/atoms/Button";
import {
  goalsStore,
  listForWeek,
  addGoal,
  renameGoal,
  markComplete,
  markIncomplete,
  archiveGoal,
  removeGoal
} from "@/stores/goals";

type Props = {
  weekStartMs: number; // local midnight of week start
};

export default function GoalsSection({ weekStartMs }: Props) {
  // subscribe for live updates
  goalsStore.use();

  const goals = useMemo(() => listForWeek(weekStartMs), [weekStartMs, goalsStore.get()]);
  const [draft, setDraft] = useState("");

  const onAdd = () => {
    const t = draft.trim();
    if (!t) return;
    addGoal({ title: t, dateMs: weekStartMs });
    setDraft("");
  };

  return (
    <div className="section section-goals">
      {/* Inline adder */}
      <div className="flex items-center gap-12 mb-12">
        <input
          className="input"
          placeholder="New weekly goal…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
          aria-label="New weekly goal"
        />
        <Button label="Add" variant="accent" onClick={onAdd} />
      </div>

      {/* List */}
      <ul className="list">
        {goals.map((g) => (
          <li key={g.id} className="flex items-center justify-between gap-12">
            <label className="flex items-center gap-12">
              <input
                type="checkbox"
                checked={!!g.completed}
                onChange={(e) => (e.target.checked ? markComplete(g.id) : markIncomplete(g.id))}
                aria-label={g.completed ? "Mark incomplete" : "Mark complete"}
              />
              <TextInlineEdit
                value={g.title}
                placeholder="Goal title…"
                onChange={(t) => renameGoal(g.id, t)}
              />
            </label>

            <div className="flex items-center gap-8">
              <Button
                size="sm"
                variant="ghost"
                label="Archive"
                onClick={() => archiveGoal(g.id)}
                title="Archive goal"
              />
              <Button
                size="sm"
                variant="danger"
                label="Delete"
                onClick={() => removeGoal(g.id)}
                title="Delete goal"
              />
            </div>
          </li>
        ))}
        {goals.length === 0 && <li className="notice notice--info">No goals yet.</li>}
      </ul>
    </div>
  );
}

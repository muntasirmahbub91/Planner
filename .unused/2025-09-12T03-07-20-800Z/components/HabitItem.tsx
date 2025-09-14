// src/components/HabitItem.tsx
import React, { useEffect, useMemo, useState } from "react";
import ToggleButton from "@/components/ToggleButton";
import cls from "./HabitItem.module.css";

export type Habit = { id: string; name: string };

type Props = {
  habit: Habit;
  log: boolean[]; // length 7, Mon..Sun
  onRename: (name: string) => void;
  onToggle: (dayIdx: number, next: boolean) => void;
  onRemove: () => void;
};

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function HabitItem({ habit, log, onRename, onToggle, onRemove }: Props) {
  const [name, setName] = useState(habit.name);
  const [confirming, setConfirming] = useState(false);
  const idx = useMemo(() => Array.from({ length: 7 }, (_, i) => i), []);

  useEffect(() => setName(habit.name), [habit.name]);

  const commitRename = () => {
    const n = name.trim();
    if (n && n !== habit.name) onRename(n);
  };

  return (
    <div className={cls.row}>
      <div className={cls.nameBox}>
        <input
          className={cls.nameInput}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
          aria-label="Habit name"
        />
        {!confirming ? (
          <button className={cls.removeBtn} aria-label="Remove habit" onClick={() => setConfirming(true)}>×</button>
        ) : (
          <div className={cls.confirmBar} role="alert">
            <button className={cls.confirm} onClick={onRemove} aria-label="Confirm remove">Remove</button>
            <button className={cls.cancel} onClick={() => setConfirming(false)} aria-label="Cancel remove">Cancel</button>
          </div>
        )}
      </div>

      {idx.map((i) => (
        <ToggleButton
          key={i}
          ariaLabel={`Toggle ${DAYS[i]}`}
          className={cls.toggle}
          pressed={!!log[i]}
          onChange={(next) => onToggle(i, next)}
        />
      ))}
    </div>
  );
}

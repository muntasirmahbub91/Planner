// src/sections/HabitList.tsx
import React from "react";
import HabitItem, { Habit } from "@/components/HabitItem";
import styles from "./HabitsList.module.css";

type GetLog = (id: string, weekStartMs: number) => boolean[] | undefined;

type Props = {
  habits: Habit[];
  weekStartMs: number;
  getLog: GetLog;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string, dayIdx: number, next: boolean) => void;
};

export default function HabitList({
  habits,
  weekStartMs,
  getLog,
  onRename,
  onRemove,
  onToggle,
}: Props) {
  return (
    <div className={styles.list}>
      {habits.map(h => {
        const log = getLog(h.id, weekStartMs) ?? Array(7).fill(false);
        return (
          <HabitItem
            key={h.id}
            habit={h}
            log={log}
            onRename={(nn) => onRename(h.id, nn)}
            onToggle={(dayIdx, next) => onToggle(h.id, dayIdx, next)}
            onRemove={() => onRemove(h.id)}
          />
        );
      })}
    </div>
  );
}

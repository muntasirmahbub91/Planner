import React, { PropsWithChildren, useMemo } from "react";
import styles from "./DayCard.module.css";

type DayCardProps = PropsWithChildren<{
  dateMs: number;
  title?: string;
  compact?: boolean;
}>;

export default function DayCard({ dateMs, title, compact = false, children }: DayCardProps) {
  const d = useMemo(() => new Date(dateMs), [dateMs]);
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  const pretty = d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  return (
    <section className={compact ? styles.cardCompact : styles.card} data-date-ms={dateMs}>
      <header className={styles.header}>
        <div className={styles.title}>
          <span className={styles.weekday}>{weekday}</span>
          <span className={styles.date}>{pretty}</span>
        </div>
        {title ? <span className={styles.slotTitle}>{title}</span> : null}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

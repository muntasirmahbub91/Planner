// src/components/Tabs.tsx
import React from "react";
import styles from "./Tabs.module.css";

interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  active: string;
  items: TabItem[];
  onChange: (id: string) => void;
}

/**
 * Tabs
 * - Stateless tab bar
 * - Highlights active tab
 * - Keyboard accessible (left/right to move)
 */
export const Tabs: React.FC<TabsProps> = ({ active, items, onChange }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, idx: number) => {
    if (e.key === "ArrowRight") {
      const next = items[(idx + 1) % items.length];
      onChange(next.id);
    } else if (e.key === "ArrowLeft") {
      const prev = items[(idx - 1 + items.length) % items.length];
      onChange(prev.id);
    }
  };

  return (
    <div className={styles.row} role="tablist">
      {items.map((item, idx) => (
        <button
          key={item.id}
          role="tab"
          aria-selected={active === item.id}
          className={`${styles.tab} ${active === item.id ? styles.active : ""}`}
          onClick={() => onChange(item.id)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

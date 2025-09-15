// src/components/lists/ListCard.tsx
import { useMemo, useRef, useState } from "react";
import styles from "./ListCard.module.css";
import { Checklist, ChecklistItem, useLists } from "../../stores/listsStore";

type Props = { list: Checklist };

export default function ListCard({ list }: Props) {
  const {
    addItem,
    removeItem,
    toggleItem,
    editItem,
    renameList,
    deleteList,
    clearCompleted,
    reorderItem, // NEW
  } = useLists();

  const [titleEdit, setTitleEdit] = useState(false);
  const [titleVal, setTitleVal] = useState(list.title);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const addRef = useRef<HTMLInputElement>(null);

  // DnD state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overPos, setOverPos] = useState<"before" | "after">("before");

  const { undone, done } = useMemo(() => {
    const u: ChecklistItem[] = [];
    const d: ChecklistItem[] = [];
    for (const it of list.items) (it.done ? d : u).push(it);
    return { undone: u, done: d };
  }, [list.items]);

  function handleAdd() {
    const t = draft.trim();
    if (!t) return;
    addItem(list.id, t);
    setDraft("");
    addRef.current?.focus();
  }

  function startEditItem(it: ChecklistItem) {
    setEditingId(it.id);
    setEditVal(it.text);
  }

  function commitEditItem() {
    if (!editingId) return;
    const t = editVal.trim();
    if (t) editItem(list.id, editingId, t);
    setEditingId(null);
    setEditVal("");
  }

  function commitTitle() {
    const t = titleVal.trim();
    if (t && t !== list.title) renameList(list.id, t);
    setTitleEdit(false);
  }

  // ----- Drag & Drop -----
  function onDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id); // Firefox requires data
  }
  function onDragOver(e: React.DragEvent, id: string) {
    if (!draggingId || draggingId === id) return;
    e.preventDefault(); // allow drop
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    setOverId(id);
    setOverPos(e.clientY < mid ? "before" : "after");
  }
  function onDrop(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (draggingId && overId) reorderItem(list.id, draggingId, overId, overPos);
    setDraggingId(null);
    setOverId(null);
  }
  function onDragEnd() {
    setDraggingId(null);
    setOverId(null);
  }

  const renderRow = (it: ChecklistItem) => {
    const isEditing = editingId === it.id;
    const isDragging = draggingId === it.id;
    const isOver = overId === it.id;
    const dropCls = isOver ? (overPos === "before" ? styles.dropBefore : styles.dropAfter) : "";

    return (
      <div
        key={it.id}
        className={`${styles.itemRow} ${isDragging ? styles.dragging : ""} ${dropCls}`.trim()}
        draggable={!isEditing}
        onDragStart={(e) => onDragStart(e, it.id)}
        onDragOver={(e) => onDragOver(e, it.id)}
        onDrop={(e) => onDrop(e, it.id)}
        onDragEnd={onDragEnd}
      >
        <span className={styles.dragHandle} aria-label="Drag to reorder" title="Drag to reorder">≡</span>

        <input
          className={styles.cb}
          type="checkbox"
          checked={it.done}
          onChange={() => toggleItem(list.id, it.id)}
          aria-label={it.text}
        />

        {isEditing ? (
          <input
            className={styles.itemInput}
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEditItem();
              if (e.key === "Escape") { setEditingId(null); setEditVal(""); }
            }}
            onBlur={commitEditItem}
            autoFocus
          />
        ) : (
          <div
            className={`${styles.itemText} ${it.done ? styles.itemTextDone : ""}`.trim()}
            onDoubleClick={() => startEditItem(it)}
            title="Double-click to edit"
          >
            {it.text}
          </div>
        )}

        <button
          className={styles.smallBtn}
          onClick={() => (isEditing ? commitEditItem() : startEditItem(it))}
          aria-label="Edit"
          title="Edit"
        >
          ✎
        </button>
        <button
          className={styles.smallBtn}
          onClick={() => removeItem(list.id, it.id)}
          aria-label="Remove"
          title="Remove"
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <div className={styles.card} data-list-id={list.id}>
      {/* Title row */}
      <div className={styles.titleRow}>
        {titleEdit ? (
          <input
            className={styles.titleInput}
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setTitleVal(list.title); setTitleEdit(false); }
            }}
            onBlur={commitTitle}
            autoFocus
          />
        ) : (
          <div className={styles.title} title={list.title}>{list.title}</div>
        )}
        <button
          className={styles.iconBtn}
          aria-label="Rename list"
          onClick={() => setTitleEdit((v) => !v)}
          title="Rename"
        >
          ✎
        </button>
        <button
          className={styles.iconBtn}
          aria-label="Delete list"
          onClick={() => deleteList(list.id)}
          title="Delete"
        >
          🗑
        </button>
      </div>

      <div className={styles.sep} />

      {/* Add row */}
      <div className={styles.addRow}>
        <input
          ref={addRef}
          className={styles.addInput}
          placeholder="Add item"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
            if (e.key === "Escape") setDraft("");
          }}
        />
        <button className={styles.addBtn} onClick={handleAdd} disabled={!draft.trim()}>
          Add
        </button>
      </div>

      {/* Items */}
      <div className={styles.items}>
        {[...undone, ...done].map(renderRow)}
      </div>

      {/* Footer */}
      <div className={styles.footerRow}>
        <button className={styles.clearBtn} onClick={() => clearCompleted(list.id)}>
          Clear completed
        </button>
      </div>
    </div>
  );
}

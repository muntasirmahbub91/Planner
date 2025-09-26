// src/views/JournalView.tsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { useJournalStore } from "@/stores/journalStore";
import "./JournalView.css";

type Draft = { id: string | null; title: string; text: string; date: string };

export default function JournalView() {
  const entriesMap = useJournalStore(s => s.entries);
  const add = useJournalStore(s => s.add);
  const update = useJournalStore(s => s.update);
  const remove = useJournalStore(s => s.remove);

  const entries = useMemo(() => {
    const list = Object.values(entriesMap);
    list.sort((a, b) => (a.date === b.date ? b.updatedAt - a.updatedAt : b.date.localeCompare(a.date)));
    return list;
  }, [entriesMap]);

  const [modalOpen, setModalOpen] = useState(false);
  const [initialDraft, setInitialDraft] = useState<Draft>({
    id: null, title: "", text: "", date: new Date().toISOString().slice(0, 10),
  });

  const openNew = () => {
    setInitialDraft({ id: null, title: "", text: "", date: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  };
  const openEdit = (id: string) => {
    const e = entriesMap[id]; if (!e) return;
    setInitialDraft({ id: e.id, title: e.title, text: e.text, date: e.date });
    setModalOpen(true);
  };

  const onSave = (d: Draft) => {
    if (!d.title && !d.text) return setModalOpen(false);
    d.id ? update(d.id, { title: d.title, text: d.text, date: d.date })
        : add({ title: d.title, text: d.text, date: d.date });
    setModalOpen(false);
  };
  const onDelete = (d: Draft) => { if (d.id) remove(d.id); setModalOpen(false); };

  return (
    <div className="jv-root">
      <section className="jv-section">
        <button type="button" className="jv-disclosure" onClick={openNew}>
          <span>New entry</span><span className="jv-disclosure-caret">＋</span>
        </button>
      </section>

      <section className="jv-section jv-recent">
        <div className="jv-list-hdr">
          <h2 className="jv-h2">Recent</h2>
          <div className="jv-meta">{entries.length} {entries.length === 1 ? "entry" : "entries"}</div>
        </div>

        <div className="jv-list">
          {entries.length === 0 && <div className="jv-empty">No entries</div>}
          {entries.map(e => (
            <button key={e.id} className="jv-card-btn" onClick={() => openEdit(e.id)}>
              <div className="jv-card-top">
                <div className="jv-card-title">{e.title || "Untitled"}</div>
                <div className="jv-card-date">{e.date}</div>
              </div>
              {e.text && <div className="jv-card-snippet">{e.text}</div>}
            </button>
          ))}
        </div>
      </section>

      <InlineJournalModal
        open={modalOpen}
        initialDraft={initialDraft}
        onClose={() => setModalOpen(false)}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  );
}

/* ---------- Inline, CSS-styled modal (no portal) ---------- */
function InlineJournalModal({
  open, initialDraft, onClose, onSave, onDelete,
}: {
  open: boolean;
  initialDraft: Draft;
  onClose: () => void;
  onSave: (d: Draft) => void;
  onDelete: (d: Draft) => void;
}) {
  const [d, setD] = useState<Draft>(initialDraft);
  useEffect(() => { if (open) setD(initialDraft); }, [open, initialDraft]);

  const overlayRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const didFocus = useRef(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return;
    didFocus.current = false;
    requestAnimationFrame(() => {
      if (!didFocus.current && textRef.current) { textRef.current.focus(); didFocus.current = true; }
    });
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="jv-modal-overlay"
      role="dialog" aria-modal="true"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="jv-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="jv-modal-header">
          <div className="jv-modal-title">{d.id ? "Edit entry" : "New entry"}</div>
          <button className="jv-modal-close" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="jv-modal-body">
          <div className="jv-modal-grid">
            <label className="jv-field">
              <span className="jv-label">Title</span>
              <input className="jv-input" value={d.title} onChange={(e)=>setD(p=>({ ...p, title:e.target.value }))} />
            </label>
            <label className="jv-field">
              <span className="jv-label">Date</span>
              <input className="jv-input" type="date" value={d.date} onChange={(e)=>setD(p=>({ ...p, date:e.target.value }))} />
            </label>
          </div>

          <label className="jv-field">
            <span className="jv-label">Text</span>
            <textarea
              ref={textRef}
              className="jv-textarea"
              rows={10}
              value={d.text}
              onChange={(e)=>setD(p=>({ ...p, text:e.target.value }))}
              placeholder="Write your entry…"
            />
          </label>
        </div>

        <div className="jv-modal-footer">
          {d.id && <button className="jv-btn danger" onClick={()=>onDelete(d)}>Delete</button>}
          <button className="jv-btn ghost" onClick={onClose}>Cancel</button>
          <button className="jv-btn" onClick={()=>onSave(d)}>Save</button>
        </div>
      </div>
    </div>
  );
}

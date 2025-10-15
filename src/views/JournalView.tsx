// src/views/JournalView.tsx — full drop-in rewrite with paragraphs + bullets support
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { useJournalStore } from "@/stores/journalStore";
import "./JournalView.css";

type Entry = {
  id: string;
  title: string;
  text: string;
  date: string;        // "YYYY-MM-DD"
  updatedAt?: number;  // epoch ms
};

type Draft = { id: string | null; title: string; text: string; date: string };

/* ---------- Minimal safe text → HTML renderer ----------
   - Keeps paragraphs and blank lines.
   - Converts lines starting with -, *, or • into <ul><li>.
   - Escapes all HTML to avoid script execution. */
function toHTML(src: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;")
     .replace(/</g, "&lt;")
     .replace(/>/g, "&gt;")
     .replace(/"/g, "&quot;");

  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let inList = false;

  for (const ln of lines) {
    const listMatch = ln.match(/^\s*[-*•]\s+(.*)$/);
    if (listMatch) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${esc(listMatch[1])}</li>`);
      continue;
    }
    if (inList) { out.push("</ul>"); inList = false; }
    if (ln.trim() === "") { out.push("<br/>"); }
    else { out.push(`<p>${esc(ln)}</p>`); }
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

function RichText({ text, className }: { text: string; className?: string }) {
  const html = React.useMemo(() => toHTML(text), [text]);
  return <div className={className ?? "jv-read"} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ---------- Utils ---------- */
const todayISO = () => new Date().toISOString().slice(0, 10);

/* =======================================================
   JournalView
======================================================= */
export default function JournalView() {
  const entriesMap = useJournalStore((s) => s.entries);
  const add = useJournalStore((s) => s.add);
  const update = useJournalStore((s) => s.update);
  const remove = useJournalStore((s) => s.remove);

  const entries: Entry[] = useMemo(() => {
    const list = Object.values(entriesMap) as Entry[];
    list.sort((a, b) =>
      a.date === b.date
        ? (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
        : b.date.localeCompare(a.date)
    );
    return list;
  }, [entriesMap]);

  /* ---------- Modal state ---------- */
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ id: null, title: "", text: "", date: todayISO() });
  const didFocus = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openNew = () => {
    setDraft({ id: null, title: "", text: "", date: todayISO() });
    setOpen(true);
  };
  const openEdit = (e: Entry) => {
    setDraft({ id: e.id, title: e.title ?? "", text: e.text ?? "", date: e.date ?? todayISO() });
    setOpen(true);
  };
  const onClose = () => setOpen(false);

  const onSave = (d: Draft) => {
    const payload = {
      title: (d.title ?? "").trim(),
      text: d.text ?? "",
      date: d.date ?? todayISO(),
      updatedAt: Date.now(),
    };
    if (d.id) update(d.id, payload);
    else add(payload);
    setOpen(false);
  };
  const onDelete = (d: Draft) => {
    if (d.id) remove(d.id);
    setOpen(false);
  };

  /* ---------- Modal focus + ESC handling ---------- */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    didFocus.current = false;
    requestAnimationFrame(() => {
      if (!didFocus.current && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select?.();
        didFocus.current = true;
      }
    });
  }, [open]);

  /* =======================================================
     Render
  ====================================================== */
  return (
    <div className="JournalView">
      {/* Composer trigger */}
      <section className="jv-section">
        <button type="button" className="jv-disclosure" onClick={openNew}>
          <span>New entry</span>
          <span className="jv-disclosure-caret">＋</span>
        </button>
      </section>

      {/* Recent entries */}
      <section className="jv-section jv-recent">
        <div className="jv-list-hdr">
          <h2 className="jv-title">Recent</h2>
          <div className="jv-meta">{entries.length} entries</div>
        </div>

        <div className="jv-list">
          {entries.map((e) => (
            <article key={e.id} className="jv-card" onClick={() => openEdit(e)} role="button">
              <div className="jv-card-head">
                <div className="jv-title">{e.title || "(untitled)"}</div>
                <div className="jv-meta">{e.date}</div>
              </div>

              {/* Snippet with preserved paragraphs and bullets */}
              {e.text && <RichText className="jv-card-snippet" text={e.text} />}
            </article>
          ))}

          {entries.length === 0 && (
            <div className="jv-empty">No entries yet. Click “New entry” to start writing.</div>
          )}
        </div>
      </section>

      {/* Modal */}
      {open && (
        <div className="jv-modal" role="dialog" aria-modal="true" aria-label="Edit journal entry">
          <div className="jv-card jv-editor" onClick={(e) => e.stopPropagation()}>
            <div className="jv-card-head">
              <div className="jv-title">{draft.id ? "Edit entry" : "New entry"}</div>
              <div className="jv-meta">{draft.date}</div>
            </div>

            <label className="jv-col">
              <span className="jv-label">Title</span>
              <input
                ref={inputRef}
                className="jv-input"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Entry title"
              />
            </label>

            <label className="jv-col">
              <span className="jv-label">Date</span>
              <input
                className="jv-input"
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </label>

            <label className="jv-col">
              <span className="jv-label">Text</span>
              <textarea
                className="jv-textarea"
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                placeholder={"Write your entry…\n\n- bullet item 1\n- bullet item 2"}
              />
            </label>

            <div className="jv-actions">
              {draft.id && (
                <button className="jv-btn secondary" onClick={() => onDelete(draft)}>
                  Delete
                </button>
              )}
              <button className="jv-btn secondary" onClick={onClose}>Cancel</button>
              <button className="jv-btn" onClick={() => onSave(draft)}>Save</button>
            </div>
          </div>
          {/* clicking outside closes */}
          <div className="jv-backdrop" onClick={onClose} />
        </div>
      )}
    </div>
  );
}

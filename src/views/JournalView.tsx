import React, { useEffect, useMemo, useState } from "react";
import "./JournalView.css";
import Modal from "@/components/Modal";

type Entry = {
  id: string;
  dateMs: number;
  title?: string;
  text: string;
  createdAt: number;
  updatedAt: number;
};

const LS_KEY = "journal:entries";

/* time */
const dayStart = (ms: number) => { const d = new Date(ms); d.setHours(0,0,0,0); return d.getTime(); };
const todayMs = () => dayStart(Date.now());
const toISO = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const fromISO = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return NaN;
  return dayStart(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime());
};
const fmtDate = (ms: number) =>
  new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(ms);
const monthLabel = (y: number, m0: number) =>
  new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(y, m0, 1));

/* storage */
function load(): Entry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Entry[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function persist(entries: Entry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(entries));
}

/* id */
const uuid = () =>
  (globalThis.crypto && "randomUUID" in globalThis.crypto
    ? (globalThis.crypto as any).randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36));

export default function JournalView() {
  const [entries, setEntries] = useState<Entry[]>(() => {
    const e = load().map((x) => ({ ...x, dateMs: dayStart(x.dateMs) }));
    e.sort((a, b) => b.dateMs - a.dateMs || b.updatedAt - a.updatedAt);
    return e;
  });

  /* New entry modal */
  const [newOpen, setNewOpen] = useState(false);
  const [nDate, setNDate] = useState<string>(() => toISO(todayMs()));
  const [nTitle, setNTitle] = useState("");
  const [nText, setNText] = useState("");

  /* Filters */
  const [qFrom, setQFrom] = useState<string>("");
  const [qTo, setQTo] = useState<string>("");

  /* Inline delete confirmation */
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => { persist(entries); }, [entries]);

  const range = useMemo(() => {
    const lo = qFrom ? fromISO(qFrom) : Number.NEGATIVE_INFINITY;
    const hi = qTo ? fromISO(qTo) : Number.POSITIVE_INFINITY;
    return { lo, hi };
  }, [qFrom, qTo]);

  const filtered = useMemo(() => {
    const base = entries.slice().sort((a,b)=> b.dateMs - a.dateMs || b.updatedAt - a.updatedAt);
    if (!qFrom && !qTo) return base.slice(0, 200);
    return base.filter(e => e.dateMs >= range.lo && e.dateMs <= range.hi);
  }, [entries, range, qFrom, qTo]);

  /* Group by month, newest month first */
  const monthGroups = useMemo(() => {
    const map = new Map<string, { y:number; m0:number; label:string; items:Entry[] }>();
    for (const e of filtered) {
      const d = new Date(e.dateMs);
      const y = d.getFullYear(), m0 = d.getMonth();
      const key = `${y}-${String(m0+1).padStart(2,"0")}`;
      if (!map.has(key)) map.set(key, { y, m0, label: monthLabel(y, m0), items: [] });
      map.get(key)!.items.push(e);
    }
    return Array.from(map.values()).sort((a,b)=> (b.y - a.y) || (b.m0 - a.m0));
  }, [filtered]);

  /* Collapsible months: multi-open, newest open by default */
  const [openMonths, setOpenMonths] = useState<Set<string>>(() => {
    const first = monthGroups[0]; if (!first) return new Set();
    return new Set([`${first.y}-${String(first.m0+1).padStart(2,"0")}`]);
  });
  useEffect(()=>{ /* ensure key exists after filter changes */
    setOpenMonths(prev => {
      if (monthGroups.length === 0) return new Set();
      const keys = new Set(monthGroups.map(g => `${g.y}-${String(g.m0+1).padStart(2,"0")}`));
      const next = new Set<string>();
      for (const k of prev) if (keys.has(k)) next.add(k);
      if (next.size === 0 && monthGroups[0]) next.add(`${monthGroups[0].y}-${String(monthGroups[0].m0+1).padStart(2,"0")}`);
      return next;
    });
  }, [monthGroups]);
  const toggleMonth = (key:string) =>
    setOpenMonths(prev => { const n=new Set(prev); n.has(key)?n.delete(key):n.add(key); return n; });

  const clearNewForm = () => { setNDate(toISO(todayMs())); setNTitle(""); setNText(""); };

  const saveNew = () => {
    const when = fromISO(nDate);
    if (Number.isNaN(when)) return alert("Invalid date");
    const title = nTitle.trim();
    const text = nText.trim();
    if (!title && !text) return alert("Write something first");
    const now = Date.now();
    const entry: Entry = { id: uuid(), dateMs: when, title, text, createdAt: now, updatedAt: now };
    setEntries((prev) => [entry, ...prev]);
    clearNewForm();
    setNewOpen(false);
  };

  const delAsk = (id: string) => setConfirmId(id);
  const delCancel = () => setConfirmId(null);
  const delConfirm = () => {
    if (!confirmId) return;
    setEntries((prev) => prev.filter((e) => e.id !== confirmId));
    setConfirmId(null);
  };

  const editText = (id: string, next: string) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, text: next, updatedAt: Date.now() } : e)));
  const editTitle = (id: string, next: string) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, title: next, updatedAt: Date.now() } : e)));

  return (
    <div className="jv-root">
      {/* New Entry trigger */}
      <section className="jv-section jv-new">
        <button
          type="button"
          className="jv-disclosure"
          onClick={() => setNewOpen(true)}
          aria-expanded={newOpen ? "true" : "false"}
        >
          <span>New entry</span>
          <span className="jv-disclosure-caret">＋</span>
        </button>
      </section>

      {/* New Entry Modal */}
      <Modal open={newOpen} onClose={()=>setNewOpen(false)} title="New entry">
        <div className="jv-new-body">
          <div className="jv-row">
            <label className="jv-field">
              <span className="jv-label">Title</span>
              <input className="jv-input" type="text" value={nTitle} onChange={(e)=>setNTitle(e.target.value)} placeholder="Title" />
            </label>
            <label className="jv-field">
              <span className="jv-label">Date</span>
              <input className="jv-input" type="date" value={nDate} onChange={(e) => setNDate(e.target.value)} />
            </label>
          </div>
          <label className="jv-field">
            <span className="jv-label">Text</span>
            <textarea
              className="jv-textarea"
              rows={8}
              value={nText}
              onChange={(e) => setNText(e.target.value)}
              placeholder="Type your thoughts…"
            />
          </label>
          <div className="jv-actions">
            <button className="jv-btn secondary" type="button" onClick={clearNewForm}>Clear</button>
            <button className="jv-btn primary" type="button" onClick={saveNew}>Save</button>
          </div>
        </div>
      </Modal>

      {/* Find / Filter */}
      <section className="jv-section">
        <h2 className="jv-h2">Find</h2>
        <div className="jv-row">
          <label className="jv-field">
            <span className="jv-label">From</span>
            <input className="jv-input" type="date" value={qFrom} onChange={(e) => setQFrom(e.target.value)} />
          </label>
          <label className="jv-field">
            <span className="jv-label">To</span>
            <input className="jv-input" type="date" value={qTo} onChange={(e) => setQTo(e.target.value)} />
          </label>
        </div>
      </section>

      {/* Month groups */}
      <section className="jv-section jv-recent">
        <div className="jv-list-hdr">
          <h2 className="jv-h2">{(qFrom || qTo) ? "Results" : "Recent"}</h2>
          <div className="jv-meta">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</div>
        </div>

        <div className="jv-months">
          {monthGroups.length === 0 && <div className="jv-empty">No entries</div>}

          {monthGroups.map(({ y, m0, label, items }) => {
            const key = `${y}-${String(m0+1).padStart(2,"0")}`;
            const open = openMonths.has(key);
            return (
              <section key={key} className={`jv-month ${open ? "" : "is-collapsed"}`}>
                <button
                  type="button"
                  className="jv-month-hdr"
                  aria-expanded={open ? "true" : "false"}
                  onClick={()=>toggleMonth(key)}
                >
                  <span className="jv-month-title">{label}</span>
                  <span className="jv-month-meta">{items.length}</span>
                  <span className="jv-caret">{open ? "▾" : "▸"}</span>
                </button>

                {open && (
                  <div className="jv-month-body">
                    <div className="jv-list">
                      {items.map((e) => {
                        const isConfirm = confirmId === e.id;
                        return (
                          <article key={e.id} className="jv-card">
                            <header className="jv-card-hdr">
                              <input
                                className="jv-title-input"
                                type="text"
                                value={e.title ?? ""}
                                onChange={(ev)=>editTitle(e.id, ev.target.value)}
                                placeholder="Untitled"
                              />
                              <div className="jv-card-date">{fmtDate(e.dateMs)}</div>
                            </header>

                            <textarea
                              className="jv-card-text"
                              value={e.text}
                              onChange={(ev) => editText(e.id, ev.target.value)}
                              rows={Math.min(10, Math.max(3, Math.ceil((e.text || "").length / 120)))}
                            />

                            <footer className="jv-card-foot">
                              {!isConfirm ? (
                                <div className="jv-card-actions">
                                  <button className="jv-btn ghost" type="button" onClick={() => delAsk(e.id)}>Delete</button>
                                </div>
                              ) : (
                                <div className="jv-confirm">
                                  <span>Delete this entry?</span>
                                  <div className="jv-confirm-actions">
                                    <button className="jv-btn ghost" type="button" onClick={delCancel}>Cancel</button>
                                    <button className="jv-btn danger" type="button" onClick={delConfirm}>Delete</button>
                                  </div>
                                </div>
                              )}
                            </footer>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}

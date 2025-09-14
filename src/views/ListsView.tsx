import { useRef, useState, useCallback, useId } from "react";
import { useLists } from "@/stores/listsStore";
import ListCard from "@/components/lists/ListCard";
import "./ListsView.css";

export default function ListView() {
  const { lists, addList } = useLists();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const handleCreate = useCallback(() => {
    const t = draft.trim();
    if (!t) return;
    addList(t);
    setDraft("");
    inputRef.current?.focus();
  }, [draft, addList]);

  return (
    <section className="root" aria-labelledby={titleId}>
      <div className="topRow">
        <h2 id={titleId} className="title">LISTS</h2>

        <form
          className="addListForm"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <label htmlFor="new-list" className="sr-only">New list title</label>
          <input
            id="new-list"
            ref={inputRef}
            className="addListInput"
            placeholder="New list title"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setDraft("");
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className="addListBtn"
            disabled={!draft.trim()}
          >
            Create
          </button>
        </form>
      </div>

      <p className="hint">
        Tip: double-click an item to edit. Checked items sink to the bottom.
      </p>

      {lists.length === 0 ? (
        <div className="empty">No lists yet. Create one above.</div>
      ) : (
        <div className="grid" role="list">
          {lists.map((l) => (
            <div key={l.id} role="listitem">
              <ListCard list={l} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

import { useRef, useState } from "react";
import { useLists } from "../stores/listsStore";
import ListCard from "../components/lists/ListCard";
import "./ListsView.css";

export default function ListsView(){
  const { lists, addList } = useLists();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleCreate(){
    const t = draft.trim();
    if(!t) return;
    addList(t);
    setDraft("");
    inputRef.current?.focus();
  }

  return (
    <div className="root">
      <div className="topRow">
        <div className="title">LISTS</div>
        <input
          ref={inputRef}
          className="addListInput"
          placeholder="New list title"
          value={draft}
          onChange={(e)=>setDraft(e.target.value)}
          onKeyDown={(e)=>{
            if(e.key==="Enter") handleCreate();
            if(e.key==="Escape") setDraft("");
          }}
        />
        <button className="addListBtn" onClick={handleCreate} disabled={!draft.trim()}>
          Create
        </button>
      </div>

      <div className="hint">Tip: double-click an item to edit. Checked items sink to the bottom.</div>

      <div className="grid">
        {lists.map((l)=> (
          <ListCard key={l.id} list={l} />
        ))}
      </div>
    </div>
  );
}


// src/components/MindMap.tsx
import React, { useRef, useState, useEffect, useSyncExternalStore } from "react";

export type NodeID = string;
export type NodeShape = "rounded" | "rect" | "ellipse" | "diamond";
export interface MMNode {
  id: NodeID; text: string; x: number; y: number;
  parentId?: NodeID; color?: string; shape?: NodeShape;
  collapsed?: boolean; expanded?: boolean;
}
export interface MMEdge { id: string; source: NodeID; target: NodeID; kind: "tree" | "link"; }
export interface MapState { nodes: Record<NodeID, MMNode>; links: MMEdge[]; rootId: NodeID; }

export interface MindMapProps {
  projectId: string;
  initial?: MapState;
  loadState?: () => Promise<MapState|null> | MapState | null;
  saveState?: (s: MapState) => Promise<void> | void;
  className?: string; height?: number | string;
}

/* ---------- store with per-project persist ---------- */
const VERSION = 1;
const makeKey = (pid: string) => `mindmap:${VERSION}:project:${pid}`;

class Store {
  private state: MapState; private listeners = new Set<() => void>();
  constructor(s: MapState) { this.state = s; }
  getState = () => this.state;
  setState = (updater: MapState | ((s: MapState) => MapState)) => {
    this.state = typeof updater === "function" ? (updater as any)(this.state) : updater;
    this.listeners.forEach(l => l());
  };
  subscribe = (cb: () => void) => { this.listeners.add(cb); return () => this.listeners.delete(cb); };
}
function useSelector<T>(store: Store, selector: (s: MapState)=>T) {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

/* ---------- utils ---------- */
const uid = () => Math.random().toString(36).slice(2, 9);
const childrenOf = (s: MapState, id: NodeID) => Object.values(s.nodes).filter(n => n.parentId === id);
const subtreeIds = (s: MapState, id: NodeID) => { const out = new Set<NodeID>(), st=[id]; while(st.length){const cur=st.pop()!; out.add(cur); childrenOf(s,cur).forEach(c=>st.push(c.id));} return out; };
const wouldCreateCycle = (s: MapState, child: NodeID, parent: NodeID) => subtreeIds(s, child).has(parent);
const computeTreeEdges = (s: MapState): MMEdge[] => Object.values(s.nodes).flatMap(n => n.parentId ? [{ id:`t-${n.id}`, source:n.parentId, target:n.id, kind:"tree" as const }] : []);
const autoLayout = (s: MapState, levelGap=220, nodeGap=90): MapState => {
  const root = s.nodes[s.rootId]; if (!root) return s;
  const levels: NodeID[][] = []; const q:[NodeID,number][]= [[root.id,0]]; const seen=new Set<NodeID>();
  while(q.length){const [id,d]=q.shift()!; if(seen.has(id))continue; seen.add(id); (levels[d]??=[]).push(id); childrenOf(s,id).forEach(c=>q.push([c.id,d+1]));}
  const nodes = {...s.nodes}; levels.forEach((ids,d)=>{ const total=(ids.length-1)*nodeGap; ids.forEach((nid,i)=>{ const n=nodes[nid]; nodes[nid]={...n,x:d*levelGap,y:-total/2+i*nodeGap}; });});
  return {...s, nodes};
};
const clamp = (v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const hexToRgb=(hex:string)=>{const h=hex.startsWith("#")?hex.slice(1):hex;if(h.length!==6)return null;const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);if([r,g,b].some(Number.isNaN))return null;return{r,g,b};};
const rgbToHex=(r:number,g:number,b:number)=>"#"+[r,g,b].map(n=>clamp(Math.round(n),0,255).toString(16).padStart(2,"0")).join("");
const lightenHex=(hex:string,amt:number)=>{const c=hexToRgb(hex); if(!c) return hex; return rgbToHex(c.r+(255-c.r)*amt,c.g+(255-c.g)*amt,c.b+(255-c.b)*amt);};
const effectiveColor=(s:MapState,id:NodeID)=>{const n=s.nodes[id]; if(n.color) return n.color; let cur=n.parentId? s.nodes[n.parentId]:undefined, up=1; while(cur){ if(cur.color){const per=0.12, amt=clamp(per*up,0,0.6); return lightenHex(cur.color, amt);} cur=cur.parentId? s.nodes[cur.parentId]:undefined; up++; } return "#ffffff";};
const wrapText=(t:string,max=22)=>{const w=t.split(/\s+/);const lines:string[]=[];let cur="";for(const x of w){const add=cur?cur+" "+x:x;if(add.length<=max)cur=add;else{if(cur)lines.push(cur);cur=x;}} if(cur)lines.push(cur); return lines.length?lines:[""];};
const previewText=(t:string,max=22)=> t.length<=max?t:(t.slice(0,max-1).trimEnd()+"…");

/* ---------- component ---------- */
export default function MindMap({ projectId, initial, loadState, saveState, className, height="100%" }: MindMapProps) {
  // seed
  const defaultSeed = (): MapState => {
    const r=uid(), a=uid(), b=uid(), c=uid();
    const nodes: Record<NodeID,MMNode> = {
      [r]: { id:r, text:"Root", x:0, y:0, color:"#bfdbfe", shape:"rounded", expanded:false },
      [a]: { id:a, text:"Task A", x:200, y:-100, parentId:r, color:"#bbf7d0", shape:"rounded", expanded:false },
      [b]: { id:b, text:"Task B", x:200, y:0,    parentId:r, color:"#fecaca", shape:"rounded", expanded:false },
      [c]: { id:c, text:"Notes",  x:200, y:100,  parentId:r, color:"#e5e7eb", shape:"rounded", expanded:false },
    };
    return { nodes, links: [], rootId:r };
  };

  const [store] = useState(() => new Store(autoLayout(initial ?? defaultSeed())));
  const state = useSelector(store, s => s);

  // persistence
  useEffect(() => {
    let mounted = true;
    (async () => {
      const key = makeKey(projectId);
      let loaded: MapState | null = null;
      if (loadState) loaded = await loadState();
      else {
        try { const raw = localStorage.getItem(key); if (raw) loaded = JSON.parse(raw); } catch {}
      }
      if (mounted && loaded?.nodes && loaded.rootId) store.setState(autoLayout(loaded));
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    const key = makeKey(projectId);
    const s = state;
    if (saveState) saveState(s);
    else { try { localStorage.setItem(key, JSON.stringify(s)); } catch {} }
  }, [state, projectId, saveState]);

  // ui state
  const [sel, setSel] = useState<NodeID | null>(null);
  const [connectFrom, setConnectFrom] = useState<NodeID | null>(null);
  const [editing, setEditing] = useState<NodeID | null>(null);
  const [draft, setDraft] = useState("");
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ id: NodeID; ox: number; oy: number } | null>(null);
  const panningRef = useRef<{ ox: number; oy: number } | null>(null);

  const treeEdges = computeTreeEdges(state);
  useEffect(() => { if (editing) setDraft(state.nodes[editing]?.text ?? ""); }, [editing, state.nodes]);

  const toWorld = (cx:number,cy:number)=>{const r=svgRef.current?.getBoundingClientRect(); const sx=cx-(r?.left??0), sy=cy-(r?.top??0); return { x:(sx-pan.x)/zoom, y:(sy-pan.y)/zoom };};
  const worldToScreen=(x:number,y:number,z=zoom)=>({ x:x*z+pan.x, y:y*z+pan.y });

  const onNodeMouseDown = (e:React.MouseEvent,id:NodeID)=>{ e.stopPropagation(); const pt=toWorld(e.clientX,e.clientY); const n=state.nodes[id]; dragRef.current={ id, ox:n.x-pt.x, oy:n.y-pt.y }; setSel(id); };
  const onBgMouseDown = (e:React.MouseEvent)=>{ const pt={x:e.clientX,y:e.clientY}; panningRef.current={ ox:pan.x-pt.x, oy:pan.y-pt.y }; setSel(null); };
  const onMouseMove = (e:React.MouseEvent)=>{ if(dragRef.current){ const {id,ox,oy}=dragRef.current; const pt=toWorld(e.clientX,e.clientY); store.setState(s=>({...s,nodes:{...s.nodes,[id]:{...s.nodes[id],x:pt.x+ox,y:pt.y+oy}}})); } else if(panningRef.current){ const {ox,oy}=panningRef.current; setPan({ x:e.clientX+ox, y:e.clientY+oy }); } };
  const onMouseUp = ()=>{ dragRef.current=null; panningRef.current=null; };
  const onWheel = (e:React.WheelEvent)=>{ const delta=-e.deltaY; const factor=delta>0?1.05:0.95; const mouse=toWorld(e.clientX,e.clientY);
    setZoom(z=>{ const nz=Math.min(2.5,Math.max(0.3,z*factor)); const before=worldToScreen(mouse.x,mouse.y,z); const after=worldToScreen(mouse.x,mouse.y,nz); setPan(p=>({ x:p.x+(before.x-after.x), y:p.y+(before.y-after.y) })); return nz; });
  };

  const addNode = ()=>{ const id=uid(); const n:MMNode={ id, text:"New Node", x:0, y:0, color:"#e5e7eb", shape:"rounded", expanded:false }; store.setState(s=>({...s,nodes:{...s.nodes,[id]:n}})); setSel(id); setEditing(id); };
  const addChild=()=>{ const pid=sel ?? state.rootId; const id=uid(); const p=state.nodes[pid]; const n:MMNode={ id, text:"Child", x:p.x+170, y:p.y, parentId:pid, color:"#e0e7ff", shape:"rounded", expanded:false }; store.setState(s=>({...s,nodes:{...s.nodes,[id]:n}})); setSel(id); setEditing(id); };
  const delNode=()=>{ if(!sel||sel===state.rootId) return; store.setState(s=>{ const ids=Array.from(subtreeIds(s,sel)); const nodes={...s.nodes}; ids.forEach(id=>delete nodes[id]); const links=s.links.filter(l=>!ids.includes(l.source)&&!ids.includes(l.target)); return {...s,nodes,links}; }); setSel(null); };
  const toggleCollapse=(id?:NodeID)=>{ const nid=id??sel; if(!nid) return; store.setState(s=>({...s,nodes:{...s.nodes,[nid]:{...s.nodes[nid],collapsed:!s.nodes[nid].collapsed}}})); };
  const setParent=(child:NodeID,parent:NodeID)=>{ if(child===parent||wouldCreateCycle(state,child,parent)) return; store.setState(s=>({...s,nodes:{...s.nodes[child],}})); store.setState(s=>({...s,nodes:{...s.nodes,[child]:{...s.nodes[child],parentId:parent}}})); };
  const startLink=()=>{ if(!sel) return; setConnectFrom(sel); };
  const completeLink=(target:NodeID)=>{ if(!connectFrom||connectFrom===target) return; const id=`l-${uid()}`; store.setState(s=>({...s,links:[...s.links,{id,source:connectFrom,target,kind:"link"}]})); setConnectFrom(null); };
  const makeParent=(targetParent:NodeID)=>{ if(!sel) return; setParent(sel,targetParent); };
  const relayout=()=> store.setState(s=>autoLayout(s));

  const setNodeColor=(id:NodeID,color:string)=> store.setState(s=>({...s,nodes:{...s.nodes,[id]:{...s.nodes[id],color}}}));
  const setNodeShape=(id:NodeID,shape:NodeShape)=> store.setState(s=>({...s,nodes:{...s.nodes,[id]:{...s.nodes[id],shape}}}));
  const commitEdit=(id:NodeID,text:string)=>{ store.setState(s=>({...s,nodes:{...s.nodes,[id]:{...s.nodes[id],text}}})); setEditing(null); setDraft(""); };
  const cancelEdit=()=>{ setEditing(null); setDraft(""); };

  useEffect(()=>{ const onKey=(e:KeyboardEvent)=>{ if(e.key==="Delete"||e.key==="Backspace") delNode(); if(e.key==="Enter"&&sel) setEditing(sel); if(e.key==="Escape"){ setConnectFrom(null); setEditing(null);} if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="a"){ e.preventDefault(); addNode(); } }; window.addEventListener("keydown",onKey); return ()=>window.removeEventListener("keydown",onKey); },[sel,state]);

  // scoped styles
  useEffect(()=>{
    const css = `
:root { --card-shadow: 0 2px 10px rgba(0,0,0,.10); }
.mm-toolbar { box-shadow: 0 2px 14px rgba(15,23,42,.06); }
.mm-chip { border-radius: 12px; }
.mm-btn { padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 12px; background: rgba(255,255,255,.7); }
.mm-btn:hover { background: #f8fafc; }
.mm-zoom { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 12px; background: rgba(255,255,255,.6); }
.node-card { filter: drop-shadow(0 2px 6px rgba(0,0,0,.15)); }
.badge { fill: #0f172a; } .badge-green { fill: #10b981; }
`; const el=document.createElement("style"); el.dataset.mm="true"; el.textContent=css; document.head.appendChild(el); return ()=>{ document.head.removeChild(el); };
  },[]);

  const edges = [...treeEdges, ...state.links];

  return (
    <div className={className ?? "w-full"} style={{ height }}>
      <div className="mm-toolbar" style={{ display:"flex", alignItems:"center", gap:8, padding:8, borderBottom:"1px solid #e5e7eb", background:"rgba(255,255,255,0.7)", backdropFilter:"blur(4px)" }}>
        <div className="mm-chip" style={{ display:"inline-flex", overflow:"hidden", border:"1px solid #e2e8f0", background:"rgba(255,255,255,0.6)" }}>
          <button className="mm-btn" onClick={addNode}>➕ New</button>
          <button className="mm-btn" onClick={addChild}>🌿 Child</button>
          <button className="mm-btn" onClick={startLink} style={{ background: connectFrom ? "#fde68a" : undefined }}>🔗 Link</button>
          <button className="mm-btn" onClick={()=>toggleCollapse()}>▣ Collapse</button>
          <button className="mm-btn" onClick={delNode}>🗑 Delete</button>
          <button className="mm-btn" onClick={relayout}>🪄 Auto layout</button>
        </div>
        <div style={{ marginLeft:"auto" }} className="mm-zoom">
          <span>Zoom</span>
          <input type="range" min={0.3} max={2.5} step={0.01} value={zoom} onChange={(e)=>setZoom(parseFloat(e.target.value))}/>
        </div>
      </div>

      <div style={{ position:"relative", height:"calc(100% - 54px)" }} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
        <svg ref={svgRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} onMouseDown={onBgMouseDown} onWheel={onWheel}>
          <defs>
            <pattern id="grid" width={40} height={40} patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/></pattern>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L10,3 L0,6 Z" fill="#0ea5e9"/></marker>
          </defs>
          <rect x={0} y={0} width="100%" height="100%" fill="url(#grid)"/>
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {[...edges].map((e) => {
              const s = state.nodes[e.source], t = state.nodes[e.target]; if (!s || !t) return null; if (state.nodes[e.source]?.collapsed && e.kind==="tree") return null;
              const dx=t.x-s.x, mx=s.x+dx/2, path=`M ${s.x} ${s.y} C ${mx} ${s.y}, ${mx} ${t.y}, ${t.x} ${t.y}`;
              const stroke = e.kind==="tree" ? "#94a3b8" : "#0ea5e9";
              return <path key={e.id} d={path} fill="none" stroke={stroke} strokeWidth={2} strokeOpacity={0.7} markerEnd={e.kind==="link"?"url(#arrow)":undefined}/>;
            })}

            {Object.values(state.nodes).map((n) => {
              if (n.parentId && state.nodes[n.parentId]?.collapsed) return null;
              const isSel = n.id === sel;
              const hasKids = childrenOf(state, n.id).length > 0;
              const fill = effectiveColor(state, n.id);
              const border = isSel ? "#0f172a" : "#cbd5e1";
              const strokeW = isSel ? 2.5 : 1.5;
              const shape = n.shape || "rounded";
              const W = 144, H = 48, RX = 14, RY = 14;

              const renderShape = () => {
                if (shape === "rect")    return <rect className="node-card" x={-W/2} y={-H/2} width={W} height={H} fill={fill} stroke={border} strokeWidth={strokeW} rx={0} ry={0}/>;
                if (shape === "ellipse") return <ellipse className="node-card" cx={0} cy={0} rx={W/2} ry={H/2} fill={fill} stroke={border} strokeWidth={strokeW}/>;
                if (shape === "diamond") return <polygon className="node-card" points={`0,${-H/2} ${W/2},0 0,${H/2} ${-W/2},0`} fill={fill} stroke={border} strokeWidth={strokeW}/>;
                return <rect className="node-card" x={-W/2} y={-H/2} width={W} height={H} fill={fill} stroke={border} strokeWidth={strokeW} rx={RX} ry={RY}/>;
              };

              return (
                <g key={n.id} transform={`translate(${n.x},${n.y})`} onMouseDown={(e)=>onNodeMouseDown(e,n.id)} className="transition-transform">
                  {renderShape()}

                  {hasKids && (
                    <g onClick={(e)=>{ e.stopPropagation(); toggleCollapse(n.id); }} style={{ cursor:"pointer" }}>
                      <rect className="badge" x={-90} y={-10} width={20} height={20} rx={6} ry={6}/>
                      <text x={-80} y={5} textAnchor="middle" fontSize={12} fill="#ffffff">{n.collapsed ? "+" : "−"}</text>
                    </g>
                  )}

                  {sel && sel !== n.id && (
                    <g onClick={(e)=>{ e.stopPropagation(); makeParent(n.id); }} style={{ cursor:"pointer" }}>
                      <rect className="badge-green" x={70} y={-10} width={20} height={20} rx={6} ry={6}/>
                      <text x={80} y={5} textAnchor="middle" fontSize={12} fill="#ffffff">P</text>
                    </g>
                  )}

                  {editing === n.id ? (
                    <foreignObject x={-66} y={-18} width={132} height={36}>
                      <input
                        autoFocus aria-label="Edit node text"
                        style={{ width:"100%", height:36, borderRadius:8, padding:"0 10px", border:"1px solid #cbd5e1" }}
                        value={draft}
                        onChange={(e)=> setDraft(e.currentTarget ? e.currentTarget.value : draft)}
                        onBlur={()=> commitEdit(n.id, draft)}
                        onKeyDown={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); commitEdit(n.id, draft);} if(e.key==="Escape"){ e.preventDefault(); cancelEdit(); } }}
                      />
                    </foreignObject>
                  ) : (
                    <text x={0} y={4} textAnchor="middle" style={{ fontSize:14, fontWeight:600, fill:"#1f2937" }}>{previewText(n.text, 22)}</text>
                  )}

                  {/* quick actions */}
                  <g onClick={(e)=>{ e.stopPropagation(); setSel(n.id); setEditing(n.id); }} style={{ cursor:"text" }}>
                    {/* invisible click target over node text */}
                    <rect x={-W/2} y={-H/2} width={W} height={H} fill="transparent" />
                  </g>

                  {connectFrom && connectFrom !== n.id && (
                    <g onClick={(e)=>{ e.stopPropagation(); completeLink(n.id); }} style={{ cursor:"pointer" }}>
                      <rect x={-8} y={-42} width={16} height={16} rx={4} ry={4} fill="#0ea5e9"/>
                      <text x={0} y={-30} textAnchor="middle" fontSize={10} fill="#ffffff">L</text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

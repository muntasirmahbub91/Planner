import React from "react";
import { useDateStore } from "@/stores/dateStore";

function startOfMonth(ms: number){
  const d = new Date(ms); d.setHours(0,0,0,0); d.setDate(1); return d;
}
function startOfWeekMonday(d: Date){
  const x = new Date(d); const day = x.getDay(); // 0..6
  const diff = (day === 0 ? -6 : 1 - day);
  x.setDate(x.getDate() + diff); return x;
}
function isSameMonth(a: Date, b: Date){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth(); }

export default function MonthGrid(){
  const anchor = useDateStore();
  const firstOfMonth = startOfMonth(anchor);
  const gridStart = startOfWeekMonday(firstOfMonth);
  const cells = Array.from({length: 42}, (_,i) => {
    const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d;
  });
  const monthName = firstOfMonth.toLocaleDateString(undefined, { month:"long", year:"numeric" });

  return (
    <section>
      <h3 style={{margin:"12px 0 8px"}}>{monthName}</h3>
      <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:8}}>
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(h=>(
          <div key={h} style={{textAlign:"center", fontSize:12, opacity:0.6}}>{h}</div>
        ))}
        {cells.map((d,i)=>{
          const inMonth = isSameMonth(d, firstOfMonth);
          const dayNum = d.getDate();
          return (
            <div key={i} style={{
              border:"1px solid #e5e5e5",
              borderRadius:12,
              padding:"8px 10px",
              minHeight:72,
              background:"#fff",
              opacity: inMonth ? 1 : 0.45
            }}>
              <div style={{fontSize:12, fontWeight:700, opacity:0.8}}>{dayNum}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

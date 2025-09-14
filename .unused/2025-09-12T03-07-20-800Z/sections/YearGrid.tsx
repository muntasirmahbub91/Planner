import React from "react";
import { useDateStore } from "@/stores/dateStore";

function startOfMonth(y: number, m: number){ const d = new Date(y, m, 1); d.setHours(0,0,0,0); return d; }
function startOfWeekMonday(d: Date){
  const x = new Date(d); const day = x.getDay(); // 0..6
  const diff = (day === 0 ? -6 : 1 - day);
  x.setDate(x.getDate() + diff); return x;
}
function isSameMonth(a: Date, y: number, m: number){ return a.getFullYear()===y && a.getMonth()===m; }

function MiniMonth({ year, month }: { year: number; month: number }) {
  const first = startOfMonth(year, month);
  const gridStart = startOfWeekMonday(first);
  const cells = Array.from({length: 42}, (_,i) => {
    const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d;
  });
  const label = first.toLocaleDateString(undefined, { month:"short" });

  return (
    <div style={{border:"1px solid #e5e5e5", borderRadius:12, padding:8, background:"#fff"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6}}>
        <strong style={{fontSize:12}}>{label}</strong>
        <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, fontSize:9, opacity:0.6, width:126}}>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(h=>(
            <div key={h} style={{textAlign:"center"}}>{h[0]}</div>
          ))}
        </div>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:2}}>
        {cells.map((d,i)=>{
          const inMonth = isSameMonth(d, year, month);
          return (
            <div key={i} style={{
              minHeight:16,
              textAlign:"center",
              fontSize:10,
              padding:"2px 0",
              borderRadius:6,
              background: inMonth ? "#fff" : "#f7f7f7",
              color: inMonth ? "#111" : "#999",
              border: "1px solid #eee"
            }}>
              {d.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function YearGrid(){
  const ms = useDateStore();
  const d = new Date(ms);
  const year = d.getFullYear();
  return (
    <section>
      <h3 style={{margin:"12px 0 8px"}}>{year}</h3>
      <div style={{display:"grid", gridTemplateColumns:"repeat(4, minmax(0, 1fr))", gap:12}}>
        {Array.from({length:12}, (_,m)=> <MiniMonth key={m} year={year} month={m} />)}
      </div>
    </section>
  );
}

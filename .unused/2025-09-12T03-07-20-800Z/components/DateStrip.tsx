import React from "react";
import { useDateStore, prev, next, fmtDayTitle, fmtDaySubtitle, setToday } from "@/stores/dateStore";

type Props = { mode: "day"|"week"|"month"|"year" };
export default function DateStrip({ mode }: Props){
  const ms = useDateStore();
  React.useEffect(()=>{
    const onToday = () => setToday();
    window.addEventListener("today-click", onToday as any);
    return () => window.removeEventListener("today-click", onToday as any);
  }, []);
  const large = mode==="day" ? fmtDayTitle(ms) : "";
  const small = mode==="day" ? fmtDaySubtitle(ms) : "";
  return (
    <div className="datestrip" style={{display:"grid", gridTemplateColumns:"48px 1fr 48px", alignItems:"center", gap:8, padding:"8px 0 16px"}}>
      <button type="button" aria-label="Previous day" onClick={prev}>‹</button>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:28, fontWeight:700, lineHeight:1}}>{large}</div>
        <div style={{opacity:0.7, fontSize:14}}>{small}</div>
      </div>
      <button type="button" aria-label="Next day" onClick={next}>›</button>
    </div>
  );
}

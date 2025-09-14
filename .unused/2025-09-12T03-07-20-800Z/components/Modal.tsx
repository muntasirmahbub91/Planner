import React from "react";
export default function Modal({ open, onClose, children }:{
  open: boolean; onClose: ()=>void; children: React.ReactNode;
}){
  if(!open) return null;
  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"grid", placeItems:"center", zIndex:50}} onClick={onClose}>
      <div style={{background:"#fff", borderRadius:12, minWidth:320, maxWidth:560, padding:16}} onClick={e=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

import { useState } from "react";
import TimelineSettings from "./TimelineSettings.jsx";
import TimelineImportSettings from "./TimelineImportSettings.jsx";
import MemoryPracticeSettings from "./MemoryPracticeSettings.jsx";

const tabs=[{id:"practice",label:"新记忆实验"},{id:"journal",label:"旧正式日记"},{id:"review",label:"旧待审核"},{id:"import",label:"旧导入"}];
export default function MemoryJournalSettings(){
  const [tab,setTab]=useState("practice");
  return <details style={{marginTop:14,borderTop:"0.5px solid rgba(0,0,0,.06)",paddingTop:14}}>
    <summary style={{fontSize:12,fontWeight:500,cursor:"pointer"}}>记忆与日记</summary>
    <div style={{display:"flex",gap:5,margin:"10px 0"}}>{tabs.map(item=><button key={item.id} type="button" onClick={()=>setTab(item.id)} style={{border:0,borderRadius:12,padding:"7px 10px",fontSize:10.5,cursor:"pointer",background:tab===item.id?"#1C1C1E":"rgba(0,0,0,.04)",color:tab===item.id?"#fff":"#3C3C3E"}}>{item.label}</button>)}</div>
    {tab==="practice"&&<MemoryPracticeSettings/>}
    {tab==="journal"&&<TimelineSettings embedded/>}
    {tab==="review"&&<TimelineImportSettings mode="review"/>}
    {tab==="import"&&<TimelineImportSettings mode="import" onCandidateGenerated={()=>setTab("review")}/>} 
  </details>;
}

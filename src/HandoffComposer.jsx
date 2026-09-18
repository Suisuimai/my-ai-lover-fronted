import { useEffect, useState } from "react";
import { api } from "./api.js";

const field={width:"100%",boxSizing:"border-box",border:"0.5px solid rgba(0,0,0,.12)",borderRadius:11,padding:10,fontFamily:"inherit",fontSize:11.5,lineHeight:1.6,background:"#FAFAF8",outline:"none"};
const split=(value)=>[...new Set(String(value||"").split(/[,，、;；\n\r]+/u).map(item=>item.trim()).filter(Boolean))];

export default function HandoffComposer({open,onClose,sessionId}){
  const [candidate,setCandidate]=useState(null);const [busy,setBusy]=useState("");const [message,setMessage]=useState("");
  useEffect(()=>{if(!open)return undefined;const key=(event)=>{if(event.key==="Escape")onClose()};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key)},[open,onClose]);
  if(!open)return null;

  async function generate(){try{setBusy("generate");setMessage("");const data=await api("/handoffs/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sourceSessionId:sessionId})});setCandidate({...data.candidate,topicsText:data.candidate.topics.join("、"),openLoopsText:data.candidate.openLoops.join("、")})}catch(error){setMessage(error.message)}finally{setBusy("")}}
  async function confirm(){try{setBusy("save");setMessage("");await api("/handoffs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sourceSessionId:sessionId,bodyMarkdown:candidate.bodyMarkdown,currentState:candidate.currentState,topics:split(candidate.topicsText),openLoops:split(candidate.openLoopsText),continuationGuidance:candidate.continuationGuidance,tailMessageIds:candidate.tailMessageIds,status:"confirmed"})});setMessage("正式交接已保存。你现在可以新建窗口，季疏会自动收到这份交接和末尾对话。");setCandidate(null)}catch(error){setMessage(error.message)}finally{setBusy("")}}

  return <div style={{position:"fixed",inset:0,zIndex:80,background:"rgba(0,0,0,.2)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}} onClick={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section style={{width:"100%",maxWidth:620,maxHeight:"90vh",overflowY:"auto",background:"#fff",borderRadius:20,padding:18,boxShadow:"0 24px 70px rgba(0,0,0,.15)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}><div><b style={{fontSize:14}}>结束当前窗口</b><p style={{fontSize:10.5,color:"#8E8E93",margin:"3px 0 0"}}>生成候选后可以修改；确认前不会保存。</p></div><button onClick={onClose} style={{marginLeft:"auto",width:30,height:30,border:0,borderRadius:"50%",background:"rgba(0,0,0,.05)",cursor:"pointer"}}><i className="ti ti-x"/></button></div>
      {!candidate&&<button onClick={generate} disabled={!!busy} style={{marginTop:16,border:0,borderRadius:18,padding:"9px 15px",background:"#1C1C1E",color:"#fff",cursor:"pointer"}}>{busy?"正在整理本窗口…":"生成交接候选"}</button>}
      {candidate&&<div style={{display:"grid",gap:10,marginTop:16}}>
        <Label text="这个窗口发生了什么"><textarea rows={7} style={field} value={candidate.bodyMarkdown} onChange={event=>setCandidate({...candidate,bodyMarkdown:event.target.value})}/></Label>
        <Label text="结束时的当前状态"><textarea rows={3} style={field} value={candidate.currentState} onChange={event=>setCandidate({...candidate,currentState:event.target.value})}/></Label>
        <Label text="主要话题"><input style={field} value={candidate.topicsText} onChange={event=>setCandidate({...candidate,topicsText:event.target.value})}/></Label>
        <Label text="没说完的话题"><input style={field} value={candidate.openLoopsText} onChange={event=>setCandidate({...candidate,openLoopsText:event.target.value})}/></Label>
        <Label text="下一窗口如何自然接续"><textarea rows={3} style={field} value={candidate.continuationGuidance} onChange={event=>setCandidate({...candidate,continuationGuidance:event.target.value})}/></Label>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button onClick={()=>setCandidate(null)} style={{border:0,borderRadius:16,padding:"8px 12px",background:"rgba(0,0,0,.05)",cursor:"pointer"}}>重新生成</button><button onClick={confirm} disabled={!!busy||!candidate.bodyMarkdown.trim()||!candidate.currentState.trim()} style={{border:0,borderRadius:16,padding:"8px 13px",background:"#1C1C1E",color:"#fff",cursor:"pointer"}}>{busy?"保存中…":"确认并保存正式交接"}</button></div>
      </div>}
      {message&&<p style={{fontSize:11,lineHeight:1.6,color:message.includes("已保存")?"#248A3D":"#C9342D",margin:"12px 0 0"}}>{message}</p>}
    </section>
  </div>;
}

function Label({text,children}){return <label><span style={{display:"block",fontSize:9.5,color:"#8E8E93",marginBottom:5}}>{text}</span>{children}</label>}

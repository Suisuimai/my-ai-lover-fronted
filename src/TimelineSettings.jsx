import { useEffect, useState } from "react";
import { api } from "./api.js";

const inputStyle={width:"100%",boxSizing:"border-box",border:"0.5px solid rgba(0,0,0,.1)",borderRadius:10,padding:8,fontFamily:"inherit",fontSize:11};
const split=(value)=>[...new Set(String(value||"").split(/[,，、;；\n\r]+/u).map(x=>x.trim()).filter(Boolean))];

export default function TimelineSettings(){
  const [items,setItems]=useState([]); const [message,setMessage]=useState("");
  const empty={title:"",bodyMarkdown:"",currentState:"",indexSummary:"",evidenceTerms:"",occurredAt:new Date().toISOString().slice(0,16)};
  const [draft,setDraft]=useState(empty);
  useEffect(()=>{api("/timeline").then(d=>setItems(d.entries||[])).catch(e=>setMessage(e.message));},[]);
  async function add(){
    try{const data=await api("/timeline",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...draft,evidenceTerms:split(draft.evidenceTerms),occurredAt:new Date(draft.occurredAt).toISOString(),confirmationStatus:"confirmed",createdBy:"user"})});setItems(x=>[data.entry,...x]);setDraft(empty);setMessage("");}
    catch(e){setMessage(e.message);}
  }
  async function retract(item){
    const quote=window.prompt("请复制记录中不准确的原句（必须完全一致）："); if(!quote)return;
    const reason=window.prompt("为什么这句话不再准确？"); if(!reason)return;
    try{await api(`/timeline/${item.id}/retract`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({quote,reason})});setItems(x=>x.filter(v=>v.id!==item.id));}
    catch(e){setMessage(e.message);}
  }
  return <details style={{marginTop:14,borderTop:"0.5px solid rgba(0,0,0,.06)",paddingTop:14}}>
    <summary style={{fontSize:12,fontWeight:500,cursor:"pointer"}}>时间线日记 ({items.length})</summary>
    <p style={{fontSize:10.5,color:"#8E8E93"}}>按时间保存真实经历，并明确记录结束时的当下状态。现在可手动整理，自动生成稍后开启。</p>
    <input style={inputStyle} placeholder="标题，例如：秋季旅行讨论" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/>
    <input type="datetime-local" style={{...inputStyle,marginTop:6}} value={draft.occurredAt} onChange={e=>setDraft({...draft,occurredAt:e.target.value})}/>
    <textarea rows={3} style={{...inputStyle,marginTop:6}} placeholder="发生了什么（可包含原话证据）" value={draft.bodyMarkdown} onChange={e=>setDraft({...draft,bodyMarkdown:e.target.value})}/>
    <input style={{...inputStyle,marginTop:6}} placeholder="这件事现在是什么状态" value={draft.currentState} onChange={e=>setDraft({...draft,currentState:e.target.value})}/>
    <input style={{...inputStyle,marginTop:6}} placeholder="一句话索引摘要" value={draft.indexSummary} onChange={e=>setDraft({...draft,indexSummary:e.target.value})}/>
    <input style={{...inputStyle,marginTop:6}} placeholder="证据词，用逗号、顿号或分号分隔" value={draft.evidenceTerms} onChange={e=>setDraft({...draft,evidenceTerms:e.target.value})}/>
    <button type="button" onClick={add} style={{border:0,borderRadius:12,padding:"6px 11px",marginTop:6}}>添加日记</button>
    {message&&<p style={{fontSize:10.5,color:"#FF3B30"}}>{message}</p>}
    {items.map(item=><article key={item.id} style={{padding:"10px 0",borderTop:"0.5px solid rgba(0,0,0,.06)"}}><b style={{fontSize:11.5}}>{item.title}</b><p style={{fontSize:10,color:"#8E8E93"}}>{new Date(item.occurred_at).toLocaleString()} · 当前：{item.current_state}</p><p style={{fontSize:11,whiteSpace:"pre-wrap"}}>{item.body_markdown}</p><button type="button" onClick={()=>retract(item)} style={{border:0,background:"transparent",color:"#FF3B30",fontSize:10.5}}>标记为不准确</button></article>)}
  </details>;
}

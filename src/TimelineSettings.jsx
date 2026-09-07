import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const inputStyle={width:"100%",boxSizing:"border-box",border:"0.5px solid rgba(0,0,0,.1)",borderRadius:10,padding:8,fontFamily:"inherit",fontSize:11};
const split=(value)=>[...new Set(String(value||"").split(/[,，、;；\n\r]+/u).map(x=>x.trim()).filter(Boolean))];

export default function TimelineSettings({embedded=false}){
  const [items,setItems]=useState([]); const [message,setMessage]=useState("");
  const fresh=()=>({title:"",bodyMarkdown:"",currentState:"",indexSummary:"",evidenceTerms:"",occurredAt:new Date().toISOString().slice(0,16)});
  const [draft,setDraft]=useState(fresh);
  useEffect(()=>{api("/timeline").then(d=>setItems(d.entries||[])).catch(e=>setMessage(e.message));},[]);
  const journals=useMemo(()=>{
    const groups=new Map();
    for(const item of items){const date=new Date(item.occurred_at).toLocaleDateString("zh-CN",{year:"numeric",month:"2-digit",day:"2-digit"});if(!groups.has(date))groups.set(date,[]);groups.get(date).push(item)}
    return [...groups].map(([date,entries])=>({date,entries,markdown:[`# ${date} 日记`,...entries.flatMap(item=>["",`## ${item.title}`,"",item.body_markdown,"",`**当下状态：** ${item.current_state}`,`**索引摘要：** ${item.index_summary}`])].join("\n")}));
  },[items]);
  async function add(){try{const data=await api("/timeline",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...draft,evidenceTerms:split(draft.evidenceTerms),occurredAt:new Date(draft.occurredAt).toISOString(),confirmationStatus:"confirmed",createdBy:"user"})});setItems(x=>[data.entry,...x]);setDraft(fresh());setMessage("")}catch(e){setMessage(e.message)}}
  async function retract(item){const quote=window.prompt("请复制记录中不准确的原句（必须完全一致）：");if(!quote)return;const reason=window.prompt("为什么这句话不再准确？");if(!reason)return;try{await api(`/timeline/${item.id}/retract`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({quote,reason})});setItems(x=>x.filter(v=>v.id!==item.id))}catch(e){setMessage(e.message)}}
  const content=<div>
    <p style={{fontSize:10.5,color:"#8E8E93"}}>正式记录按日期合成为 Markdown 日记；底层条目只用于检索、证据和纠错。</p>
    {!journals.length&&<p style={{fontSize:10.5,color:"#8E8E93"}}>还没有正式日记。候选内容需要在“待审核”中确认后才会出现在这里。</p>}
    {journals.map(journal=><details key={journal.date} open={journals.length===1} style={{margin:"7px 0"}}><summary style={{fontSize:11,fontWeight:500,cursor:"pointer"}}>{journal.date} · {journal.entries.length} 条</summary><pre style={{whiteSpace:"pre-wrap",fontFamily:"ui-monospace,Consolas,monospace",fontSize:10.5,lineHeight:1.6,background:"rgba(0,0,0,.025)",padding:10,borderRadius:10}}>{journal.markdown}</pre>{journal.entries.map(item=><button key={item.id} type="button" onClick={()=>retract(item)} style={{border:0,background:"transparent",color:"#FF3B30",fontSize:9.5}}>纠正：{item.title}</button>)}</details>)}
    <details style={{marginTop:10}}><summary style={{fontSize:10.5,cursor:"pointer"}}>手动新增一则日记</summary><input style={{...inputStyle,marginTop:7}} placeholder="标题" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/><input type="datetime-local" style={{...inputStyle,marginTop:6}} value={draft.occurredAt} onChange={e=>setDraft({...draft,occurredAt:e.target.value})}/><textarea rows={3} style={{...inputStyle,marginTop:6}} placeholder="发生了什么" value={draft.bodyMarkdown} onChange={e=>setDraft({...draft,bodyMarkdown:e.target.value})}/><input style={{...inputStyle,marginTop:6}} placeholder="这件事现在是什么状态" value={draft.currentState} onChange={e=>setDraft({...draft,currentState:e.target.value})}/><input style={{...inputStyle,marginTop:6}} placeholder="一句话索引摘要" value={draft.indexSummary} onChange={e=>setDraft({...draft,indexSummary:e.target.value})}/><input style={{...inputStyle,marginTop:6}} placeholder="证据词，用逗号、顿号或分号分隔" value={draft.evidenceTerms} onChange={e=>setDraft({...draft,evidenceTerms:e.target.value})}/><button type="button" onClick={add} style={{border:0,borderRadius:12,padding:"6px 11px",marginTop:6}}>添加日记</button></details>
    {message&&<p style={{fontSize:10.5,color:"#FF3B30"}}>{message}</p>}
  </div>;
  if(embedded)return content;
  return <details style={{marginTop:14,borderTop:"0.5px solid rgba(0,0,0,.06)",paddingTop:14}}><summary style={{fontSize:12,fontWeight:500,cursor:"pointer"}}>记忆与日记 ({items.length})</summary>{content}</details>;
}

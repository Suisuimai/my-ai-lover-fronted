import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";

const button={border:0,borderRadius:12,padding:"6px 10px",fontSize:10.5,cursor:"pointer"};
const field={width:"100%",boxSizing:"border-box",border:"0.5px solid rgba(0,0,0,.1)",borderRadius:8,padding:7,fontFamily:"inherit",fontSize:10.5,marginTop:5};
function CandidateEditor({candidate,busy,onReview,onSaved}){
  const [draft,setDraft]=useState(candidate); const [saving,setSaving]=useState(false);
  async function save(){try{setSaving(true);const d=await api(`/timeline-candidates/${candidate.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:draft.title,bodyMarkdown:draft.body_markdown,currentState:draft.current_state,indexSummary:draft.index_summary,evidenceQuotes:draft.evidence_quotes,evidenceTerms:draft.evidence_terms})});setDraft(d.candidate);onSaved(d.candidate)}finally{setSaving(false)}}
  return <article style={{padding:"8px 0",borderTop:"0.5px solid rgba(0,0,0,.06)"}}>
    <input style={field} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/>
    <textarea rows={3} style={field} value={draft.body_markdown} onChange={e=>setDraft({...draft,body_markdown:e.target.value})}/>
    <input style={field} value={draft.current_state} onChange={e=>setDraft({...draft,current_state:e.target.value})}/>
    <input style={field} value={draft.index_summary} onChange={e=>setDraft({...draft,index_summary:e.target.value})}/>
    <p style={{fontSize:10,color:"#8E8E93"}}>证据：{(draft.evidence_quotes||[]).join(" / ")}</p>
    <button style={button} disabled={saving||busy} onClick={save}>{saving?"保存中…":"保存修改"}</button>
    <button style={button} disabled={busy} onClick={()=>onReview(candidate,"confirm")}>确认入库</button>
    <button style={{...button,color:"#FF3B30",background:"transparent"}} disabled={busy} onClick={()=>onReview(candidate,"reject")}>拒绝</button>
  </article>;
}
export default function TimelineImportSettings(){
  const input=useRef(null); const [imports,setImports]=useState([]); const [segments,setSegments]=useState([]);
  const [candidates,setCandidates]=useState([]); const [preview,setPreview]=useState(null); const [busy,setBusy]=useState(""); const [message,setMessage]=useState("");
  const refreshCandidates=()=>api("/timeline-candidates").then(d=>setCandidates((d.candidates||[]).filter(x=>x.status==="suggested")));
  useEffect(()=>{api("/timeline-imports").then(d=>setImports(d.imports||[])).catch(e=>setMessage(e.message));refreshCandidates().catch(e=>setMessage(e.message));},[]);
  async function upload(event){
    const file=event.target.files?.[0]; event.target.value=""; if(!file)return;
    if(file.size>1500000)return setMessage("文件不能超过 1.5MB。");
    try{setBusy("upload");const exportData=JSON.parse(await file.text());const d=await api("/timeline-imports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sourceFilename:file.name,exportData})});setImports(x=>[d.import,...x]);setSegments(d.segments||[]);setMessage(`已分成 ${d.import.segment_count} 个片段，尚未发送给记忆模型。`);}
    catch(e){setMessage(e.message)}finally{setBusy("")}
  }
  async function openImport(item){try{const d=await api(`/timeline-imports/${item.id}/segments`);setSegments(d.segments||[]);setPreview(null)}catch(e){setMessage(e.message)}}
  async function show(segment){try{const d=await api(`/timeline-segments/${segment.id}`);setPreview(d.segment)}catch(e){setMessage(e.message)}}
  async function generate(segment){try{setBusy(segment.id);const d=await api(`/timeline-segments/${segment.id}/generate`,{method:"POST"});setCandidates(x=>[...(d.candidates||[]),...x.filter(c=>c.segment_id!==segment.id)]);setSegments(x=>x.map(s=>s.id===segment.id?{...s,status:"generated"}:s));setMessage(`生成了 ${d.candidates.length} 条候选日记。`)}catch(e){setMessage(e.message)}finally{setBusy("")}}
  async function generateTestBatch(){const pending=segments.filter(s=>s.status==="pending").slice(0,10);if(!pending.length)return setMessage("没有待处理片段。");if(!window.confirm(`将依次调用记忆 API 处理 ${pending.length} 个片段，继续吗？`))return;for(const segment of pending)await generate(segment);setMessage(`测试批次处理完成：${pending.length} 个片段。`)}
  async function review(candidate,action){try{setBusy(candidate.id);await api(`/timeline-candidates/${candidate.id}/${action}`,{method:"POST"});setCandidates(x=>x.filter(c=>c.id!==candidate.id));setMessage(action==="confirm"?"已加入正式时间线。":"已拒绝，不会进入时间线。") }catch(e){setMessage(e.message)}finally{setBusy("")}}
  return <details style={{marginTop:14,borderTop:"0.5px solid rgba(0,0,0,.06)",paddingTop:14}}>
    <summary style={{fontSize:12,fontWeight:500,cursor:"pointer"}}>Claude 对话导入与候选日记</summary>
    <p style={{fontSize:10.5,color:"#8E8E93"}}>上传后只在数据库分段；点击“生成候选”才会把该片段发送给独立记忆模型。</p>
    <button type="button" style={button} disabled={busy==="upload"} onClick={()=>input.current?.click()}>{busy==="upload"?"解析中…":"上传 Claude JSON"}</button>
    <input ref={input} hidden type="file" accept=".json,application/json" onChange={upload}/>
    {message&&<p style={{fontSize:10.5,color:message.includes("不能")?"#FF3B30":"#8E8E93"}}>{message}</p>}
    {imports.map(item=><button key={item.id} type="button" onClick={()=>openImport(item)} style={{...button,display:"block",width:"100%",textAlign:"left",marginTop:6}}>{item.title} · {item.message_count} 条 · {item.segment_count} 段</button>)}
    {!!segments.length&&<><button type="button" style={{...button,marginTop:8}} disabled={!!busy} onClick={generateTestBatch}>测试前 10 个待处理片段</button><div style={{marginTop:8,maxHeight:220,overflowY:"auto"}}>{segments.map(s=><div key={s.id} style={{display:"flex",gap:5,alignItems:"center",padding:"5px 0",borderTop:"0.5px solid rgba(0,0,0,.05)",fontSize:10}}><span style={{flex:1}}>#{s.sequence} · {new Date(s.started_at).toLocaleString()} · {s.message_count}条 · {s.status}</span><button style={button} onClick={()=>show(s)}>预览</button><button style={button} disabled={busy===s.id} onClick={()=>generate(s)}>{busy===s.id?"生成中…":"生成候选"}</button></div>)}</div></>}
    {preview&&<pre style={{whiteSpace:"pre-wrap",maxHeight:220,overflow:"auto",fontSize:9.5,background:"rgba(0,0,0,.025)",padding:8,borderRadius:8}}>{preview.cleaned_transcript}</pre>}
    {!!candidates.length&&<div><h4 style={{fontSize:11}}>待确认候选 ({candidates.length})</h4>{candidates.map(c=><CandidateEditor key={c.id} candidate={c} busy={busy===c.id} onReview={review} onSaved={saved=>setCandidates(x=>x.map(v=>v.id===saved.id?saved:v))}/>)}</div>}
  </details>;
}

import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

const button={border:0,borderRadius:12,padding:"7px 10px",fontSize:10.5,cursor:"pointer"};
const anchorLabels={people_places:"人名 / 地点",event_names:"事件名称",key_objects:"关键物品",special_phrases:"特殊表达",synonyms:"常见同义说法",final_state_terms:"最后状态"};

function Evidence({items=[]}){
  return <details><summary style={{fontSize:10,cursor:"pointer",color:"#6E6E73"}}>查看原文证据（{items.length}）</summary><div style={{marginTop:6}}>{items.map(item=><blockquote key={item.messageNumber} style={{margin:"5px 0",padding:"7px 9px",borderLeft:"2px solid #C7C7CC",fontSize:10,lineHeight:1.5,whiteSpace:"pre-wrap"}}><b>M{item.messageNumber} · {item.role}</b><br/>{item.quote}</blockquote>)}</div></details>;
}

function BatchCard({batch,busy,onVerify}){
  const experiences=batch.memory_experience_candidates||[];
  const notes=batch.memory_knowledge_notes||[];
  const handoffs=batch.memory_handoff_candidates||[];
  const patches=batch.memory_knowledge_patch_candidates||[];
  return <article style={{marginTop:10,padding:12,border:"0.5px solid rgba(0,0,0,.09)",borderRadius:14,background:"rgba(255,255,255,.7)"}}>
    <div style={{fontSize:10,color:"#8E8E93"}}>片段 #{batch.imported_conversation_segments?.sequence} · {new Date(batch.imported_conversation_segments?.started_at).toLocaleString()} · 提取模型：{batch.extraction_model}</div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginTop:8}}><span style={{fontSize:10,color:batch.status==="verified"?"#248A3D":"#AF7A28"}}>{batch.status==="verified"?`已由 ${batch.verification_model} 校验` : "尚未由强模型校验"}</span><button style={{...button,background:"#1C1C1E",color:"white"}} disabled={busy} onClick={()=>onVerify(batch)}>{busy?"校验中…":batch.status==="verified"?"重新校验与合并":"校验并生成文档修改"}</button></div>
    <h4 style={{fontSize:12,margin:"10px 0 5px"}}>经历候选（{experiences.length}）</h4>
    {!experiences.length&&<p style={{fontSize:10,color:"#8E8E93"}}>模型判断没有值得长期保留的经历。</p>}
    {experiences.map(item=><section key={item.id} style={{padding:"9px 0",borderTop:"0.5px solid rgba(0,0,0,.06)"}}><div style={{display:"flex",justifyContent:"space-between",gap:8}}><b style={{fontSize:11}}>{item.title}</b><span style={{fontSize:9.5,color:item.verification_status==="verified"?"#248A3D":item.verification_status==="needs_revision"?"#C9342D":"#8E8E93"}}>{item.verification_status==="verified"?"原文校验通过":item.verification_status==="needs_revision"?"发现失真，需修订":"未校验"}</span></div>{item.verification_notes&&<p style={{fontSize:9.5,color:item.verification_status==="needs_revision"?"#C9342D":"#636366"}}>校验说明：{item.verification_notes}</p>}<div style={{fontSize:10.5,lineHeight:1.6,whiteSpace:"pre-wrap",margin:"5px 0"}}>{item.narrative_markdown}</div><div style={{fontSize:10,color:"#636366"}}><b>片段结束状态：</b>{item.current_state}</div><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:5,margin:"7px 0"}}>{Object.entries(anchorLabels).map(([key,label])=><div key={key} style={{padding:6,borderRadius:8,background:"rgba(0,0,0,.025)",fontSize:9.5}}><b>{label}</b><br/>{(item.search_anchors?.[key]||[]).join("、")||"—"}</div>)}</div><Evidence items={item.evidence_refs}/></section>)}
    <h4 style={{fontSize:12,margin:"12px 0 5px"}}>Knowledge File 素材（{notes.length}）</h4>
    {notes.map(item=><section key={item.id} style={{padding:"8px 0",borderTop:"0.5px solid rgba(0,0,0,.06)",fontSize:10.5}}><b>建议归入：{item.suggested_document_name}</b><div style={{whiteSpace:"pre-wrap",margin:"5px 0"}}>{item.note_markdown}</div><Evidence items={item.evidence_refs}/></section>)}
    {!!patches.length&&<><h4 style={{fontSize:12,margin:"12px 0 5px"}}>校验后的文档修改预览（{patches.length}）</h4>{patches.map(item=><section key={item.id} style={{padding:"9px",marginTop:6,borderRadius:10,background:"rgba(52,199,89,.055)",fontSize:10.5}}><b>{item.document_name}</b><p style={{color:"#636366"}}>{item.change_summary}</p><details><summary style={{cursor:"pointer"}}>修改前</summary><pre style={{whiteSpace:"pre-wrap",maxHeight:180,overflow:"auto",fontSize:9.5}}>{item.previous_content||"（新建文档）"}</pre></details><details><summary style={{cursor:"pointer"}}>修改后</summary><pre style={{whiteSpace:"pre-wrap",maxHeight:220,overflow:"auto",fontSize:9.5}}>{item.proposed_content}</pre></details><Evidence items={item.evidence_refs}/><p style={{fontSize:9.5,color:"#AF7A28"}}>仅为建议，尚未写入 Knowledge File。</p></section>)}</>}
    <h4 style={{fontSize:12,margin:"12px 0 5px"}}>窗口交接素材（{handoffs.length}）</h4>
    {handoffs.map(item=><section key={item.id} style={{fontSize:10.5}}><div style={{whiteSpace:"pre-wrap"}}>{item.body_markdown}</div><p><b>未完事项：</b>{(item.open_loops||[]).join("、")||"无"}</p><Evidence items={item.evidence_refs}/></section>)}
    <p style={{fontSize:9.5,color:"#AF7A28",marginBottom:0}}>目前只是提取原料，尚未经过强模型校验，也不会注入聊天。</p>
  </article>;
}

export default function MemoryPracticeSettings(){
  const [imports,setImports]=useState([]);const [segments,setSegments]=useState([]);const [batches,setBatches]=useState([]);const [busy,setBusy]=useState("");const [message,setMessage]=useState("");
  const refresh=useCallback(()=>api("/memory-practice/batches").then(data=>setBatches(data.batches||[])),[]);
  useEffect(()=>{Promise.all([api("/timeline-imports"),api("/memory-practice/batches")]).then(([importsData,batchesData])=>{setImports(importsData.imports||[]);setBatches(batchesData.batches||[])}).catch(error=>setMessage(error.message));},[]);
  async function openImport(item){try{setBusy("imports");const data=await api(`/timeline-imports/${item.id}/segments`);setSegments(data.segments||[]);setMessage("选择一个较短的片段先做提取测试。")}catch(error){setMessage(error.message)}finally{setBusy("")}}
  async function extract(segment){if(!window.confirm("这一步会调用便宜模型两次：一次提取经历，一次提取 Knowledge File 与交接素材。格式不合格时其中一步可能重试一次。继续吗？"))return;try{setBusy(segment.id);setMessage("正在分两步提取：先生成经历与证据，再生成文档和交接素材…");await api(`/memory-practice/segments/${segment.id}/extract`,{method:"POST"});await refresh();setMessage("提取完成。结果只保存在候选区，尚未进入正式记忆。 ")}catch(error){setMessage(error.message)}finally{setBusy("")}}
  async function verify(batch){try{setBusy(batch.id);setMessage("强模型正在逐条对照原文，并生成 Knowledge File 修改前后预览…");await api(`/memory-practice/batches/${batch.id}/verify`,{method:"POST"});await refresh();setMessage("校验完成。请检查失真标记、原文证据和文档修改预览；目前仍未写入正式记忆。 ")}catch(error){setMessage(error.message)}finally{setBusy("")}}
  return <div><p style={{fontSize:10.5,color:"#636366",lineHeight:1.6}}>这是新记忆系统的独立实验区。旧 Timeline 不会被修改；目前先验证“原文 → 有证据的结构化素材”。</p>{message&&<p role="status" style={{fontSize:10.5,color:"#8E8E93",whiteSpace:"pre-wrap"}}>{message}</p>}
    <div>{imports.map(item=><button key={item.id} style={{...button,display:"block",width:"100%",textAlign:"left",marginTop:5}} disabled={busy==="imports"} onClick={()=>openImport(item)}>{item.title} · {item.message_count} 条 · {item.segment_count} 段</button>)}</div>
    {!!segments.length&&<div style={{maxHeight:220,overflow:"auto",marginTop:8}}>{segments.map(segment=><div key={segment.id} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 0",borderTop:"0.5px solid rgba(0,0,0,.06)",fontSize:10}}><span style={{flex:1}}>#{segment.sequence} · {new Date(segment.started_at).toLocaleString()} · {segment.message_count} 条</span><button style={button} disabled={!!busy} onClick={()=>extract(segment)}>{busy===segment.id?"提取中…":"提取新素材"}</button></div>)}</div>}
    <h3 style={{fontSize:12,marginTop:15}}>新流程候选批次</h3>{!batches.length&&<p style={{fontSize:10,color:"#8E8E93"}}>尚未生成新流程候选。</p>}{batches.map(batch=><BatchCard key={batch.id} batch={batch} busy={busy===batch.id} onVerify={verify}/>)}</div>;
}

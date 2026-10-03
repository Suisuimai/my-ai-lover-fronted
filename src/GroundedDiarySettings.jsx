import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { syncLatestGroundedDiary } from "./diarySync.js";

const panel = { border:"0.5px solid rgba(0,0,0,.07)", borderRadius:16, padding:14, background:"rgba(255,255,255,.72)" };
const softButton = {border:"0.5px solid rgba(0,0,0,.08)",borderRadius:999,padding:"6px 10px",background:"#F1EFE9",color:"#3C3C3E",fontSize:10,cursor:"pointer"};

function latestBy(items, key) { const map=new Map(); for(const item of items||[])if(!map.has(item[key]))map.set(item[key],item); return map; }

export function DiaryBackgroundSync() {
  useEffect(()=>{ syncLatestGroundedDiary().catch((error)=>console.info("Diary background sync deferred:",error.message)); },[]);
  return null;
}

function dayLabel(value) {
  if(!value)return "日期未知";
  return new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",year:"numeric",month:"long",day:"numeric",weekday:"short"}).format(new Date(`${value}T12:00:00+08:00`));
}

function diaryFailureLabel(code) {
  const labels={empty_reply:"整理模型没有返回内容，可以重试",output_length:"这一天内容较多，模型输出被截断，可以重试",invalid_json:"整理模型返回的格式不完整，可以重试",source_message_missing:"有一条原始消息暂时无法读取",diary_generation_failed:"整理时发生临时错误，可以重试"};
  return labels[code]||`整理失败（${code||"原因未知"}）`;
}

function sentencesOf(text){return String(text||"").split(/(?<=[。！？!?])|\n+/).map((part)=>part.trim()).filter(Boolean);}
function noteLabel(event){return event.event_kind==="relationship_note_added"?"妤妤留在这一天的话":"妤妤后来的补充";}

function DiaryBody({text,events}) {
  const [openAnchor,setOpenAnchor]=useState("");
  const notes=(events||[]).filter((event)=>["factual_note_added","relationship_note_added"].includes(event.event_kind));
  const whole=notes.filter((event)=>event.anchor_kind==="entry");
  return <>
    <div style={{fontSize:11.5,lineHeight:1.75,color:"#3C3C3E",marginTop:9}}>{sentencesOf(text).map((sentence,index)=>{
      const anchored=notes.filter((event)=>event.anchor_kind==="sentence"&&event.anchor_text===sentence); const key=`${index}-${sentence.slice(0,20)}`;
      return <span key={key}>{sentence}{anchored.length>0&&<button type="button" onClick={()=>setOpenAnchor(openAnchor===key?"":key)} title="查看妤妤的批注" style={{border:0,background:"none",color:"#A66C55",padding:"0 2px",cursor:"pointer",fontSize:12}}>●</button>} {openAnchor===key&&<span style={{display:"block",margin:"5px 0 8px",padding:"7px 9px",borderLeft:"2px solid #D8B7A8",background:"#FBF7F3",fontSize:10.5}}>{anchored.map((event)=><span key={event.id} style={{display:"block",marginBottom:3}}><b>{noteLabel(event)}：</b>{event.content}</span>)}</span>}</span>;
    })}</div>
    {whole.length>0&&<div style={{marginTop:10,paddingTop:8,borderTop:"0.5px solid rgba(0,0,0,.06)"}}>{whole.map((event)=><div key={event.id} style={{fontSize:10.5,lineHeight:1.6,color:"#6E5146",marginBottom:5}}><b>{noteLabel(event)}：</b>{event.content}</div>)}</div>}
  </>;
}

function SourceMessages({entryId}) {
  const [open,setOpen]=useState(false); const [messages,setMessages]=useState(null); const [error,setError]=useState("");
  async function toggle(){const next=!open;setOpen(next);if(!next||messages)return;try{const data=await api(`/diary/entries/${entryId}/sources`);setMessages(data.messages||[]);}catch(reason){setError(reason.message);}}
  return <div style={{marginTop:10}}><button type="button" onClick={toggle} style={{border:0,background:"none",padding:0,color:"#8E8E93",fontSize:10.5,cursor:"pointer"}}>{open?"收起原话 ↑":"查看当天原话 ↓"}</button>{open&&<div style={{marginTop:9,borderLeft:"2px solid #E6E2D9",paddingLeft:10,maxHeight:260,overflowY:"auto"}}>{error&&<p style={{fontSize:10.5,color:"#B33A3A"}}>{error}</p>}{!messages&&!error&&<p style={{fontSize:10.5,color:"#8E8E93"}}>正在读取原话…</p>}{(messages||[]).map((message)=><div key={message.id} style={{marginBottom:10}}><div style={{fontSize:9.5,color:"#A1A1A6"}}>{message.role==="user"?"年妤":"季疏"} · {new Date(message.occurredAt).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai"})}</div><div style={{fontSize:11,lineHeight:1.65,whiteSpace:"pre-wrap",color:"#3C3C3E"}}>{message.content}</div></div>)}</div>}</div>;
}

function AnnotationComposer({entry,onSaved,onError}) {
  const [channel,setChannel]=useState("relationship"); const [anchor,setAnchor]=useState(""); const [content,setContent]=useState(""); const [saving,setSaving]=useState(false);
  async function save(){if(!content.trim())return;try{setSaving(true);await api(`/diary/entries/${entry.id}/review`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:channel==="relationship"?"add_relationship_note":"add_factual_note",content,anchorKind:anchor?"sentence":"entry",anchorText:anchor||null})});setContent("");setAnchor("");await onSaved();}catch(error){onError(error.message);}finally{setSaving(false);}}
  return <details style={{marginTop:10}}><summary style={{fontSize:10.5,color:"#7D675D",cursor:"pointer"}}>给这一天留句话</summary><div style={{display:"grid",gap:7,marginTop:8}}>
    <select value={channel} onChange={(event)=>setChannel(event.target.value)} style={{padding:7,border:"0.5px solid #DDD7CF",borderRadius:9,background:"white",fontSize:10.5}}><option value="relationship">关系留言：感受、回应、撒娇</option><option value="factual">后来补充的背景</option></select>
    <select value={anchor} onChange={(event)=>setAnchor(event.target.value)} style={{padding:7,border:"0.5px solid #DDD7CF",borderRadius:9,background:"white",fontSize:10.5}}><option value="">挂在整篇日记末尾</option>{sentencesOf(entry.body_markdown).map((sentence,index)=><option key={`${index}-${sentence}`} value={sentence}>挂在：{sentence.slice(0,45)}</option>)}</select>
    <textarea value={content} onChange={(event)=>setContent(event.target.value)} rows={3} placeholder={channel==="relationship"?"写下你想留在这一天旁边的话…":"写下你后来确认的背景；它不会伪装成当日原话。"} style={{resize:"vertical",padding:9,border:"0.5px solid #DDD7CF",borderRadius:10,fontSize:11,lineHeight:1.6}}/>
    <button type="button" onClick={save} disabled={saving||!content.trim()} style={{...softButton,justifySelf:"start",opacity:saving||!content.trim()?0.55:1}}>{saving?"正在保存…":"保存批注"}</button>
  </div></details>;
}

function SourceIndexControl({onError}) {
  const [status,setStatus]=useState(null); const [building,setBuilding]=useState(false);
  const [testQuery,setTestQuery]=useState(""); const [testResult,setTestResult]=useState(null); const [testing,setTesting]=useState(false);
  const load=useCallback(async()=>{try{const data=await api("/memory-index/status");setStatus(data.status);}catch(error){onError(error.message);}},[onError]);
  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect -- index status is loaded from the authenticated backend.
    load();
  },[load]);
  async function build(){
    if(status?.embeddingConfigured&&!window.confirm(`将使用 ${status.embeddingModel} 为相邻原话窗口建立语义坐标。此操作会调用 embedding API；是否收费由你使用的服务商决定。继续吗？`))return;
    try{setBuilding(true);let next=status;for(let step=0;step<5;step+=1){const data=await api("/memory-index/build",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({includeEmbeddings:true,embeddingLimit:192})});next=data.status;setStatus(next);if(next.lexicalCount>=next.sourceCount&&(!next.embeddingConfigured||next.embeddingCount>=next.sourceCount))break;}}catch(error){onError(error.message);}finally{setBuilding(false);}
  }
  async function testRecall(){
    try{setTesting(true);setTestResult(null);const data=await api("/memory-index/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:testQuery})});setTestResult(data.test);}catch(error){onError(error.message);}finally{setTesting(false);}
  }
  if(!status)return null;
  const total=status.windowCount??status.sourceCount; const complete=status.lexicalCount>=total&&(!status.embeddingConfigured||status.embeddingCount>=total);
  return <details style={{...panel,marginBottom:10}}><summary style={{fontSize:10.5,color:"#6E6E73",cursor:"pointer"}}>原文索引 {complete?"· 已建立":"· 尚未完成"}</summary><div style={{marginTop:8,fontSize:10.5,lineHeight:1.6,color:"#6E6E73"}}>
    <div>相邻原话窗口：{total} 个（窗口里仍是原始消息，不生成摘要）</div><div>字词坐标：{status.lexicalCount}/{total}</div><div>{status.embeddingConfigured?`语义坐标（${status.embeddingModel}）：${status.embeddingCount}/${total}`:"语义坐标：尚未在“API 与模型”分配 embedding 模型"}</div>
    {!complete&&<button type="button" onClick={build} disabled={building} style={{...softButton,marginTop:7}}>{building?"正在建立，关闭页面后可继续…":status.lexicalCount?"继续建立索引":"建立原文索引"}</button>}
    {status.lexicalCount>0&&<details style={{marginTop:9}}><summary style={{cursor:"pointer"}}>检索测试（不写入、不注入聊天）</summary><div style={{display:"grid",gap:6,marginTop:7}}><input value={testQuery} onChange={(event)=>setTestQuery(event.target.value)} placeholder="输入接近原话、换一种说法，或不存在的事" style={{border:"0.5px solid rgba(0,0,0,.12)",borderRadius:10,padding:"8px 9px",fontSize:10.5}}/><button type="button" onClick={testRecall} disabled={testing||!testQuery.trim()} style={softButton}>{testing?"正在检索…":"测试这句话"}</button>{testResult&&<div style={{padding:"8px",borderRadius:10,background:testResult.found?"#F1F7F0":"#FFF4F2"}}><strong>{testResult.found?`通过门槛：${testResult.accepted.map((item)=>item.dayKey).join("、")}`:"没有达到可靠门槛的已确认日记"}</strong><div>BM25 过门槛：{testResult.lexical.length} 个生活日</div><div>{testResult.embeddingModel?`${testResult.embeddingModel} 排名结果：${testResult.semantic.length} 个生活日（未标定，只参与排序）`:"本次没有使用语义坐标"}</div></div>}</div></details>}
  </div></details>;
}

export default function GroundedDiarySettings() {
  const [state,setState]=useState({days:[],entries:[],jobs:[],reviewEvents:[]}); const [loading,setLoading]=useState(true); const [message,setMessage]=useState(""); const [action,setAction]=useState("");
  const load=useCallback(async(prepare=false)=>{try{const data=prepare?await syncLatestGroundedDiary():await(async()=>{const [days,entries,jobs,reviews]=await Promise.all([api("/diary/shared-days"),api("/diary/entries"),api("/diary/jobs"),api("/diary/review-events")]);return{days:days.days||[],entries:entries.entries||[],jobs:jobs.jobs||[],reviewEvents:reviews.events||[]};})();setState(data);setMessage("");}catch(error){setMessage(error.message);}finally{setLoading(false);}},[]);
  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial authenticated data is loaded asynchronously.
    load(true);
  },[load]); const active=state.jobs.some((job)=>["queued","running"].includes(job.status));
  useEffect(()=>{if(!active)return undefined;const timer=window.setInterval(()=>load(false),3000);return()=>window.clearInterval(timer);},[active,load]);
  const daysById=useMemo(()=>new Map(state.days.map((day)=>[day.id,day])),[state.days]); const entries=useMemo(()=>[...latestBy(state.entries,"shared_day_id").values()],[state.entries]); const jobs=useMemo(()=>latestBy(state.jobs,"shared_day_id"),[state.jobs]);
  const eventsByDay=useMemo(()=>{const map=new Map();for(const event of state.reviewEvents||[]){if(!map.has(event.shared_day_id))map.set(event.shared_day_id,[]);map.get(event.shared_day_id).push(event);}return map;},[state.reviewEvents]);

  async function postReview(entry,payload){try{setMessage("正在保存妤妤的确认…");await api(`/diary/entries/${entry.id}/review`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});await load(false);}catch(error){setMessage(error.message);}}
  async function retry(dayId){try{setMessage("正在重新整理这一天…");await api(`/diary/shared-days/${dayId}/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({retry:true})});await load(false);}catch(error){setMessage(error.message);}}
  async function generateSample(){if(!window.confirm("将挑选 3 个旧生活日生成正式日记，用于验收。继续吗？"))return;try{setAction("sample");setMessage("正在建立 3 篇验收样本…");await api("/diary/backfill-sample",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({count:3})});await load(false);}catch(error){setMessage(error.message);}finally{setAction("");}}
  async function endToday(){if(!window.confirm("确认今天的相处已经结束，并立即开始写日记吗？"))return;try{setAction("seal");setMessage("正在刷新今天的原话并封存…");await api("/diary/shared-days/rebuild",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});const refreshed=await api("/diary/shared-days");const open=(refreshed.days||[]).find((day)=>day.latestVersion?.boundary_state==="open");if(!open){setMessage("当前没有尚未结束的相处记录。");return;}await api(`/diary/shared-days/${open.id}/seal`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});await api(`/diary/shared-days/${open.id}/generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});await load(false);}catch(error){setMessage(error.message);}finally{setAction("");}}

  return <div style={{marginTop:12}}><div style={{marginBottom:12}}><h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:21,fontWeight:400,margin:0}}>共同生活日记</h3><p style={{fontSize:10.5,color:"#8E8E93",lineHeight:1.55,margin:"4px 0 0"}}>从早安到晚安。红点放着不会影响聊天；只确认你愿意担保的内容。</p></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7,marginBottom:12}}><button type="button" onClick={generateSample} disabled={Boolean(action)} style={{...softButton,borderRadius:12}}>{action==="sample"?"正在挑选…":"生成 3 篇验收样本"}</button><button type="button" onClick={endToday} disabled={loading||Boolean(action)} style={{border:0,borderRadius:12,padding:"9px 8px",background:!loading?"#1C1C1E":"#E5E5E5",fontSize:10.5,color:!loading?"#fff":"#A1A1A6"}}>{action==="seal"?"正在结束…":"结束今天并写日记"}</button></div>
    {message&&<p style={{fontSize:10.5,color:message.includes("正在")?"#8E6A2F":"#A63D40",lineHeight:1.5}}>{message}</p>}<SourceIndexControl onError={setMessage}/>{loading&&<div style={panel}><span style={{fontSize:11,color:"#8E8E93"}}>正在读取共同生活日记…</span></div>}{!loading&&entries.length===0&&<div style={panel}><p style={{fontSize:12,margin:0}}>还没有完成的日记。</p></div>}
    <div style={{display:"grid",gap:10}}>{entries.map((entry)=>{const day=daysById.get(entry.shared_day_id);const review=entry.status==="needs_review";const events=eventsByDay.get(entry.shared_day_id)||[];const wholeEvents=events.filter((event)=>["entry_confirmed","entry_confirmation_revoked"].includes(event.event_kind));const canRevoke=wholeEvents.at(-1)?.event_kind==="entry_confirmed";return <article key={entry.id} style={{...panel,borderColor:review?"rgba(166,61,64,.22)":"rgba(0,0,0,.07)",background:review?"#FFF8F7":"rgba(255,255,255,.72)"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:10}}><div><div style={{fontSize:9.5,color:"#A1A1A6",marginBottom:4}}>{dayLabel(day?.day_key)}</div><strong style={{fontFamily:"'Cormorant Garamond','Noto Sans KR',serif",fontSize:17,fontWeight:500}}>{entry.title}</strong></div>{review&&<span title="有内容等待妤妤判断" style={{width:9,height:9,borderRadius:"50%",background:"#C84B4F",marginTop:4}}/>}</div>
      <DiaryBody text={entry.body_markdown} events={events}/>{entry.current_state&&<div style={{fontSize:10.5,color:"#6E6E73",marginTop:10,paddingTop:8,borderTop:"0.5px solid rgba(0,0,0,.06)"}}>那天结束时：{entry.current_state}</div>}
      {review&&<details style={{marginTop:10}}><summary style={{fontSize:10.5,color:"#A63D40",cursor:"pointer"}}>查看需要妤妤判断的地方</summary><div style={{marginTop:8}}>{(entry.validation_issues||[]).map((issue,index)=><div key={`${issue.kind}-${index}`} style={{padding:"8px 0",borderBottom:"0.5px solid rgba(0,0,0,.06)",fontSize:10.5,lineHeight:1.55}}><div>{issue.text||"这篇日记目前保持草稿状态"}</div>{(issue.reasons||[]).map((reason)=><div key={reason} style={{color:"#8B5E5F"}}>• {reason}</div>)}{!["manual_retraction","imported_draft"].includes(issue.kind)&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}><button style={softButton} onClick={()=>postReview(entry,{action:"confirm_fact",issueIndex:index})}>这条是对的</button><button style={softButton} onClick={()=>window.confirm("确认这条说法不成立，并在新版本中排除它吗？")&&postReview(entry,{action:"exclude_fact",issueIndex:index})}>排除</button><button style={softButton} onClick={()=>{const value=window.prompt("请写下正确的说法。它会标记为妤妤后来的确认，不会伪装成当日原话。");if(value?.trim())postReview(entry,{action:"correct_fact",issueIndex:index,replacementText:value});}}>改对</button></div>}</div>)}</div><div style={{display:"flex",gap:7,marginTop:9}}><button style={{...softButton,background:"#1C1C1E",color:"white"}} onClick={()=>window.confirm("整篇通过表示你愿意为这篇日记签字。确认吗？")&&postReview(entry,{action:"confirm_entry"})}>整篇确认</button></div></details>}
      {!review&&canRevoke&&<button type="button" onClick={()=>window.confirm("撤回后，这篇日记会回到草稿态，历史仍然保留。继续吗？")&&postReview(entry,{action:"revoke_entry"})} style={{border:0,background:"none",padding:"8px 0 0",fontSize:10,color:"#8E8E93",cursor:"pointer"}}>撤回整篇确认</button>}
      <AnnotationComposer entry={entry} onSaved={()=>load(false)} onError={setMessage}/><SourceMessages entryId={entry.id}/>
    </article>;})}
    {[...jobs.values()].filter((job)=>job.status==="failed"&&!entries.some((entry)=>entry.shared_day_id===job.shared_day_id)).map((job)=><article key={job.id} style={{...panel,background:"#FFF8F7"}}><strong style={{fontSize:12}}>这篇日记没有生成成功</strong><p style={{fontSize:10.5,color:"#6E3E3F"}}>{diaryFailureLabel(job.error_code)}</p><button style={softButton} onClick={()=>retry(job.shared_day_id)}>重试</button></article>)}{[...jobs.values()].filter((job)=>["queued","running"].includes(job.status)).map((job)=><div key={job.id} style={panel}><span style={{fontSize:10.5,color:"#8E8E93"}}>正在后台整理 {dayLabel(daysById.get(job.shared_day_id)?.day_key)}…</span></div>)}</div>
  </div>;
}

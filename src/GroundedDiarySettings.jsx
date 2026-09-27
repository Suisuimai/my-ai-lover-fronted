import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import { syncLatestGroundedDiary } from "./diarySync.js";

const panel = { border:"0.5px solid rgba(0,0,0,.07)", borderRadius:16, padding:14, background:"rgba(255,255,255,.72)" };

function latestBy(items, key) {
  const map = new Map();
  for (const item of items || []) if (!map.has(item[key])) map.set(item[key], item);
  return map;
}

export function DiaryBackgroundSync() {
  useEffect(() => {
    syncLatestGroundedDiary().catch((error) => console.info("Diary background sync deferred:", error.message));
  }, []);
  return null;
}

function dayLabel(value) {
  if (!value) return "日期未知";
  return new Intl.DateTimeFormat("zh-CN", { timeZone:"Asia/Shanghai", year:"numeric", month:"long", day:"numeric", weekday:"short" })
    .format(new Date(`${value}T12:00:00+08:00`));
}

function SourceMessages({ entryId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState("");
  async function toggle() {
    const next = !open; setOpen(next);
    if (!next || messages) return;
    try { const data = await api(`/diary/entries/${entryId}/sources`); setMessages(data.messages || []); }
    catch (reason) { setError(reason.message); }
  }
  return <div style={{marginTop:10}}>
    <button type="button" onClick={toggle} style={{border:0,background:"none",padding:0,color:"#8E8E93",fontSize:10.5,cursor:"pointer"}}>
      {open ? "收起原话" : "查看当天原话"} <span aria-hidden="true">{open ? "↑" : "↓"}</span>
    </button>
    {open && <div style={{marginTop:9,borderLeft:"2px solid #E6E2D9",paddingLeft:10,maxHeight:260,overflowY:"auto"}}>
      {error && <p style={{fontSize:10.5,color:"#B33A3A"}}>{error}</p>}
      {!messages && !error && <p style={{fontSize:10.5,color:"#8E8E93"}}>正在读取原话…</p>}
      {(messages || []).map((message) => <div key={message.id} style={{marginBottom:10}}>
        <div style={{fontSize:9.5,color:"#A1A1A6"}}>{message.role === "user" ? "年妤" : "季疏"} · {new Date(message.occurredAt).toLocaleString("zh-CN", {timeZone:"Asia/Shanghai"})}</div>
        <div style={{fontSize:11,lineHeight:1.65,whiteSpace:"pre-wrap",color:"#3C3C3E"}}>{message.content}</div>
      </div>)}
    </div>}
  </div>;
}

export default function GroundedDiarySettings() {
  const [state, setState] = useState({ days:[], entries:[], jobs:[] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const load = useCallback(async (prepare = false) => {
    try {
      const data = prepare ? await syncLatestGroundedDiary() : await (async () => {
        const [days, entries, jobs] = await Promise.all([api("/diary/shared-days"), api("/diary/entries"), api("/diary/jobs")]);
        return { days:days.days || [], entries:entries.entries || [], jobs:jobs.jobs || [] };
      })();
      setState(data); setMessage("");
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data is loaded from the authenticated backend.
    load(true);
  }, [load]);
  const active = state.jobs.some((job) => ["queued", "running"].includes(job.status));
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => load(false), 3000);
    return () => window.clearInterval(timer);
  }, [active, load]);

  const daysById = useMemo(() => new Map(state.days.map((day) => [day.id, day])), [state.days]);
  const entries = useMemo(() => [...latestBy(state.entries, "shared_day_id").values()], [state.entries]);
  const jobs = useMemo(() => latestBy(state.jobs, "shared_day_id"), [state.jobs]);
  const redCount = entries.filter((entry) => entry.status === "needs_review").length
    + [...jobs.values()].filter((job) => job.status === "failed" && !entries.some((entry) => entry.shared_day_id === job.shared_day_id)).length;

  async function retry(sharedDayId) {
    try {
      setMessage("正在重新整理这一天…");
      await api(`/diary/shared-days/${sharedDayId}/generate`, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({retry:true}),
      });
      await load(false);
    } catch (error) { setMessage(error.message); }
  }

  return <div style={{marginTop:12}}>
    <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:12,marginBottom:12}}>
      <div><h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:21,fontWeight:400,margin:0}}>共同生活日记</h3>
        <p style={{fontSize:10.5,color:"#8E8E93",lineHeight:1.55,margin:"4px 0 0"}}>从早安到晚安。事实必须能回到原话；平时无需审核。</p></div>
      {redCount > 0 && <span style={{fontSize:10,color:"#A63D40",background:"#FAEAEA",borderRadius:999,padding:"4px 8px",whiteSpace:"nowrap"}}>{redCount} 个红点</span>}
    </div>
    {message && <p style={{fontSize:10.5,color:message.includes("正在")?"#8E6A2F":"#A63D40",lineHeight:1.5}}>{message}</p>}
    {loading && <div style={panel}><span style={{fontSize:11,color:"#8E8E93"}}>正在整理日期边界…</span></div>}
    {!loading && entries.length === 0 && redCount === 0 && <div style={panel}>
      <p style={{fontSize:12,margin:0,color:"#3C3C3E"}}>还没有完成的日记。</p>
      <p style={{fontSize:10.5,lineHeight:1.6,color:"#8E8E93",margin:"5px 0 0"}}>一天在晚安后封存；如果没有说晚安，会在下一天开始后补上。生成在后台进行，不影响聊天。</p>
    </div>}
    <div style={{display:"grid",gap:10}}>
      {entries.map((entry) => {
        const day = daysById.get(entry.shared_day_id); const review = entry.status === "needs_review";
        return <article key={entry.id} style={{...panel,borderColor:review?"rgba(166,61,64,.22)":"rgba(0,0,0,.07)",background:review?"#FFF8F7":"rgba(255,255,255,.72)"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"start"}}>
            <div><div style={{fontSize:9.5,color:"#A1A1A6",marginBottom:4}}>{dayLabel(day?.day_key)}</div>
              <strong style={{fontFamily:"'Cormorant Garamond','Noto Sans KR',serif",fontSize:17,fontWeight:500}}>{entry.title}</strong></div>
            {review && <span title="有内容未通过原文校验" style={{width:9,height:9,borderRadius:"50%",background:"#C84B4F",marginTop:4,flexShrink:0}} />}
          </div>
          <div style={{whiteSpace:"pre-wrap",fontSize:11.5,lineHeight:1.75,color:"#3C3C3E",marginTop:9}}>{entry.body_markdown}</div>
          {entry.current_state && <div style={{fontSize:10.5,color:"#6E6E73",marginTop:10,paddingTop:8,borderTop:"0.5px solid rgba(0,0,0,.06)"}}>那天结束时：{entry.current_state}</div>}
          {review && <details style={{marginTop:10}}><summary style={{fontSize:10.5,color:"#A63D40",cursor:"pointer"}}>查看没有通过校验的地方</summary>
            <div style={{marginTop:7}}>{(entry.validation_issues || []).map((issue,index)=><div key={`${issue.kind}-${index}`} style={{fontSize:10.5,lineHeight:1.6,color:"#6E3E3F",marginBottom:7}}>
              {(issue.reasons || []).map((reason)=><div key={reason}>• {reason}</div>)}</div>)}</div>
            <button type="button" onClick={()=>retry(entry.shared_day_id)} style={{border:0,borderRadius:999,padding:"7px 11px",background:"#1C1C1E",color:"white",fontSize:10.5,cursor:"pointer"}}>重新整理</button>
          </details>}
          <SourceMessages entryId={entry.id}/>
        </article>;
      })}
      {[...jobs.values()].filter((job)=>job.status === "failed" && !entries.some((entry)=>entry.shared_day_id===job.shared_day_id)).map((job)=><article key={job.id} style={{...panel,background:"#FFF8F7",borderColor:"rgba(166,61,64,.22)"}}>
        <div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:9.5,color:"#A1A1A6"}}>{dayLabel(daysById.get(job.shared_day_id)?.day_key)}</div><strong style={{fontSize:12}}>这篇日记没有生成成功</strong></div><span style={{width:9,height:9,borderRadius:"50%",background:"#C84B4F"}} /></div>
        <button type="button" onClick={()=>retry(job.shared_day_id)} style={{marginTop:9,border:0,borderRadius:999,padding:"7px 11px",background:"#1C1C1E",color:"white",fontSize:10.5,cursor:"pointer"}}>重试</button>
      </article>)}
      {[...jobs.values()].filter((job)=>["queued","running"].includes(job.status)).map((job)=><div key={job.id} style={panel}><span style={{fontSize:10.5,color:"#8E8E93"}}>正在后台整理 {dayLabel(daysById.get(job.shared_day_id)?.day_key)}…</span></div>)}
    </div>
  </div>;
}

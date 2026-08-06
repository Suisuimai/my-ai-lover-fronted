import { useEffect, useState } from "react";
import { api } from "./api.js";

const KINDS = ["plan", "promise", "waiting_result", "paused_topic"];
const STATUSES = ["active", "waiting", "completed", "paused"];

function parseTriggers(value) {
  return [...new Set(String(value || "").split(/[,，、;；\n\r]+/u).map((item)=>item.trim()).filter(Boolean))];
}

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function utcDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function FollowUpEditor({ item, onSaved, onDeleted }) {
  const [draft, setDraft] = useState(item);
  const [triggerText, setTriggerText] = useState((item.triggers || []).join(", "));
  const [busy, setBusy] = useState(false);

  async function save(extra = {}) {
    setBusy(true);
    try {
      const data = await api(`/follow-ups/${item.id}`, {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          title:draft.title, kind:draft.kind, content:draft.content,
          status:draft.status, dueAt:utcDateTime(draft.due_at),
          nextStep:draft.next_step, triggers:parseTriggers(triggerText),
          allowProactive:draft.allow_proactive, ...extra,
        }),
      });
      setDraft(data.followUp);
      setTriggerText((data.followUp.triggers || []).join(", "));
      onSaved(data.followUp);
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("Delete this follow-up?")) return;
    setBusy(true);
    try {
      await api(`/follow-ups/${item.id}`, {method:"DELETE"});
      onDeleted(item.id);
    } finally { setBusy(false); }
  }

  return (
    <article style={{padding:"12px 0",borderTop:"0.5px solid rgba(0,0,0,0.06)"}}>
      <input value={draft.title} onChange={(event)=>setDraft({...draft,title:event.target.value})}
        style={{width:"100%",boxSizing:"border-box",height:32,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,padding:"0 9px",fontSize:12,fontWeight:500}} />
      <div style={{display:"flex",gap:6,marginTop:6}}>
        <select value={draft.kind} onChange={(event)=>setDraft({...draft,kind:event.target.value})}
          style={{height:30,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,fontSize:10}}>
          {KINDS.map((kind)=><option key={kind}>{kind}</option>)}
        </select>
        <select value={draft.status} onChange={(event)=>setDraft({...draft,status:event.target.value})}
          style={{height:30,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,fontSize:10}}>
          {STATUSES.map((status)=><option key={status}>{status}</option>)}
        </select>
        <input type="datetime-local" value={localDateTime(draft.due_at)}
          onChange={(event)=>setDraft({...draft,due_at:event.target.value})}
          style={{flex:1,minWidth:0,height:30,boxSizing:"border-box",border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,fontSize:9.5}} />
      </div>
      <textarea value={draft.content} onChange={(event)=>setDraft({...draft,content:event.target.value})} rows={2}
        style={{width:"100%",boxSizing:"border-box",marginTop:6,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,padding:9,fontFamily:"inherit",fontSize:11.5}} />
      <input value={draft.next_step || ""} onChange={(event)=>setDraft({...draft,next_step:event.target.value})}
        placeholder="A gentle next step"
        style={{width:"100%",boxSizing:"border-box",height:30,marginTop:6,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,padding:"0 9px",fontSize:10.5}} />
      <input value={triggerText} onChange={(event)=>setTriggerText(event.target.value)} placeholder="Related phrases"
        style={{width:"100%",boxSizing:"border-box",height:30,marginTop:6,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,padding:"0 9px",fontSize:10.5}} />
      <label style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#636366",marginTop:6}}>
        <input type="checkbox" checked={draft.allow_proactive}
          onChange={(event)=>setDraft({...draft,allow_proactive:event.target.checked})}/>
        Allow one gentle follow-up when this topic is relevant
      </label>
      <div style={{display:"flex",gap:7,marginTop:7}}>
        <button type="button" onClick={()=>save()} disabled={busy} style={{border:0,borderRadius:12,padding:"6px 10px",fontSize:10}}>Save</button>
        {!["completed","cancelled"].includes(draft.status) &&
          <button type="button" onClick={()=>save({status:"completed"})} disabled={busy} style={{border:0,borderRadius:12,padding:"6px 10px",fontSize:10}}>Complete</button>}
        <button type="button" onClick={remove} disabled={busy} style={{border:0,background:"transparent",color:"#FF3B30",fontSize:10}}>Delete</button>
      </div>
    </article>
  );
}

export default function FollowUpSettings() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState({title:"",kind:"plan",content:"",triggers:"",dueAt:"",nextStep:"",allowProactive:false});

  useEffect(() => {
    api("/follow-ups").then((data)=>setItems(data.followUps || [])).catch((error)=>setMessage(error.message));
  }, []);

  async function add() {
    setMessage("");
    try {
      const data = await api("/follow-ups", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...manual,triggers:parseTriggers(manual.triggers),dueAt:utcDateTime(manual.dueAt)}),
      });
      setItems((current)=>[data.followUp,...current]);
      setManual({title:"",kind:"plan",content:"",triggers:"",dueAt:"",nextStep:"",allowProactive:false});
    } catch (error) { setMessage(error.message); }
  }

  return (
    <details style={{marginTop:14,borderTop:"0.5px solid rgba(0,0,0,0.06)",paddingTop:14}}>
      <summary style={{fontSize:12,fontWeight:500,cursor:"pointer",color:"#1C1C1E"}}>Unfinished topics ({items.filter((item)=>!["completed","cancelled"].includes(item.status)).length})</summary>
      <p style={{fontSize:10.5,color:"#8E8E93"}}>Plans and open topics can evolve. You control whether they may be followed up.</p>
      <div style={{display:"flex",gap:6}}>
        <input value={manual.title} onChange={(event)=>setManual({...manual,title:event.target.value})} placeholder="Title"
          style={{flex:1,minWidth:0,height:30,boxSizing:"border-box",border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,padding:"0 8px",fontSize:10.5}} />
        <select value={manual.kind} onChange={(event)=>setManual({...manual,kind:event.target.value})}
          style={{height:30,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,fontSize:10}}>
          {KINDS.map((kind)=><option key={kind}>{kind}</option>)}
        </select>
      </div>
      <textarea value={manual.content} onChange={(event)=>setManual({...manual,content:event.target.value})} placeholder="What remains unfinished?" rows={2}
        style={{width:"100%",boxSizing:"border-box",marginTop:6,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,padding:9,fontFamily:"inherit",fontSize:11}} />
      <input value={manual.triggers} onChange={(event)=>setManual({...manual,triggers:event.target.value})} placeholder="Related phrases: comma, 、, semicolon, or new line"
        style={{width:"100%",boxSizing:"border-box",height:30,marginTop:6,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,padding:"0 8px",fontSize:10.5}} />
      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6}}>
        <input type="datetime-local" value={manual.dueAt} onChange={(event)=>setManual({...manual,dueAt:event.target.value})}
          style={{height:30,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,fontSize:9.5}} />
        <label style={{fontSize:9.5,color:"#636366"}}><input type="checkbox" checked={manual.allowProactive}
          onChange={(event)=>setManual({...manual,allowProactive:event.target.checked})}/> allow gentle follow-up</label>
      </div>
      <button type="button" onClick={add} style={{border:0,borderRadius:12,padding:"6px 11px",marginTop:6,fontSize:10.5}}>Add topic</button>
      {message && <p role="alert" style={{fontSize:10.5,color:"#FF3B30"}}>{message}</p>}
      {items.map((item)=><FollowUpEditor key={item.id} item={item}
        onSaved={(saved)=>setItems((current)=>current.map((entry)=>entry.id===saved.id?saved:entry))}
        onDeleted={(id)=>setItems((current)=>current.filter((entry)=>entry.id!==id))}/>) }
    </details>
  );
}

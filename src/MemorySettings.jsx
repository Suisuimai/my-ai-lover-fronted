import { useEffect, useState } from "react";
import { api } from "./api.js";

const CATEGORIES = ["preference", "important_event", "promise", "unfinished", "relationship"];

function MemoryEditor({ memory, onSaved, onDeleted }) {
  const [draft, setDraft] = useState(memory);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const data = await api(`/memories/${memory.id}`, {
        method: "PATCH",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          category: draft.category,
          content: draft.content,
          triggers: Array.isArray(draft.triggers) ? draft.triggers : [],
          status: draft.status,
          isPermanent: draft.is_permanent,
        }),
      });
      onSaved(data.memory);
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("Delete this memory? It will stop influencing future replies.")) return;
    setBusy(true);
    try {
      await api(`/memories/${memory.id}`, {method:"DELETE"});
      onDeleted(memory.id);
    } finally { setBusy(false); }
  }

  return (
    <article style={{padding:"12px 0",borderTop:"0.5px solid rgba(0,0,0,0.06)"}}>
      <div style={{display:"flex",gap:8}}>
        <select value={draft.category} onChange={(event)=>setDraft({...draft,category:event.target.value})}
          style={{height:30,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,background:"rgba(0,0,0,0.02)",fontSize:10.5}}>
          {CATEGORIES.map((category)=><option key={category}>{category}</option>)}
        </select>
        <select value={draft.status} onChange={(event)=>setDraft({...draft,status:event.target.value})}
          style={{height:30,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,background:"rgba(0,0,0,0.02)",fontSize:10.5}}>
          <option value="active">active</option>
          <option value="archived">paused</option>
        </select>
        <label style={{fontSize:10.5,display:"flex",alignItems:"center",gap:4}}>
          <input type="checkbox" checked={draft.is_permanent} onChange={(event)=>setDraft({...draft,is_permanent:event.target.checked})}/>
          permanent
        </label>
      </div>
      <textarea value={draft.content} onChange={(event)=>setDraft({...draft,content:event.target.value})} rows={2}
        style={{width:"100%",boxSizing:"border-box",marginTop:8,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,padding:9,fontFamily:"inherit",fontSize:12,resize:"vertical"}} />
      <input value={(draft.triggers || []).join(", ")} onChange={(event)=>setDraft({...draft,triggers:event.target.value.split(",").map((item)=>item.trim()).filter(Boolean)})}
        placeholder="Recall phrases, separated by commas"
        style={{width:"100%",boxSizing:"border-box",height:32,marginTop:6,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,padding:"0 9px",fontSize:11}} />
      <div style={{display:"flex",gap:8,marginTop:7}}>
        <button type="button" onClick={save} disabled={busy} style={{border:0,borderRadius:12,padding:"6px 11px",fontSize:10.5,cursor:"pointer"}}>Save</button>
        <button type="button" onClick={remove} disabled={busy} style={{border:0,background:"transparent",color:"#FF3B30",fontSize:10.5,cursor:"pointer"}}>Delete</button>
      </div>
    </article>
  );
}

export default function MemorySettings() {
  const [memories, setMemories] = useState([]);
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState({category:"important_event",content:"",triggers:""});

  useEffect(() => {
    api("/memories").then((data)=>setMemories(data.memories || [])).catch((error)=>setMessage(error.message));
  }, []);

  async function addManual() {
    setMessage("");
    try {
      const data = await api("/memories", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...manual,triggers:manual.triggers.split(",").map((item)=>item.trim()).filter(Boolean)}),
      });
      setMemories((items)=>[data.memory,...items]);
      setManual({category:"important_event",content:"",triggers:""});
    } catch (error) { setMessage(error.message); }
  }

  return (
    <details style={{marginTop:14,borderTop:"0.5px solid rgba(0,0,0,0.06)",paddingTop:14}}>
      <summary style={{fontSize:12,fontWeight:500,cursor:"pointer",color:"#1C1C1E"}}>Long-term memories ({memories.length})</summary>
      <p style={{fontSize:10.5,color:"#8E8E93"}}>These memories can cross conversation windows. Pause, edit, or delete anything that is wrong.</p>
      <div style={{display:"flex",gap:6}}>
        <select value={manual.category} onChange={(event)=>setManual({...manual,category:event.target.value})}
          style={{height:30,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,fontSize:10.5}}>
          {CATEGORIES.map((category)=><option key={category}>{category}</option>)}
        </select>
        <input value={manual.triggers} onChange={(event)=>setManual({...manual,triggers:event.target.value})} placeholder="Recall phrases"
          style={{flex:1,minWidth:0,height:30,boxSizing:"border-box",border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,padding:"0 8px",fontSize:10.5}} />
      </div>
      <textarea value={manual.content} onChange={(event)=>setManual({...manual,content:event.target.value})} placeholder="Add a memory manually" rows={2}
        style={{width:"100%",boxSizing:"border-box",marginTop:6,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,padding:9,fontFamily:"inherit",fontSize:11.5}} />
      <button type="button" onClick={addManual} style={{border:0,borderRadius:12,padding:"6px 11px",fontSize:10.5,cursor:"pointer"}}>Add memory</button>
      {message && <p role="alert" style={{fontSize:10.5,color:"#FF3B30"}}>{message}</p>}
      {memories.map((memory)=><MemoryEditor key={memory.id} memory={memory}
        onSaved={(saved)=>setMemories((items)=>items.map((item)=>item.id===saved.id?saved:item))}
        onDeleted={(id)=>setMemories((items)=>items.filter((item)=>item.id!==id))} />)}
    </details>
  );
}

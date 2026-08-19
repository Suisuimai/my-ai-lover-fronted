import { useEffect, useRef, useState } from "react";
import { api } from "./api.js";

const fieldStyle = {
  width:"100%", boxSizing:"border-box", border:"0.5px solid rgba(0,0,0,0.1)",
  borderRadius:10, padding:9, fontFamily:"inherit", fontSize:11.5,
};

function DocumentEditor({ document, index, count, onChanged, onDeleted, onMove }) {
  const [draft, setDraft] = useState(document);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setBusy(true); setMessage("");
    try {
      const data = await api(`/prompt-documents/${document.id}`, {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name:draft.name, content:draft.content, isEnabled:draft.is_enabled}),
      });
      setDraft(data.document); onChanged(data.document); setMessage("Saved.");
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm(`Delete “${document.name}”?`)) return;
    setBusy(true);
    try { await api(`/prompt-documents/${document.id}`, {method:"DELETE"}); onDeleted(document.id); }
    catch (error) { setMessage(error.message); setBusy(false); }
  }

  return (
    <article style={{padding:"12px 0",borderTop:"0.5px solid rgba(0,0,0,0.06)"}}>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <input value={draft.name} onChange={(event)=>setDraft({...draft,name:event.target.value})}
          aria-label="Document name" style={{...fieldStyle,flex:1,height:32,padding:"0 9px"}} />
        <button type="button" onClick={()=>onMove(index,-1)} disabled={busy||index===0} aria-label="Move up">↑</button>
        <button type="button" onClick={()=>onMove(index,1)} disabled={busy||index===count-1} aria-label="Move down">↓</button>
      </div>
      <textarea value={draft.content} onChange={(event)=>setDraft({...draft,content:event.target.value})}
        rows={8} spellCheck={false} style={{...fieldStyle,marginTop:7,resize:"vertical",fontFamily:"ui-monospace, SFMono-Regular, Consolas, monospace"}} />
      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:7}}>
        <label style={{fontSize:10.5,display:"flex",alignItems:"center",gap:4}}>
          <input type="checkbox" checked={draft.is_enabled}
            onChange={(event)=>setDraft({...draft,is_enabled:event.target.checked})}/>
          Include in prompt
        </label>
        <button type="button" onClick={save} disabled={busy} style={{marginLeft:"auto",border:0,borderRadius:12,padding:"6px 11px",fontSize:10.5,cursor:"pointer"}}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={remove} disabled={busy} style={{border:0,background:"transparent",color:"#FF3B30",fontSize:10.5,cursor:"pointer"}}>Delete</button>
      </div>
      {message && <p role="status" style={{fontSize:10,color:message==="Saved."?"#34C759":"#FF3B30",margin:"5px 0 0"}}>{message}</p>}
    </article>
  );
}

export default function PromptDocumentSettings() {
  const [documents, setDocuments] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    api("/prompt-documents").then((data)=>setDocuments(data.documents||[])).catch((error)=>setMessage(error.message));
  }, []);

  async function createDocument(name, content) {
    setBusy(true); setMessage("");
    try {
      const data = await api("/prompt-documents", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name,content}),
      });
      setDocuments((items)=>[...items,data.document]);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".md")) return setMessage("Please choose a .md file.");
    if (file.size > 30000) return setMessage("Markdown files must be 30 KB or smaller.");
    await createDocument(file.name.replace(/\.md$/i,""), await file.text());
  }

  async function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= documents.length) return;
    const reordered = [...documents];
    [reordered[index],reordered[target]] = [reordered[target],reordered[index]];
    setDocuments(reordered); setMessage("");
    try {
      const data = await api("/prompt-documents/order", {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({documentIds:reordered.map((item)=>item.id)}),
      });
      setDocuments(data.documents||reordered);
    } catch (error) { setDocuments(documents); setMessage(error.message); }
  }

  return (
    <details style={{marginTop:14,borderTop:"0.5px solid rgba(0,0,0,0.06)",paddingTop:14}}>
      <summary style={{fontSize:12,fontWeight:500,cursor:"pointer",color:"#1C1C1E"}}>Prompt documents ({documents.length})</summary>
      <p style={{fontSize:10.5,color:"#8E8E93"}}>Ordered Markdown instructions inserted after Additional Instructions and before the companion profile.</p>
      <div style={{display:"flex",gap:8}}>
        <button type="button" onClick={()=>fileInput.current?.click()} disabled={busy} style={{border:0,borderRadius:12,padding:"7px 11px",fontSize:10.5,cursor:"pointer"}}>Upload .md</button>
        <button type="button" onClick={()=>createDocument("Untitled prompt", "# Instructions\n") } disabled={busy} style={{border:0,borderRadius:12,padding:"7px 11px",fontSize:10.5,cursor:"pointer"}}>New document</button>
        <input ref={fileInput} type="file" accept=".md,text/markdown,text/plain" onChange={upload} hidden />
      </div>
      {message && <p role="alert" style={{fontSize:10.5,color:"#FF3B30"}}>{message}</p>}
      {documents.map((document,index)=><DocumentEditor key={document.id} document={document} index={index} count={documents.length}
        onChanged={(saved)=>setDocuments((items)=>items.map((item)=>item.id===saved.id?saved:item))}
        onDeleted={(id)=>setDocuments((items)=>items.filter((item)=>item.id!==id))}
        onMove={move} />)}
    </details>
  );
}

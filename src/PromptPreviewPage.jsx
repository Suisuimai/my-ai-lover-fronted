import { useEffect, useState } from "react";
import { api } from "./api.js";

const card = {background:"#fff",border:"0.5px solid rgba(0,0,0,.08)",borderRadius:16,padding:16};

export default function PromptPreviewPage({ open, onClose, sessionId }) {
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  async function generatePreview() {
    try {
      setBusy(true);
      setError("");
      const data = await api("/prompt-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId || null, message }),
      });
      setPreview(data.preview);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return <div style={{position:"fixed",inset:0,zIndex:70,background:"#F7F6F3",display:"flex",flexDirection:"column",fontFamily:"'DM Sans','Noto Sans KR',system-ui,sans-serif"}}>
    <header style={{height:56,padding:"0 18px",display:"flex",alignItems:"center",gap:12,borderBottom:"0.5px solid rgba(0,0,0,.08)",background:"rgba(247,246,243,.96)"}}>
      <button onClick={onClose} style={{width:32,height:32,border:0,borderRadius:"50%",background:"rgba(0,0,0,.05)",cursor:"pointer"}}><i className="ti ti-arrow-left" /></button>
      <div><b style={{fontSize:14,fontWeight:500}}>Prompt 预览</b><div style={{fontSize:10,color:"#8E8E93"}}>模型实际收到的上下文层级</div></div>
    </header>

    <main style={{flex:1,overflowY:"auto",padding:"18px 16px 80px"}}>
      <div style={{maxWidth:820,margin:"0 auto",display:"grid",gap:14}}>
        <section style={card}>
          <label style={{display:"block",fontSize:10,color:"#8E8E93",marginBottom:7}}>用于测试召回的下一句话</label>
          <textarea value={message} onChange={(event)=>setMessage(event.target.value)} rows={3} placeholder="例如：你还记得我们说过的秋季旅行吗？（不会真的发送）" style={{width:"100%",boxSizing:"border-box",border:"0.5px solid rgba(0,0,0,.12)",borderRadius:12,padding:11,font: "inherit",fontSize:12,resize:"vertical",outline:"none",background:"#FAFAF8"}} />
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10}}>
            <button onClick={generatePreview} disabled={busy} style={{border:0,borderRadius:18,padding:"9px 16px",background:"#1C1C1E",color:"#fff",cursor:busy?"default":"pointer"}}>{busy?"正在整理…":"生成预览"}</button>
            <span style={{fontSize:10,color:"#8E8E93"}}>只读 · 不调用模型 · 不扣费 · 不写入聊天</span>
          </div>
          {error && <p style={{fontSize:11,color:"#C0392B",margin:"10px 0 0"}}>{error}</p>}
        </section>

        {preview && <>
          <section style={{...card,display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:10}}>
            <Stat label="模型" value={preview.model} />
            <Stat label="总层数" value={preview.totals.layers} />
            <Stat label="估算总 Token" value={preview.totals.estimatedTokens.toLocaleString()} />
          </section>

          <section style={card}>
            <b style={{fontSize:12}}>MD 加载情况</b>
            <p style={{fontSize:10.5,lineHeight:1.6,color:"#636366",margin:"8px 0 0"}}>始终加载：{preview.documents.always.map(item=>item.name).join("、") || "无"}</p>
            <p style={{fontSize:10.5,lineHeight:1.6,color:"#636366",margin:"3px 0 0"}}>本句命中的按需 MD：{preview.documents.onDemandMatched.map(item=>item.name).join("、") || "无"}</p>
          </section>

          {preview.layers.map((layer)=><details key={layer.id} open={layer.role==="system"} style={card}>
            <summary style={{cursor:"pointer",listStyle:"none",display:"flex",alignItems:"center",gap:9}}>
              <span style={{width:24,height:24,borderRadius:"50%",background:layer.role==="system"?"#1C1C1E":"rgba(0,0,0,.06)",color:layer.role==="system"?"#fff":"#636366",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9}}>{layer.order}</span>
              <span style={{fontSize:12,fontWeight:500}}>{layer.label}</span>
              <span style={{marginLeft:"auto",fontSize:9.5,color:"#8E8E93"}}>{layer.role} · 约 {layer.estimatedTokens.toLocaleString()} tokens</span>
            </summary>
            <pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",fontFamily:"'DM Sans','Noto Sans KR',sans-serif",fontSize:11,lineHeight:1.65,color:"#3C3C3E",background:"#FAFAF8",borderRadius:11,padding:12,margin:"12px 0 0",maxHeight:420,overflow:"auto"}}>{layer.content}</pre>
          </details>)}

          <p style={{fontSize:10,color:"#8E8E93",lineHeight:1.6,margin:0}}>Token 为统一估算值，用于比较各层体积；供应商最终账单中的 input tokens 才是精确值。</p>
        </>}
      </div>
    </main>
  </div>;
}

function Stat({ label, value }) {
  return <div style={{minWidth:0}}><div style={{fontSize:9.5,color:"#8E8E93"}}>{label}</div><div style={{fontSize:14,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value}</div></div>;
}

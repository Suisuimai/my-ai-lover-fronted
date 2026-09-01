import { useEffect, useState } from "react";
import { api } from "./api.js";

export default function HandoffSettings(){
  const [items,setItems]=useState([]); const [message,setMessage]=useState("");
  useEffect(()=>{api("/handoffs").then(d=>setItems(d.handoffs||[])).catch(e=>setMessage(e.message));},[]);
  async function confirm(item){
    try{const d=await api(`/handoffs/${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"confirmed"})});setItems(x=>x.map(v=>v.id===item.id?d.handoff:v));}
    catch(e){setMessage(e.message);}
  }
  return <details style={{marginTop:14,borderTop:"0.5px solid rgba(0,0,0,.06)",paddingTop:14}}>
    <summary style={{fontSize:12,fontWeight:500,cursor:"pointer"}}>窗口交接 ({items.length})</summary>
    <p style={{fontSize:10.5,color:"#8E8E93"}}>新窗口接续旧窗口时使用的交接摘要和末尾语境。自动生成尚未开启。</p>
    {message&&<p style={{fontSize:10.5,color:"#FF3B30"}}>{message}</p>}
    {!items.length&&<p style={{fontSize:10.5,color:"#8E8E93"}}>目前还没有交接记录。</p>}
    {items.map(item=><article key={item.id} style={{padding:"10px 0",borderTop:"0.5px solid rgba(0,0,0,.06)"}}><p style={{fontSize:11,whiteSpace:"pre-wrap"}}>{item.body_markdown}</p><p style={{fontSize:10,color:"#8E8E93"}}>结束状态：{item.current_state} · {item.status}</p>{item.status==="auto"&&<button type="button" onClick={()=>confirm(item)} style={{border:0,borderRadius:12,padding:"6px 11px",fontSize:10.5}}>确认交接</button>}</article>)}
  </details>;
}

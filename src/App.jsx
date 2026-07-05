import { useState, useRef, useEffect, useCallback } from "react";

// ══════════════════════════════════════════
//  字体注入
// ══════════════════════════════════════════
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=DM+Sans:wght@300;400;500&family=Noto+Sans+KR:wght@300;400&display=swap";
if (!document.head.querySelector("[href*='Cormorant']")) {
  document.head.appendChild(fontLink);
}

// ══════════════════════════════════════════
//  初始数据
// ══════════════════════════════════════════
const INITIAL_CONVERSATIONS = [
  {
    id: 1,
    title: "下午的随想",
    time: "今天",
    messages: [
      { id: 1, role: "ai",   text: "你好呀，今天想聊些什么？",                             ts: "14:02" },
      { id: 2, role: "user", text: "我想要一个简约高级的界面",                             ts: "14:03" },
      { id: 3, role: "ai",   text: "黑白灰，留白说话，字体克制有态度。输入栏浮起来，手机用起来刚刚好。", ts: "14:03" },
    ],
  },
  {
    id: 2,
    title: "帮我写一首关于秋天的诗",
    time: "今天",
    messages: [
      { id: 1, role: "ai",   text: "好呀，你想要什么风格？古典意境，还是现代散文诗？",      ts: "11:20" },
      { id: 2, role: "user", text: "现代一点，简短，有点忧郁",                             ts: "11:21" },
      { id: 3, role: "ai",   text: "落叶不问去处\n风也不留名字\n只是这个傍晚\n又比昨天更冷一些", ts: "11:21" },
    ],
  },
  {
    id: 3,
    title: "如何培养专注力",
    time: "昨天",
    messages: [
      { id: 1, role: "ai",   text: "专注力是可以训练的，你现在最容易分心的场景是什么？",    ts: "09:15" },
      { id: 2, role: "user", text: "刷手机，总是停不下来",                                 ts: "09:16" },
      { id: 3, role: "ai",   text: "可以试试「手机放进另一个房间」这个最简单的物理隔离法，比任何 App 都有效。", ts: "09:16" },
    ],
  },
  {
    id: 4,
    title: "旅行清单整理",
    time: "昨天",
    messages: [
      { id: 1, role: "ai",   text: "要去哪里旅行？",          ts: "20:00" },
      { id: 2, role: "user", text: "京都，下个月",            ts: "20:01" },
      { id: 3, role: "ai",   text: "十一月的京都正好是红叶季，建议提前订岚山和东福寺附近的住宿。", ts: "20:01" },
    ],
  },
  {
    id: 5,
    title: "读书笔记：人类简史",
    time: "上周",
    messages: [
      { id: 1, role: "user", text: "帮我总结一下《人类简史》的核心观点",                   ts: "15:30" },
      { id: 2, role: "ai",   text: "赫拉利的核心论点是：智人之所以能统治地球，靠的是「虚构故事」的能力——货币、国家、宗教，都是我们共同相信的故事。", ts: "15:30" },
    ],
  },
  {
    id: 6,
    title: "咖啡豆的产区风味",
    time: "更早",
    messages: [
      { id: 1, role: "user", text: "埃塞俄比亚和哥伦比亚的豆子有什么区别？",               ts: "10:00" },
      { id: 2, role: "ai",   text: "埃塞偏花香果酸（像茉莉+蓝莓），哥伦比亚更均衡温和（焦糖+坚果）。新手入门推荐哥伦比亚。", ts: "10:00" },
    ],
  },
];

const GROUP_ORDER = ["今天", "昨天", "上周", "更早"];

function getNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ══════════════════════════════════════════
//  SettingsModal
// ══════════════════════════════════════════
function SettingsModal({ open, onClose, settings, onSave }) {
  const [apiKey, setApiKey]     = useState(settings.apiKey);
  const [keyVisible, setKeyVis] = useState(false);
  const [model, setModel]       = useState(settings.model);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared]   = useState(false);
  const [saved, setSaved]       = useState(false);
  const overlayRef              = useRef(null);

  // 同步外部 settings
  useEffect(() => {
    if (open) { setApiKey(settings.apiKey); setModel(settings.model); setSaved(false); }
  }, [open, settings]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  if (!open) return null;

  const handleSave = () => {
    onSave({ apiKey, model });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  };

  const handleClear = () => {
    if (clearing || cleared) return;
    setClearing(true);
    setTimeout(() => { setClearing(false); setCleared(true); }, 800);
    setTimeout(() => setCleared(false), 2600);
  };

  const MODEL_META = {
    "claude-sonnet-4-6": { icon: "ti-bolt",    tag: "日常推荐", desc: "速度与质量的最佳平衡，适合大多数对话场景" },
    "claude-opus-4-6":   { icon: "ti-brain",   tag: "深度模式", desc: "最强推理能力，适合复杂分析与创作" },
    "claude-haiku-4-5":  { icon: "ti-feather", tag: "极速模式", desc: "响应最快，适合简短问答与即时反馈" },
  };
  const meta = MODEL_META[model];

  const S = {
    overlay: {
      position:"fixed",inset:0,zIndex:50,
      background:"rgba(0,0,0,0.18)",
      backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:20,
    },
    modal: {
      width:"100%",maxWidth:400,
      background:"#fff",borderRadius:20,
      border:"0.5px solid rgba(0,0,0,0.08)",
      boxShadow:"0 24px 64px rgba(0,0,0,0.12),0 2px 8px rgba(0,0,0,0.06)",
      overflow:"hidden",
      fontFamily:"'DM Sans','Noto Sans KR',system-ui,sans-serif",
    },
    label: { display:"block",fontSize:9.5,fontWeight:400,color:"#8E8E93",letterSpacing:"0.09em",marginBottom:8 },
    divider: { height:"0.5px",background:"rgba(0,0,0,0.06)",margin:"18px 0" },
  };

  return (
    <div ref={overlayRef} style={S.overlay} onClick={(e)=>{ if(e.target===overlayRef.current) onClose(); }}>
      <div style={S.modal}>

        {/* 标题栏 */}
        <div style={{display:"flex",alignItems:"center",padding:"18px 20px 15px",borderBottom:"0.5px solid rgba(0,0,0,0.06)"}}>
          <span style={{fontFamily:"'Cormorant Garamond',serif",fontWeight:300,fontSize:17,color:"#1C1C1E",letterSpacing:"0.12em"}}>
            SETTINGS
          </span>
          <button onClick={onClose} style={{marginLeft:"auto",width:28,height:28,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.04)",color:"#8E8E93",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* 内容 */}
        <div style={{padding:"20px 20px 0"}}>

          {/* API Key */}
          <label style={S.label}>API KEY</label>
          <div style={{display:"flex",alignItems:"center",gap:8,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:14,padding:"0 10px 0 14px",background:"rgba(0,0,0,0.02)"}}>
            <input
              type={keyVisible?"text":"password"}
              value={apiKey}
              onChange={(e)=>setApiKey(e.target.value)}
              placeholder="sk-ant-api03-···"
              style={{flex:1,border:"none",outline:"none",background:"transparent",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:"#1C1C1E",height:42}}
            />
            <button onClick={()=>setKeyVis(v=>!v)} style={{border:"none",background:"none",color:"#8E8E93",cursor:"pointer",padding:"6px 2px",fontSize:15,display:"flex",alignItems:"center"}}>
              <i className={`ti ${keyVisible?"ti-eye-off":"ti-eye"}`} />
            </button>
          </div>
          <p style={{fontSize:10.5,fontWeight:300,color:"#C7C7CC",marginTop:5,paddingLeft:2}}>Key 仅存于本地，不会上传至任何服务器</p>

          <div style={S.divider} />

          {/* 模型 */}
          <label style={S.label}>DEFAULT MODEL</label>
          <div style={{position:"relative"}}>
            <select value={model} onChange={(e)=>setModel(e.target.value)}
              style={{width:"100%",height:42,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:14,padding:"0 36px 0 14px",background:"rgba(0,0,0,0.02)",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:"#1C1C1E",appearance:"none",cursor:"pointer",outline:"none"}}>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6　·　均衡首选</option>
              <option value="claude-opus-4-6">Claude Opus 4.6　·　深度思考</option>
              <option value="claude-haiku-4-5">Claude Haiku 4.5　·　轻快响应</option>
            </select>
            <i className="ti ti-chevron-down" style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#8E8E93",fontSize:14,pointerEvents:"none"}} />
          </div>
          {meta && (
            <div style={{marginTop:8,padding:"10px 12px",background:"rgba(0,0,0,0.02)",borderRadius:10,border:"0.5px solid rgba(0,0,0,0.05)",display:"flex",gap:8,alignItems:"flex-start"}}>
              <i className={`ti ${meta.icon}`} style={{color:"#8E8E93",fontSize:14,marginTop:1}} />
              <div>
                <span style={{fontSize:11,fontWeight:400,color:"#3C3C3E"}}>{meta.tag}　</span>
                <span style={{fontSize:11,fontWeight:300,color:"#8E8E93"}}>{meta.desc}</span>
              </div>
            </div>
          )}

          <div style={S.divider} />

          {/* 清除记忆 */}
          <label style={S.label}>MEMORY</label>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",border:"0.5px solid rgba(0,0,0,0.06)",borderRadius:14,background:"rgba(0,0,0,0.015)",marginBottom:0}}>
            <div>
              <p style={{fontSize:13,fontWeight:300,color:"#1C1C1E",marginBottom:2}}>清除所有记忆</p>
              <p style={{fontSize:10.5,fontWeight:300,color:"#C7C7CC",lineHeight:1.4}}>删除本地存储的所有对话上下文</p>
            </div>
            <button onClick={handleClear} disabled={clearing||cleared}
              style={{height:30,padding:"0 13px",borderRadius:15,border:"none",background:"rgba(0,0,0,0.04)",color:cleared?"#8E8E93":"#FF3B30",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:400,cursor:clearing||cleared?"default":"pointer",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",flexShrink:0}}>
              {clearing ? <><i className="ti ti-loader-2" style={{animation:"spin .8s linear infinite"}} /> 清除中</>
               : cleared ? <><i className="ti ti-check" /> 已清除</>
               : <><i className="ti ti-trash" /> 清除</>}
            </button>
          </div>
        </div>

        {/* 底部 */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8,padding:"16px 20px 18px",borderTop:"0.5px solid rgba(0,0,0,0.06)",marginTop:18}}>
          <button onClick={onClose}
            style={{height:34,padding:"0 18px",borderRadius:17,border:"0.5px solid rgba(0,0,0,0.1)",background:"transparent",color:"#8E8E93",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,cursor:"pointer"}}>
            取消
          </button>
          <button onClick={handleSave}
            style={{height:34,padding:"0 22px",borderRadius:17,border:"none",background:saved?"rgba(0,0,0,0.4)":"#1C1C1E",color:"#F7F6F3",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:400,cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"background .2s"}}>
            {saved ? <><i className="ti ti-check" /> 已保存</> : "保存"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════
//  Sidebar
// ══════════════════════════════════════════
function Sidebar({ open, onClose, conversations, activeId, onSelect, onNewChat }) {
  const grouped = GROUP_ORDER.reduce((acc, g) => {
    acc[g] = conversations.filter((c) => c.time === g);
    return acc;
  }, {});

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 md:hidden"
          style={{background:"rgba(0,0,0,0.18)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)"}}
          onClick={onClose}
        />
      )}
      <aside
        style={{fontFamily:"'DM Sans','Noto Sans KR',system-ui,sans-serif"}}
        className={[
          "fixed md:relative z-30 top-0 left-0 h-full flex flex-col",
          "w-56 bg-white border-r border-black/[0.06]",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        {/* 顶部 logo */}
        <div className="flex items-center justify-between px-4 flex-shrink-0"
          style={{height:52,borderBottom:"0.5px solid rgba(0,0,0,0.06)"}}>
          <span style={{fontFamily:"'Cormorant Garamond',serif",fontWeight:300,fontSize:18,color:"#1C1C1E",letterSpacing:"0.14em"}}>
            CLAUDE
            <span style={{display:"inline-block",width:4,height:4,borderRadius:"50%",background:"#1C1C1E",marginLeft:2,marginBottom:3,verticalAlign:"middle"}} />
          </span>
          <button onClick={onClose} className="md:hidden w-7 h-7 flex items-center justify-center rounded-full text-[#8E8E93] hover:bg-black/5 transition-colors">
            <i className="ti ti-x text-[14px]" />
          </button>
        </div>

        {/* 新对话 */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <button onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-light border transition-all"
            style={{color:"#8E8E93",borderColor:"rgba(0,0,0,0.08)",fontFamily:"'DM Sans',sans-serif"}}
            onMouseEnter={e=>Object.assign(e.currentTarget.style,{background:"rgba(0,0,0,0.03)",color:"#1C1C1E"})}
            onMouseLeave={e=>Object.assign(e.currentTarget.style,{background:"transparent",color:"#8E8E93"})}
          >
            <i className="ti ti-edit text-[14px]" />
            新对话
          </button>
        </div>

        {/* 历史列表 */}
        <div className="flex-1 overflow-y-auto px-2 pb-4" style={{scrollbarWidth:"none"}}>
          {GROUP_ORDER.map((g) => {
            const items = grouped[g];
            if (!items?.length) return null;
            return (
              <div key={g} className="mb-3">
                <p style={{fontSize:9.5,fontWeight:400,color:"#C7C7CC",letterSpacing:"0.08em",padding:"4px 12px"}}>
                  {g.toUpperCase()}
                </p>
                {items.map((conv) => (
                  <button key={conv.id}
                    onClick={() => { onSelect(conv.id); onClose(); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-[12.5px] font-light transition-all mb-0.5 truncate"
                    style={{
                      background: conv.id === activeId ? "#1C1C1E" : "transparent",
                      color: conv.id === activeId ? "#F7F6F3" : "#3C3C3E",
                      fontFamily:"'DM Sans',sans-serif",
                    }}
                    onMouseEnter={e=>{ if(conv.id!==activeId) e.currentTarget.style.background="rgba(0,0,0,0.04)"; }}
                    onMouseLeave={e=>{ if(conv.id!==activeId) e.currentTarget.style.background="transparent"; }}
                  >
                    {conv.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* 底部用户区 */}
        <div style={{borderTop:"0.5px solid rgba(0,0,0,0.06)"}} className="px-3 py-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-[#1C1C1E] flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] text-white font-light">我</span>
            </div>
            <span style={{fontSize:12,fontWeight:300,color:"#3C3C3E",fontFamily:"'DM Sans',sans-serif"}}>我的账户</span>
          </div>
        </div>
      </aside>
    </>
  );
}

// ══════════════════════════════════════════
//  Bubble
// ══════════════════════════════════════════
function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}
      style={{animation:"rise .24s cubic-bezier(.22,.68,0,1.15) both"}}>
      {!isUser && (
        <div style={{width:24,height:24,borderRadius:"50%",background:"#1C1C1E",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,fontFamily:"'Cormorant Garamond',serif",fontSize:10,color:"#F7F6F3"}}>
          C
        </div>
      )}
      {isUser && <div style={{width:24,flexShrink:0}} />}
      <div style={{display:"flex",flexDirection:"column",maxWidth:"75%",alignItems:isUser?"flex-end":"flex-start"}}>
        <div style={{
          padding:"10px 13px",lineHeight:1.72,fontSize:13.5,
          fontFamily:"'DM Sans','Noto Sans KR',sans-serif",fontWeight:300,
          whiteSpace:"pre-line",
          ...(isUser
            ? {background:"#1C1C1E",color:"#F7F6F3",borderRadius:"16px 3px 16px 16px",boxShadow:"0 2px 10px rgba(0,0,0,0.14)"}
            : {background:"#fff",color:"#1C1C1E",borderRadius:"3px 16px 16px 16px",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",border:"0.5px solid rgba(0,0,0,0.06)"}),
          transition:"box-shadow .2s,transform .2s",
          cursor:"default",
        }}
          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow="0 5px 18px rgba(0,0,0,"+(isUser?.2:.1)+")";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,"+(isUser?.14:.06)+")";}}
        >
          {msg.text}
        </div>
        <span style={{fontSize:9.5,color:"#8E8E93",marginTop:3,padding:"0 3px",fontWeight:300,letterSpacing:"0.03em"}}>
          {msg.ts}
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  InputBar
// ══════════════════════════════════════════
function InputBar({ onSend, model, onModelChange }) {
  const [text, setText] = useState("");
  const taRef = useRef(null);

  const resize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 90) + "px";
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  return (
    <div style={{
      position:"absolute",bottom:0,left:0,right:0,
      display:"flex",justifyContent:"center",
      paddingBottom:20,
      background:"linear-gradient(to top,#F7F6F3 60%,transparent)",
      pointerEvents:"none",
    }}>
      <div style={{
        pointerEvents:"all",
        width:"calc(100% - 28px)",maxWidth:560,
        background:"rgba(255,255,255,0.88)",
        border:"0.5px solid rgba(0,0,0,0.09)",
        borderRadius:22,padding:"10px 10px 8px",
        backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
        boxShadow:"0 4px 24px rgba(0,0,0,0.08),0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {/* 文字行 */}
        <div style={{display:"flex",alignItems:"center",padding:"0 4px 0 2px"}}>
          <textarea ref={taRef} value={text}
            onChange={(e)=>{setText(e.target.value);resize();}}
            onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
            placeholder="说点什么…"
            rows={1}
            style={{flex:1,border:"none",outline:"none",background:"transparent",fontFamily:"'DM Sans','Noto Sans KR',sans-serif",fontSize:14,fontWeight:300,color:"#1C1C1E",resize:"none",minHeight:22,maxHeight:90,lineHeight:1.55,padding:"3px 6px",scrollbarWidth:"none"}}
          />
        </div>
        {/* 操作行 */}
        <div style={{display:"flex",alignItems:"center",gap:6,paddingTop:4}}>
          <button style={{width:32,height:32,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.05)",color:"#1C1C1E",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
            <i className="ti ti-plus" />
          </button>
          <select value={model} onChange={(e)=>onModelChange(e.target.value)}
            style={{height:26,border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:14,padding:"0 20px 0 8px",background:"rgba(0,0,0,0.03)",fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:400,color:"#8E8E93",appearance:"none",cursor:"pointer",outline:"none",letterSpacing:"0.02em",flexShrink:0,backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='9' height='9' viewBox='0 0 24 24' fill='none' stroke='%238E8E93' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 5px center"}}>
            <option value="claude-sonnet-4-6">Sonnet</option>
            <option value="claude-opus-4-6">Opus</option>
            <option value="claude-haiku-4-5">Haiku</option>
          </select>
          <div style={{flex:1}} />
          <button style={{width:32,height:32,borderRadius:"50%",border:"none",background:"rgba(0,0,0,0.05)",color:"#8E8E93",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
            <i className="ti ti-microphone" />
          </button>
          <button onClick={handleSend}
            style={{width:32,height:32,borderRadius:"50%",border:"none",background:"#1C1C1E",color:"#F7F6F3",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,transition:"background .15s"}}>
            <i className="ti ti-arrow-up" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  App  —  状态管理核心
// ══════════════════════════════════════════
export default function App() {

  // ── UI 状态 ──────────────────────────────
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── 数据状态 ─────────────────────────────
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);
  const [activeId,      setActiveId]      = useState(1);               // 当前对话 id
  const [typing,        setTyping]        = useState(false);
  const [settings,      setSettings]      = useState({
    apiKey: "",
    model:  "claude-sonnet-4-6",
  });

  const msgEndRef = useRef(null);

  // ── 派生：当前对话 ────────────────────────
  const activeConv = conversations.find((c) => c.id === activeId);
  const messages   = activeConv?.messages ?? [];

  // 滚动到底部
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, activeId]);

  // ── 切换历史对话 ──────────────────────────
  // 点击侧边栏某条 → 把 activeId 切成对应 id，消息列表自动跟着换
  const handleSelectConv = useCallback((id) => {
    setActiveId(id);
    setTyping(false);
  }, []);

  // ── 新建对话 ──────────────────────────────
  const handleNewChat = useCallback(() => {
    const newId = Date.now();
    const newConv = {
      id: newId,
      title: "新对话",
      time: "今天",
      messages: [{ id: 1, role: "ai", text: "你好呀，想聊些什么？", ts: getNow() }],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newId);
    setSidebarOpen(false);
  }, []);

  // ── 发送消息 ──────────────────────────────
  const handleSend = useCallback(async (text) => {
    const userMsg = { id: Date.now(), role: "user", text, ts: getNow() };

    // 把用户消息追加进当前对话，同时更新标题（取第一条 user 消息前 12 字）
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        const isFirstUserMsg = !c.messages.some((m) => m.role === "user");
        return {
          ...c,
          title: isFirstUserMsg ? text.slice(0, 16) : c.title,
          messages: [...c.messages, userMsg],
        };
      })
    );

    setTyping(true);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 1000,
          system: "你叫 Claude，温柔细腻的陪伴型 AI，中文回复，语气自然简短有温度。",
          messages: [{ role: "user", content: text }],
        }),
      });
      const data = await res.json();
      const aiText = data.content?.[0]?.text ?? "……";

      setConversations((prev) =>
        prev.map((c) =>
          c.id !== activeId
            ? c
            : { ...c, messages: [...c.messages, { id: Date.now() + 1, role: "ai", text: aiText, ts: getNow() }] }
        )
      );
    } catch {
      setConversations((prev) =>
        prev.map((c) =>
          c.id !== activeId
            ? c
            : { ...c, messages: [...c.messages, { id: Date.now() + 1, role: "ai", text: "有点走神了，再说一遍？", ts: getNow() }] }
        )
      );
    } finally {
      setTyping(false);
    }
  }, [activeId, settings.model]);

  // ── 保存设置 ──────────────────────────────
  const handleSaveSettings = useCallback((newSettings) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // ─────────────────────────────────────────
  return (
    <div style={{display:"flex",height:"100vh",width:"100%",overflow:"hidden",background:"#F7F6F3",fontFamily:"'DM Sans','Noto Sans KR',system-ui,sans-serif"}}>

      {/* ── 侧边栏 ── */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectConv}   // ← 切换对话
        onNewChat={handleNewChat}
      />

      {/* ── 主区域 ── */}
      <main style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,position:"relative"}}>

        {/* 顶栏 */}
        <header style={{height:52,display:"flex",alignItems:"center",padding:"0 16px",gap:12,flexShrink:0,background:"#F7F6F3",borderBottom:"0.5px solid rgba(0,0,0,0.06)"}}>
          {/* 侧边栏开关 */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            style={{width:32,height:32,borderRadius:"50%",border:"none",background:"none",color:"#8E8E93",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,transition:"background .15s,color .15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,0,0,0.05)";e.currentTarget.style.color="#1C1C1E";}}
            onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="#8E8E93";}}
          >
            <i className="ti ti-layout-sidebar" />
          </button>

          {/* 当前对话标题 */}
          <span style={{fontSize:13,fontWeight:300,color:"#3C3C3E",letterSpacing:"0.01em",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",flex:1}}>
            {activeConv?.title ?? "新对话"}
          </span>

          {/* 右侧按钮 */}
          <div style={{display:"flex",gap:4,flexShrink:0}}>
            {/* 新对话 */}
            <button onClick={handleNewChat}
              style={{width:32,height:32,borderRadius:"50%",border:"none",background:"none",color:"#8E8E93",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,0,0,0.05)";e.currentTarget.style.color="#1C1C1E";}}
              onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="#8E8E93";}}>
              <i className="ti ti-edit" />
            </button>
            {/* 设置 — 点击打开 SettingsModal */}
            <button onClick={() => setSettingsOpen(true)}
              style={{width:32,height:32,borderRadius:"50%",border:"none",background:"none",color:"#8E8E93",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,0,0,0.05)";e.currentTarget.style.color="#1C1C1E";}}
              onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color="#8E8E93";}}>
              <i className="ti ti-settings" />
            </button>
          </div>
        </header>

        {/* 消息列表 */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 16px 120px",display:"flex",flexDirection:"column",gap:14,scrollbarWidth:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <div style={{flex:1,height:"0.5px",background:"rgba(0,0,0,0.06)"}} />
            <span style={{fontSize:9.5,color:"#C7C7CC",fontWeight:300,letterSpacing:"0.08em"}}>TODAY</span>
            <div style={{flex:1,height:"0.5px",background:"rgba(0,0,0,0.06)"}} />
          </div>

          {messages.map((msg) => <Bubble key={msg.id} msg={msg} />)}

          {/* 打字动画 */}
          {typing && (
            <div style={{display:"flex",gap:8,animation:"rise .24s both"}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:"#1C1C1E",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,fontFamily:"'Cormorant Garamond',serif",fontSize:10,color:"#F7F6F3"}}>C</div>
              <div style={{padding:"12px 14px",background:"#fff",borderRadius:"3px 16px 16px 16px",border:"0.5px solid rgba(0,0,0,0.06)",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",display:"flex",gap:4,alignItems:"center"}}>
                {[0,.18,.36].map((d,i)=>(
                  <span key={i} style={{width:5,height:5,borderRadius:"50%",background:"#C7C7CC",animation:`dotPulse 1.2s ${d}s ease-in-out infinite`}} />
                ))}
              </div>
            </div>
          )}
          <div ref={msgEndRef} />
        </div>

        {/* 悬浮输入栏 */}
        <InputBar
          onSend={handleSend}
          model={settings.model}
          onModelChange={(m) => setSettings((s) => ({ ...s, model: m }))}
        />
      </main>

      {/* ── 设置面板 ── */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      <style>{`
        @keyframes rise { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dotPulse { 0%,60%,100%{opacity:.3;transform:scale(.8)} 30%{opacity:1;transform:scale(1.1)} }
        *::-webkit-scrollbar{display:none}
      `}</style>
    </div>
  );
}

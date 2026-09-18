import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const PRESETS = {
  openrouter: { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", apiFormat: "openai_compatible" },
  deepseek: { label: "DeepSeek 直连", baseUrl: "https://api.deepseek.com", apiFormat: "openai_compatible" },
  anthropic: { label: "Anthropic 官方", baseUrl: "https://api.anthropic.com", apiFormat: "anthropic" },
  custom: { label: "", baseUrl: "https://", apiFormat: "openai_compatible" },
};

const blankConnection = () => ({ ...PRESETS.openrouter, apiKey: "", notes: "", enabled: true });
const number = new Intl.NumberFormat("zh-CN");

function formatUsageTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(new Date(value));
}

function formatMoney(value, exchangeRate = 6.7) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "暂不可算";
  const amount = Number(value);
  return `$${amount.toFixed(4)} · ¥${(amount * exchangeRate).toFixed(2)}`;
}

function Field({ label, children }) {
  return <label className="api-field"><span>{label}</span>{children}</label>;
}

function ConnectionEditor({ initial, onSave, onCancel, busy }) {
  const [draft, setDraft] = useState(initial);
  const change = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  return <div className="api-editor">
    {!initial.id && <Field label="快速模板"><select value={draft.preset || "openrouter"} onChange={(event) => {
      const preset = event.target.value;
      setDraft((current) => ({ ...current, ...PRESETS[preset], preset }));
    }}><option value="openrouter">OpenRouter</option><option value="deepseek">DeepSeek 直连</option><option value="anthropic">Anthropic 官方</option><option value="custom">完全自定义</option></select></Field>}
    <div className="api-form-grid">
      <Field label="连接名称"><input value={draft.label || ""} onChange={(event) => change("label", event.target.value)} placeholder="例如：主力中转" /></Field>
      <Field label="接口格式"><select value={draft.apiFormat} onChange={(event) => change("apiFormat", event.target.value)}><option value="openai_compatible">OpenAI 兼容</option><option value="anthropic">Anthropic</option></select></Field>
    </div>
    <Field label="Base URL"><input value={draft.baseUrl || ""} onChange={(event) => change("baseUrl", event.target.value)} placeholder="https://..." /></Field>
    <Field label={initial.id ? "更换 API Key（留空则不变）" : "API Key"}><input type="password" autoComplete="new-password" value={draft.apiKey || ""} onChange={(event) => change("apiKey", event.target.value)} placeholder={initial.id ? "••••••••（已经安全保存）" : "粘贴 API Key"} /></Field>
    <Field label="备注"><textarea value={draft.notes || ""} onChange={(event) => change("notes", event.target.value)} placeholder="例如：限额 10 美元的备用连接" /></Field>
    <label className="api-toggle"><input type="checkbox" checked={draft.enabled !== false} onChange={(event) => change("enabled", event.target.checked)} /><span>启用这条连接</span></label>
    <div className="api-actions"><button className="api-button ghost" onClick={onCancel}>取消</button><button className="api-button dark" disabled={busy} onClick={() => onSave(draft)}>{busy ? "保存中…" : "保存连接"}</button></div>
  </div>;
}

function ConnectionCard({ connection, onEdit, onDelete, onLoadModels, catalog, busy }) {
  return <article className="api-card">
    <div className="api-card-head"><div><div className="api-card-title">{connection.label}</div><div className="api-muted">{connection.apiFormat === "anthropic" ? "Anthropic 格式" : "OpenAI 兼容格式"}</div></div><span className={`api-status ${connection.enabled ? "on" : "off"}`}>{connection.enabled ? "已启用" : "已停用"}</span></div>
    <div className="api-url">{connection.baseUrl}</div>
    {connection.notes && <p className="api-notes">{connection.notes}</p>}
    <div className="api-key-state"><i className="ti ti-key" /> {connection.hasApiKey ? "Key 已加密保存" : "尚未配置 Key"}</div>
    {catalog?.message && <div className={`api-catalog-state ${catalog.error ? "error" : ""}`}>{catalog.message}</div>}
    <div className="api-actions"><button className="api-button ghost" disabled={busy || !connection.enabled || !connection.hasApiKey} onClick={() => onLoadModels(connection)}>{busy ? "测试中…" : "测试并读取模型"}</button><button className="api-button ghost" onClick={() => onEdit(connection)}>编辑</button><button className="api-button danger" disabled={busy} onClick={() => onDelete(connection)}>删除</button></div>
  </article>;
}

function RouteCard({ feature, features, route, connections, routes, catalogs, onLoadModels, onSave, busy }) {
  const source = feature.follows ? routes.find((item) => item.purpose === feature.follows) : null;
  const [following, setFollowing] = useState(Boolean(route?.followsPurpose));
  const [connectionId, setConnectionId] = useState(route?.connectionId || connections[0]?.id || "");
  const [modelId, setModelId] = useState(route?.modelId || "");
  const followedFeature = features.find((item) => item.id === feature.follows);
  const catalog = catalogs[connectionId];
  const listId = `models-${feature.id}-${connectionId}`;
  return <article className="api-route-card">
    <div className="api-route-copy"><strong>{feature.name}</strong><span>{feature.description}</span>{feature.recommendation && <em>{feature.recommendation}</em>}</div>
    {feature.follows && <label className="api-toggle compact"><input type="checkbox" checked={following} onChange={(event) => setFollowing(event.target.checked)} /><span>跟随{followedFeature?.name}</span></label>}
    {following ? <div className="api-follow-value">{source ? `${source.connectionLabel} · ${source.modelId}` : "请先配置被跟随的功能"}</div> : <div><div className="api-route-fields"><select value={connectionId} onChange={(event) => { setConnectionId(event.target.value); setModelId(""); }}>{connections.map((connection) => <option key={connection.id} value={connection.id}>{connection.label}</option>)}</select><div className="api-model-input"><input list={catalog?.models?.length ? listId : undefined} value={modelId} onChange={(event) => setModelId(event.target.value)} placeholder="搜索或手填完整模型 ID" /><button type="button" className="api-inline-button" disabled={!connectionId || catalog?.loading} onClick={() => onLoadModels(connections.find((item) => item.id === connectionId))}>{catalog?.loading ? "读取中…" : catalog?.models?.length ? "刷新" : "读取列表"}</button></div></div>{catalog?.models?.length ? <><datalist id={listId}>{catalog.models.map((model) => <option key={model.id} value={model.id}>{model.name === model.id ? "" : model.name}</option>)}</datalist><div className="api-model-help">已读取 {catalog.models.length} 个模型；可以搜索，也可以继续手工填写。</div></> : catalog?.error ? <div className="api-model-help error">{catalog.message}；仍可手工填写模型 ID。</div> : null}</div>}
    <button className="api-button dark" disabled={busy || !connections.length || (following && !source)} onClick={() => onSave(feature.id, following ? { followsPurpose: feature.follows } : { connectionId, modelId, followsPurpose: null })}>{busy ? "保存中…" : "保存分配"}</button>
  </article>;
}

export default function ApiModelsPage({ open, onClose }) {
  const [tab, setTab] = useState("connections");
  const [connections, setConnections] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [features, setFeatures] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [catalogs, setCatalogs] = useState({});
  const [usageEvents, setUsageEvents] = useState([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState("");
  const [usageSummary, setUsageSummary] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(6.7);

  const load = useCallback(async () => {
    const [connectionData, routeData, featureData] = await Promise.all([api("/api-connections"), api("/api-feature-routes"), api("/api-feature-definitions")]);
    setConnections(connectionData.connections || []);
    setRoutes(routeData.routes || []);
    setFeatures(featureData.features || []);
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    load().catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const close = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, onClose]);

  const loadUsage = useCallback(async () => {
    setUsageLoading(true);
    setUsageError("");
    try {
      const data = await api("/api-usage-events?limit=30");
      setUsageEvents(data.events || []);
      setUsageSummary(data.summary || null);
      setExchangeRate(data.exchangeRate || 6.7);
    } catch (error) {
      setUsageError(error.message);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && tab === "usage") loadUsage();
  }, [open, tab, loadUsage]);

  const routeMap = useMemo(() => new Map(routes.map((route) => [route.purpose, route])), [routes]);
  if (!open) return null;

  async function saveConnection(draft) {
    try {
      setBusy("connection"); setMessage("");
      const body = { label: draft.label, baseUrl: draft.baseUrl, apiFormat: draft.apiFormat, notes: draft.notes, enabled: draft.enabled };
      if (draft.apiKey) body.apiKey = draft.apiKey;
      await api(draft.id ? `/api-connections/${draft.id}` : "/api-connections", { method: draft.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await load(); setEditing(null); setMessage("连接已保存。Key 不会显示在页面或日志中。");
    } catch (error) { setMessage(error.message); } finally { setBusy(""); }
  }

  async function deleteConnection(connection) {
    if (!window.confirm(`删除“${connection.label}”？正在承担功能的连接不能删除。`)) return;
    try { setBusy(connection.id); await api(`/api-connections/${connection.id}`, { method: "DELETE" }); await load(); setMessage("连接已删除。"); }
    catch (error) { setMessage(error.message); } finally { setBusy(""); }
  }

  async function loadModels(connection) {
    if (!connection) return;
    setCatalogs((current) => ({ ...current, [connection.id]: { ...current[connection.id], loading: true, error: false, message: "正在连接并读取模型…" } }));
    try {
      const data = await api(`/api-connections/${connection.id}/models`);
      setCatalogs((current) => ({ ...current, [connection.id]: { models: data.models || [], loading: false, error: false, message: `连接正常，读取到 ${data.models?.length || 0} 个模型${data.cached ? "（使用缓存）" : ""}。` } }));
    } catch (error) {
      setCatalogs((current) => ({ ...current, [connection.id]: { models: [], loading: false, error: true, message: error.message } }));
    }
  }

  async function saveRoute(purpose, body) {
    try { setBusy(purpose); setMessage(""); await api(`/api-feature-routes/${purpose}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); await load(); setMessage("功能分配已保存，新调用会立即使用它。 "); }
    catch (error) { setMessage(error.message); } finally { setBusy(""); }
  }

  return <div className="api-page">
    <header className="api-page-header"><button className="api-icon-button" onClick={onClose} aria-label="返回"><i className="ti ti-arrow-left" /></button><div><h1>API 与模型</h1><p>管理请求从哪里出去，以及每项工作使用哪个模型。</p></div></header>
    <main className="api-page-main">
      <nav className="api-tabs"><button className={tab === "connections" ? "active" : ""} onClick={() => setTab("connections")}>连接</button><button className={tab === "routes" ? "active" : ""} onClick={() => setTab("routes")}>功能分配</button><button className={tab === "usage" ? "active" : ""} onClick={() => setTab("usage")}>用量</button></nav>
      {message && <div className="api-message">{message}</div>}
      {tab === "connections" && <section><div className="api-section-heading"><div><h2>连接</h2><p>一张卡就是一条独立的 API 通路。同一个地址可以建立多张卡。</p></div>{!editing && <button className="api-button dark" onClick={() => setEditing(blankConnection())}><i className="ti ti-plus" /> 添加连接</button>}</div>
        {editing && <ConnectionEditor initial={editing} busy={busy === "connection"} onSave={saveConnection} onCancel={() => setEditing(null)} />}
        {!editing && !connections.length && <div className="api-empty"><i className="ti ti-plug-connected" /><h3>添加第一条连接</h3><p>推荐先添加 OpenRouter 主力连接，再准备一条 DeepSeek 直连作为备用。</p><button className="api-button dark" onClick={() => setEditing(blankConnection())}>开始添加</button></div>}
        <div className="api-card-grid">{!editing && connections.map((connection) => <ConnectionCard key={connection.id} connection={connection} catalog={catalogs[connection.id]} busy={Boolean(catalogs[connection.id]?.loading) || busy === connection.id} onLoadModels={loadModels} onEdit={(item) => setEditing({ ...item, apiKey: "" })} onDelete={deleteConnection} />)}</div>
      </section>}
      {tab === "routes" && <section><div className="api-section-heading"><div><h2>功能分配</h2><p>每项工作同时记住连接和完整模型 ID。可读取模型目录、搜索选择，也始终允许手工填写。当前支持 OpenAI 兼容与 Anthropic 格式，Gemini 原生格式暂不支持。</p></div></div>{!connections.length ? <div className="api-empty"><p>请先添加至少一条连接。</p><button className="api-button dark" onClick={() => setTab("connections")}>去添加连接</button></div> : <div className="api-route-list">{features.map((feature) => { const route = routeMap.get(feature.id); return <RouteCard key={`${feature.id}-${route?.updatedAt || "new"}-${connections.length}`} feature={feature} features={features} route={route} routes={routes} connections={connections.filter((item) => item.enabled)} catalogs={catalogs} onLoadModels={loadModels} busy={busy === feature.id} onSave={saveRoute} />; })}</div>}</section>}
      {tab === "usage" && <section><div className="api-section-heading"><div><h2>最近调用</h2><p>缓存写入表示本轮建立了缓存；缓存读取（cached_tokens）表示本轮真正复用了缓存。</p></div><button className="api-button ghost" disabled={usageLoading} onClick={loadUsage}><i className="ti ti-refresh" /> {usageLoading ? "读取中…" : "刷新"}</button></div>
        {usageError && <div className="api-message">{usageError}</div>}
        {usageSummary && <><div className="api-cost-summary">
          <article><span>今日总费用</span><strong>{formatMoney(usageSummary.today.actualCost, exchangeRate)}</strong></article>
          <article className="saved"><span>今日缓存节省</span><strong>{formatMoney(usageSummary.today.cacheSavings, exchangeRate)}</strong></article>
          <article><span>本月总费用</span><strong>{formatMoney(usageSummary.month.actualCost, exchangeRate)}</strong></article>
          <article className="saved"><span>本月缓存节省</span><strong>{formatMoney(usageSummary.month.cacheSavings, exchangeRate)}</strong></article>
        </div><p className="api-cost-note">人民币按固定汇率 1 美元 = ¥{exchangeRate} 换算。费用优先采用接口实际返回值；无法返回费用的调用不计入合计。</p></>}
        {!usageLoading && !usageEvents.length ? <div className="api-empty"><i className="ti ti-chart-bar" /><h3>还没有调用记录</h3><p>发送一条聊天消息后回来刷新，就能看到本轮的 token 和缓存数据。</p></div> : <div className="api-usage-list">{usageEvents.map((event) => <article className="api-usage-row" key={event.id}>
          <div className="api-usage-main"><strong>{event.purpose}</strong><span>{event.resolvedModel || event.requestedModel || "未知模型"}</span><small>{formatUsageTime(event.startedAt)}</small></div>
          <div className="api-usage-stat cost"><span>本次费用</span><strong>{formatMoney(event.actualCost, exchangeRate)}</strong></div>
          <div className={`api-usage-stat saving ${Number(event.cacheSavings) > 0 ? "hit" : ""}`}><span>缓存节省</span><strong>{formatMoney(event.cacheSavings, exchangeRate)}</strong></div>
          <div className="api-usage-stat"><span>输入</span><strong>{number.format(event.inputTokens)}</strong></div>
          <div className="api-usage-stat write"><span>缓存写入</span><strong>{number.format(event.cacheWriteTokens)}</strong></div>
          <div className={`api-usage-stat read ${event.cachedTokens > 0 ? "hit" : ""}`}><span>缓存读取</span><strong>{number.format(event.cachedTokens)}</strong></div>
          <div className="api-usage-stat"><span>输出</span><strong>{number.format(event.outputTokens)}</strong></div>
          <span className={`api-status ${event.status === "succeeded" ? "on" : "off"}`}>{event.status === "succeeded" ? "成功" : "失败"}</span>
        </article>)}</div>}
      </section>}
    </main>
    <style>{`
      .api-page{position:fixed;inset:0;z-index:80;background:#f7f6f3;color:#1c1c1e;overflow:auto;font-family:'DM Sans','Noto Sans KR',system-ui,sans-serif}.api-page *{box-sizing:border-box}.api-page-header{height:72px;position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:14px;padding:0 max(18px,calc((100vw - 920px)/2));background:rgba(247,246,243,.92);backdrop-filter:blur(18px);border-bottom:.5px solid rgba(0,0,0,.08)}.api-page-header h1{font-family:'Cormorant Garamond',serif;font-size:23px;font-weight:400;letter-spacing:.05em;margin:0}.api-page-header p{font-size:11px;color:#8e8e93;margin:2px 0 0}.api-icon-button{width:34px;height:34px;border:0;border-radius:50%;background:rgba(0,0,0,.05);cursor:pointer}.api-page-main{width:min(1120px,calc(100% - 32px));margin:26px auto 80px}.api-tabs{display:flex;gap:4px;padding:4px;background:rgba(0,0,0,.045);border-radius:15px;margin-bottom:26px}.api-tabs button{flex:1;border:0;border-radius:11px;padding:10px;background:transparent;color:#8e8e93;cursor:pointer}.api-tabs button.active{background:#fff;color:#1c1c1e;box-shadow:0 1px 5px rgba(0,0,0,.07)}.api-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}.api-section-heading h2{font-size:18px;font-weight:500;margin:0}.api-section-heading p,.api-muted{font-size:11px;color:#8e8e93;margin:4px 0 0;line-height:1.5}.api-button{border:0;border-radius:12px;min-height:36px;padding:0 14px;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;justify-content:center;gap:6px}.api-button:disabled{opacity:.4;cursor:default}.api-button.dark{background:#1c1c1e;color:#fff}.api-button.ghost{background:rgba(0,0,0,.05);color:#3c3c3e}.api-button.danger{background:rgba(255,59,48,.08);color:#d92b22}.api-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.api-card,.api-route-card,.api-editor,.api-empty{background:#fff;border:.5px solid rgba(0,0,0,.08);border-radius:18px;padding:18px;box-shadow:0 3px 16px rgba(0,0,0,.035)}.api-card-head{display:flex;justify-content:space-between;gap:12px}.api-card-title{font-size:15px;font-weight:500}.api-status{font-size:10px;padding:4px 8px;border-radius:12px;height:max-content}.api-status.on{background:rgba(52,199,89,.1);color:#248a3d}.api-status.off{background:rgba(0,0,0,.05);color:#8e8e93}.api-url{font-family:ui-monospace,monospace;font-size:10px;color:#636366;background:rgba(0,0,0,.035);border-radius:9px;padding:8px;margin-top:14px;overflow-wrap:anywhere}.api-notes{font-size:11px;color:#636366;line-height:1.5}.api-key-state{font-size:11px;color:#8e8e93;margin:14px 0}.api-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap}.api-editor{margin-bottom:16px}.api-form-grid,.api-route-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.api-field{display:block;margin-bottom:12px}.api-field>span{display:block;font-size:10px;letter-spacing:.05em;color:#8e8e93;margin-bottom:6px}.api-field input,.api-field select,.api-field textarea,.api-route-fields input,.api-route-fields select{width:100%;border:.5px solid rgba(0,0,0,.12);border-radius:11px;background:rgba(0,0,0,.02);padding:9px 11px;font:12px inherit;outline:none}.api-field textarea{min-height:62px;resize:vertical}.api-toggle{display:flex;align-items:center;gap:8px;font-size:12px;color:#3c3c3e}.api-toggle.compact{margin:10px 0}.api-message{font-size:11px;color:#636366;background:#fff;border-radius:12px;padding:10px 13px;margin-bottom:14px}.api-empty{text-align:center;padding:38px 20px;color:#8e8e93}.api-empty i{font-size:25px}.api-empty h3{font-size:15px;color:#3c3c3e;margin:10px 0 4px}.api-empty p{font-size:11px;line-height:1.6;max-width:430px;margin:5px auto 14px}.api-route-list{display:flex;flex-direction:column;gap:10px}.api-route-card{display:grid;grid-template-columns:minmax(150px,.8fr) minmax(280px,1.5fr) auto;gap:14px;align-items:center}.api-route-copy{display:flex;flex-direction:column;gap:3px}.api-route-copy strong{font-size:13px}.api-route-copy span,.api-follow-value{font-size:10.5px;color:#8e8e93}.api-route-copy em{font-size:10px;color:#a36a18;font-style:normal}.api-follow-value{background:rgba(0,0,0,.035);padding:9px 11px;border-radius:10px}.api-route-fields{grid-template-columns:minmax(130px,.7fr) minmax(160px,1.3fr)}.api-model-input{display:flex;gap:6px}.api-inline-button{flex:0 0 auto;border:0;border-radius:10px;background:rgba(0,0,0,.06);padding:0 10px;font-size:10px;cursor:pointer}.api-inline-button:disabled{opacity:.45}.api-model-help,.api-catalog-state{font-size:10px;color:#248a3d;margin-top:6px;line-height:1.4}.api-model-help.error,.api-catalog-state.error{color:#c9342d}.api-cost-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:8px}.api-cost-summary article{display:flex;flex-direction:column;gap:7px;background:#fff;border:.5px solid rgba(0,0,0,.08);border-radius:16px;padding:16px}.api-cost-summary span{font-size:10px;color:#8e8e93}.api-cost-summary strong{font-size:15px;font-weight:500}.api-cost-summary .saved strong{color:#248a3d}.api-cost-note{margin:0 2px 16px;font-size:9.5px;color:#8e8e93}.api-usage-list{display:flex;flex-direction:column;gap:8px}.api-usage-row{display:grid;grid-template-columns:minmax(160px,1.3fr) repeat(6,minmax(86px,.7fr)) auto;gap:10px;align-items:center;background:#fff;border:.5px solid rgba(0,0,0,.08);border-radius:16px;padding:14px 16px}.api-usage-main{display:flex;min-width:0;flex-direction:column;gap:3px}.api-usage-main strong{font-size:12px}.api-usage-main span,.api-usage-main small{font-size:10px;color:#8e8e93;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.api-usage-stat{display:flex;flex-direction:column;gap:3px}.api-usage-stat span{font-size:9px;color:#8e8e93}.api-usage-stat strong{font-size:12px;font-weight:500}.api-usage-stat.cost strong{font-size:11px}.api-usage-stat.saving.hit strong,.api-usage-stat.read.hit strong{color:#248a3d}.api-usage-stat.write strong{color:#a36a18}
      @media(max-width:680px){.api-page-header{padding:0 16px}.api-page-main{width:calc(100% - 24px);margin-top:18px}.api-card-grid{grid-template-columns:1fr}.api-section-heading{align-items:center}.api-route-card{grid-template-columns:1fr}.api-route-fields,.api-form-grid{grid-template-columns:1fr}.api-route-card>.api-button{width:100%}.api-cost-summary{grid-template-columns:1fr 1fr}.api-cost-summary strong{font-size:12px}.api-usage-row{grid-template-columns:repeat(4,1fr)}.api-usage-main{grid-column:1/-1}.api-usage-row>.api-status{position:absolute;right:30px}.api-usage-stat{text-align:center}}
    `}</style>
  </div>;
}

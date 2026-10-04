import { supabase } from "./supabase.js";

const defaultApiBaseUrl = import.meta.env.DEV
  ? "http://localhost:3000"
  : "https://my-ai-lover-backend.onrender.com";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, "");

export async function api(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in first");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${session.access_token}` },
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(data?.error || data?.reply || "Request failed");
  }

  return data;
}

export async function streamApi(path, options = {}, onEvent = () => {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in first");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...options.headers, Accept: "text/event-stream", Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Request failed");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalEvent = null;
  const processBlock = (block) => {
    let event = "message";
    let data = null;
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) {
        try { data = JSON.parse(line.slice(5).trim()); } catch { data = null; }
      }
    }
    if (data) {
      onEvent(event, data);
      if (["done", "truncated", "cancelled", "error"].includes(event)) finalEvent = { event, data };
    }
  };
  const drain = (flush = false) => {
    buffer = buffer.replace(/\r\n/g, "\n");
    const blocks = buffer.split("\n\n");
    const tail = blocks.pop() || "";
    buffer = flush ? "" : tail;
    for (const block of blocks) if (block.trim()) processBlock(block);
    if (flush && tail.trim()) processBlock(tail);
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    drain(false);
  }
  buffer += decoder.decode();
  drain(true);
  return finalEvent;
}

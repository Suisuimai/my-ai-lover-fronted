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

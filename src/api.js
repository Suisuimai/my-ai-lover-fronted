const defaultApiBaseUrl = import.meta.env.DEV
  ? "http://localhost:3000"
  : "https://my-ai-lover-backend.onrender.com";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, "");

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(data?.error || data?.reply || "Request failed");
  }

  return data;
}

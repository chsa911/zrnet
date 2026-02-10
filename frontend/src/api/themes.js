// src/api/themes.js
import { API_BASE } from "./config";

const ENV_BASE = (import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_API_BASE || "").trim();
const BASE = String(ENV_BASE || API_BASE || "/api").replace(/\/$/, "");

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  if (BASE.endsWith("/api") && p.startsWith("/api/")) return `${BASE}${p.slice(4)}`;
  return `${BASE}${p}`;
}

async function httpJson(path) {
  const res = await fetch(buildUrl(path), { credentials: "include", cache: "no-store" });
  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    // return a clearer error than JSON.parse crashing the app
    throw new Error(`Expected JSON from ${path}, got: ${text.slice(0, 120)}`);
  }
}

export async function listThemes() {
  // your backend should serve this:
  // SELECT abbr, full_name, image_path, description, sort_order FROM public.themes WHERE is_active=true ORDER BY sort_order, full_name;
  return httpJson("/themes").catch(() => httpJson("/api/themes"));
}
// frontend/src/api/comments.js
import { API_BASE } from "./config";

// Same base logic as other api modules (avoids /api/api duplication)
const ENV_BASE = (import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_API_BASE || "").trim();
const BASE = String(ENV_BASE || API_BASE || "/api").replace(/\/$/, "");

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  if (BASE.endsWith("/api") && p.startsWith("/api/")) return `${BASE}${p.slice(4)}`;
  return `${BASE}${p}`;
}

async function http(path, { method = "GET", json, signal } = {}) {
  const res = await fetch(buildUrl(path), {
    method,
    cache: "no-store",
    headers: json ? { "Content-Type": "application/json" } : undefined,
    body: json ? JSON.stringify(json) : undefined,
    signal,
    credentials: "include",
  });

  const text = await res.text();
  if (!res.ok) {
    let msg = text || `HTTP ${res.status}`;
    try {
      const j = text ? JSON.parse(text) : null;
      msg = j?.message || j?.error || msg;
    } catch {}
    throw new Error(msg);
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

/* =========================
   PUBLIC COMMENTS API
   ========================= */

export async function listPublicBookComments(bookId, { limit = 200, signal } = {}) {
  if (!bookId) throw new Error("Missing bookId");
  const qs = new URLSearchParams();
  if (limit) qs.set("limit", String(limit));
  const url = `/public/books/${encodeURIComponent(bookId)}/comments?${qs.toString()}`;
  const data = await http(url, { signal });
  const items = data?.items ?? (Array.isArray(data) ? data : []);
  return Array.isArray(items) ? items : [];
}

export async function createPublicBookComment(bookId, { authorName = "", body = "", website = "" } = {}) {
  if (!bookId) throw new Error("Missing bookId");
  return http(`/public/books/${encodeURIComponent(bookId)}/comments`, {
    method: "POST",
    json: { authorName, body, website },
  });
}

/* =========================
   ADMIN COMMENTS API
   ========================= */

export async function listAdminComments({ status = "pending", bookId = "", page = 1, limit = 50 } = {}) {
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (bookId) qs.set("bookId", bookId);
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  return http(`/admin/comments?${qs.toString()}`);
}

export async function approveComment(id) {
  if (!id) throw new Error("Missing comment id");
  return http(`/admin/comments/${encodeURIComponent(id)}/approve`, { method: "POST" });
}

export async function rejectComment(id) {
  if (!id) throw new Error("Missing comment id");
  return http(`/admin/comments/${encodeURIComponent(id)}/reject`, { method: "POST" });
}

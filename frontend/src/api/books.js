// frontend/src/api/books.js
import { API_BASE } from "./config";

const ENV_BASE = (import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_API_BASE || "").trim();
const BASE = String(ENV_BASE || API_BASE || "/api").replace(/\/$/, "");

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;

  // avoid /api/api duplication
  if (BASE.endsWith("/api") && p.startsWith("/api/")) return `${BASE}${p.slice(4)}`;
  return `${BASE}${p}`;
}

async function http(path, { method = "GET", json, body, headers, signal } = {}) {
  const res = await fetch(buildUrl(path), {
    method,
    cache: "no-store",
    credentials: "include",
    headers:
      json
        ? { "Content-Type": "application/json", ...(headers || {}) }
        : headers,
    body: json ? JSON.stringify(json) : body,
    signal,
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

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function qsFromObject(obj = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  return sp.toString();
}

/* ---------------- admin books ---------------- */

export async function listBooks(params = {}, opts = {}) {
  const query =
    typeof params === "string"
      ? { q: params }
      : { ...params };

  const qs = qsFromObject(query);
  return http(`/books${qs ? `?${qs}` : ""}`, { signal: opts.signal });
}

export const fetchBooks = listBooks;

export async function listBooksByPages(pages, { page = 1, limit = 200, signal } = {}) {
  return listBooks({ pages, page, limit }, { signal });
}

export async function getBook(id, { signal } = {}) {
  if (!id) throw new Error("Missing book id");
  return http(`/books/${encodeURIComponent(id)}`, { signal });
}

export async function autocomplete(field, q, { limit = 10, signal } = {}) {
  const qs = qsFromObject({ field, q, limit });
  const data = await http(`/books/autocomplete?${qs}`, { signal });
  return Array.isArray(data) ? data : [];
}

export async function registerBook(payload, { signal } = {}) {
  return http(`/books`, { method: "POST", json: payload, signal });
}

export async function registerExistingBook(id, payload, { signal } = {}) {
  if (!id) throw new Error("Missing book id");
  return http(`/admin/books/${encodeURIComponent(id)}/register`, {
    method: "POST",
    json: payload,
    signal,
  });
}

export async function updateBook(id, payload, { signal } = {}) {
  if (!id) throw new Error("Missing book id");
  return http(`/books/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: payload,
    signal,
  });
}

export async function deleteBook(id, { signal } = {}) {
  if (!id) throw new Error("Missing book id");
  return http(`/books/${encodeURIComponent(id)}`, {
    method: "DELETE",
    signal,
  });
}

export async function setTop(id, top, { signal } = {}) {
  return updateBook(id, { BTop: !!top }, { signal });
}

export async function setStatus(id, status, { signal } = {}) {
  return updateBook(id, { status }, { signal });
}

/* ---------------- admin helpers ---------------- */

export async function findDraft(params = {}, { signal } = {}) {
  const qs = qsFromObject(params);
  return http(`/admin/drafts/find?${qs}`, { signal });
}

export async function lookupIsbn(isbn, { signal } = {}) {
  const qs = qsFromObject({ isbn });

  try {
    return await http(`/enrich/lookup?${qs}`, { signal });
  } catch {
    return http(`/enrich/isbn?${qs}`, { signal });
  }
}

export async function uploadCover(id, file, { signal } = {}) {
  if (!id) throw new Error("Missing book id");
  if (!file) throw new Error("Missing cover file");

  const fd = new FormData();
  fd.append("cover", file);

  return http(`/admin/books/${encodeURIComponent(id)}/cover`, {
    method: "POST",
    body: fd,
    signal,
  });
}

/* ---------------- public books ---------------- */

export async function listPublicBooks(
  {
    bucket,
    year,
    q,
    author,
    title,
    limit = 50,
    page,
    offset,
    signal,
  } = {}
) {
  const finalOffset =
    offset !== undefined
      ? Number(offset) || 0
      : page !== undefined
        ? Math.max(0, (Number(page) - 1) * Number(limit || 50))
        : 0;

  const qs = qsFromObject({
    bucket,
    year,
    q,
    author,
    title,
    limit,
    offset: finalOffset,
    meta: 1,
  });

  const data = await http(`/public/books?${qs}`, { signal });

  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      limit: Number(limit) || data.length,
      offset: finalOffset,
    };
  }

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number.isFinite(data?.total) ? data.total : 0,
    limit: Number.isFinite(data?.limit) ? data.limit : Number(limit) || 50,
    offset: Number.isFinite(data?.offset) ? data.offset : finalOffset,
  };
}

export async function getPublicBook(id, { signal } = {}) {
  if (!id) throw new Error("Missing book id");
  return http(`/public/books/${encodeURIComponent(id)}`, { signal });
}

export async function listStockAuthors({ limit = 80, signal } = {}) {
  const qs = qsFromObject({ limit });
  const data = await http(`/public/books/stock-authors?${qs}`, { signal });
  return Array.isArray(data) ? data : [];
}

export async function listMostReadAuthors({ limit = 50, signal } = {}) {
  const qs = qsFromObject({ limit });
  const data = await http(`/public/books/most-read-authors?${qs}`, { signal });
  return Array.isArray(data) ? data : [];
}
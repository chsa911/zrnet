// frontend/src/api/books.js
import { API_BASE } from "./config";

// Production default: same-origin behind Caddy (/api -> api container)
// For local dev: set VITE_API_BASE_URL=http://localhost:4000/api
const ENV_BASE = (import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_API_BASE || "").trim();
const BASE = String(ENV_BASE || API_BASE || "/api").replace(/\/$/, "");

/** Build an absolute URL against BASE while avoiding /api/api duplication */
function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;

  // avoid /api/api duplication
  if (BASE.endsWith("/api") && p.startsWith("/api/")) return `${BASE}${p.slice(4)}`;
  return `${BASE}${p}`;
}

/** Low-level HTTP helper returning JSON when possible */
async function http(path, { method = "GET", json, signal } = {}) {
  const opts = {
    method,
    cache: "no-store",
    headers: json ? { "Content-Type": "application/json" } : undefined,
    body: json ? JSON.stringify(json) : undefined,
    signal,
    credentials: "include",
  };

  const res = await fetch(buildUrl(path), opts);
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

/** Normalize varied API response shapes into { items, total } */
function normalize(d) {
  let items =
    d?.items ??
    d?.data ??
    d?.results ??
    d?.rows ??
    d?.docs ??
    d?.books ??
    (Array.isArray(d) ? d : []);

  if (!Array.isArray(items)) items = [];

  const total = Number(d?.total ?? d?.count ?? d?.totalCount ?? d?.hits ?? items.length);
  return { items, total };
}

function toQuery(params = {}) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    s.append(k, String(v));
  }
  return s.toString();
}

/* =========================
   ADMIN / PRIVATE BOOKS API
   ========================= */

function buildListQS(params = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = "BEind",
    order = "desc",
    q,
    pages,
    BSeiten,
    status,
    reading_status,
  } = params;
  const base = {
    page,
    limit,
    sortBy,
    order,
    direction: order,
    dir: order === "asc" ? 1 : -1,
  };
  if (q && String(q).trim()) base.q = String(q).trim();
  // Optional filters supported by backend (ignored if unknown)
  if (pages !== undefined && pages !== null && pages !== "") base.pages = pages;
  if (BSeiten !== undefined && BSeiten !== null && BSeiten !== "") base.BSeiten = BSeiten;
  const st = status ?? reading_status;
  if (st !== undefined && st !== null && st !== "") base.status = st;
  return toQuery(base);
}

/** Convenience helper: list books by exact pages (for Sync-Issues candidate dropdown) */
export async function listBooksByPages(pages, { limit = 200, page = 1 } = {}) {
  const p = Number(pages);
  if (!Number.isFinite(p)) return { items: [], total: 0 };

  // Use the same endpoint resolution as listBooks()
  const res = await listBooks({ page, limit, pages: p, sortBy: "BEind", order: "desc" });
  return { items: res.items || [], total: res.total || 0 };
}

async function tryList(pathBase, params) {
  const qs = buildListQS(params);
  const data = await http(`${pathBase}?${qs}`);
  const { items, total } = normalize(data);
  return { items, total, raw: data };
}

/**
 * Existing function used by your app (admin/books).
 * Tries a few endpoints for backward-compat.
 */
export async function listBooks(params = {}) {
  const attempts = ["/books", "/books/list", "/api/books"];
  for (const base of attempts) {
    try {
      const res = await tryList(base, params);
      return { items: res.items, total: res.total, raw: res.raw, endpoint: base };
    } catch {}
  }
  const raw = await http(`/books`);
  const { items, total } = normalize(raw);
  return { items, total, raw, endpoint: "/books (no params)" };
}

export { listBooks as fetchBooks };

export async function updateBook(id, patch) {
  if (!id) throw new Error("Missing book id");
  return http(`/books/${encodeURIComponent(id)}`, { method: "PATCH", json: patch || {} });
}

export async function autocomplete(field, value) {
  const qs = toQuery({ field, q: value });
  return http(`/books/autocomplete?${qs}`);
}

export async function registerBook(payload) {
  return http(`/books`, { method: "POST", json: payload });
}

/* =========================
   PUBLIC BOOKS / STATS API
   ========================= */

/**
 * Get homepage stats.
 * GET /api/public/books/stats?year=2026
 */
export async function getPublicBookStats(year = 2026, { signal } = {}) {
  const qs = toQuery({ year });
  return http(`/public/books/stats?${qs}`, { signal });
}

/**
 * List public books for stats pages.
 * Expected backend: GET /api/public/books?bucket=stock|finished|abandoned|top&year=2026&q=...&limit=...&offset=...&author=...
 *
 * Returns { items, total, raw, endpoint }
 */
export async function listPublicBooks(params = {}) {
  const {
    bucket, // stock | finished | abandoned | top
    year,
    q,
    author,
    limit = 200,
    offset = 0,
    page, // optional convenience
  } = params;

  const effOffset = page ? (Math.max(1, Number(page)) - 1) * Number(limit) : Number(offset) || 0;

  const qs = toQuery({
    bucket,
    year,
    q: q && String(q).trim() ? String(q).trim() : undefined,
    author: author && String(author).trim() ? String(author).trim() : undefined,
    limit,
    offset: effOffset,
    // meta=1 is optional if your backend supports it; harmless if ignored
    meta: 1,
  });

  // allow some endpoint flexibility
  const attempts = ["/public/books", "/public/books/list"];
  let lastErr = null;

  for (const base of attempts) {
    try {
      const raw = await http(`${base}?${qs}`);
      const { items, total } = normalize(raw);
      return { items, total, raw, endpoint: base };
    } catch (e) {
      lastErr = e;
    }
  }

  // fall back (no params)
  try {
    const raw = await http(`/public/books`);
    const { items, total } = normalize(raw);
    return { items, total, raw, endpoint: "/public/books (no params)" };
  } catch (e) {
    throw lastErr || e;
  }
}

export { listPublicBooks as fetchPublicBooks };

/**
 * Stock authors ranking:
 * GET /api/public/books/stock-authors?limit=80
 */
export async function listStockAuthors({ limit = 80, signal } = {}) {
  const qs = toQuery({ limit });
  return http(`/public/books/stock-authors?${qs}`, { signal });
}

export async function listMostReadAuthors({ limit = 200, signal } = {}) {
  const qs = toQuery({ limit });
  return http(`/public/books/most-read-authors?${qs}`, { signal });
} 
import { API_BASE } from "./config";

// Production default: same-origin behind Caddy (/api -> api container)
// For local dev: set VITE_API_BASE_URL=http://localhost:4000/api
const ENV_BASE =
  (import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_API_BASE || "").trim();

const BASE = String(ENV_BASE || API_BASE || "/api").replace(/\/$/, "");

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;

  // avoid /api/api duplication
  if (BASE.endsWith("/api") && p.startsWith("/api/")) return `${BASE}${p.slice(4)}`;
  return `${BASE}${p}`;
}

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

function normalize(d) {
  let items =
    d?.items ?? d?.data ?? d?.results ?? d?.rows ?? d?.docs ?? d?.books ?? (Array.isArray(d) ? d : []);
  if (!Array.isArray(items)) items = [];

  const total =
    Number(d?.total ?? d?.count ?? d?.totalCount ?? d?.hits ?? items.length);

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

function buildListQS(params = {}) {
  const { page = 1, limit = 20, sortBy = "BEind", order = "desc", q } = params;
  const base = {
    page,
    limit,
    sortBy,
    order,
    direction: order,
    dir: order === "asc" ? 1 : -1,
  };
  if (q && String(q).trim()) base.q = String(q).trim();
  return toQuery(base);
}

async function tryList(pathBase, params) {
  const qs = buildListQS(params);
  const data = await http(`${pathBase}?${qs}`);
  const { items, total } = normalize(data);
  return { items, total, raw: data };
}

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
import { API_BASE } from "./config";

const BASE = String(API_BASE || "/api").replace(/\/$/, "");

async function req(url, { method = "GET", json } = {}) {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: json ? { "Content-Type": "application/json" } : undefined,
    body: json ? JSON.stringify(json) : undefined,
  });

  const text = await res.text();

  if (!res.ok) {
    if (text.startsWith("<!DOCTYPE") || text.includes("Cannot GET")) {
      throw new Error(`API endpoint not found: ${url}`);
    }
    try {
      const j = JSON.parse(text);
      throw new Error(j?.message || j?.error || text || `HTTP ${res.status}`);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function normalizeList(d) {
  const items = Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : [];
  const total = Number.isFinite(d?.total) ? d.total : items.length;
  const pages = Number.isFinite(d?.pages) ? d.pages : 1;
  return { items, total, pages };
}

export async function listNeedsReview({ page = 1, limit = 20, q } = {}) {
  const params = { page: String(page), limit: String(limit) };
  if (q) params.q = String(q);
  const qs = new URLSearchParams(params).toString();

  const urls = [
    `${BASE}/mobile-sync/needs-review?${qs}`,
    `${BASE}/mobileSync/needs-review?${qs}`,
    `${BASE}/mobile-sync/needs_review?${qs}`,
  ];

  let lastErr;
  for (const url of urls) {
    try {
      const d = await req(url);
      return normalizeList(d);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No mobile-sync endpoint worked");
}

export async function resolveMobileIssue(issueId, payload = {}) {
  const id = String(issueId || "").trim();
  if (!id) throw new Error("Missing issue id");

  const urls = [
    `${BASE}/mobile-sync/resolve`,
    `${BASE}/mobileSync/resolve`,
    `${BASE}/mobile-sync/issues/resolve`,
  ];

  let lastErr;
  for (const url of urls) {
    try {
      return await req(url, { method: "POST", json: { issueId: id, ...payload } });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Resolve failed");
}

export async function searchBarcodes({ q, mode = "similar", limit = 25 } = {}) {
  const query = String(q || "").trim();
  if (!query) return { items: [] };

  const qs = new URLSearchParams({
    q: query,
    mode: String(mode || "similar"),
    limit: String(limit || 25),
  }).toString();

  // ✅ only the real mounted routes
  
const urls = [
  `${BASE}/mobile-sync/barcodes/search?${qs}`,
  `${BASE}/mobile-sync/barcodes?${qs}`,

  // legacy mounts (fallback)
  `${BASE}/mobile/barcodes/search?${qs}`,
  `${BASE}/mobile/barcodes?${qs}`,
  `${BASE}/mobileSync/barcodes/search?${qs}`,
  `${BASE}/mobileSync/barcodes?${qs}`,
];

  let lastErr;
  for (const url of urls) {
    try {
      const d = await req(url);
      const items = Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : [];
      return { items };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Barcode search failed");
}
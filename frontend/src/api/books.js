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

// Default time limit for API calls. Without it, a stalled mobile connection
// leaves the save button spinning forever and the user never learns that
// nothing was confirmed.
const DEFAULT_TIMEOUT_MS = 30_000;
export const UPLOAD_TIMEOUT_MS = 120_000;

function apiError(message, extra = {}) {
  const err = new Error(message);
  Object.assign(err, extra);
  return err;
}

async function http(path, { method = "GET", json, body, headers, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = timeoutMs
    ? setTimeout(() => {
        timedOut = true;
        ctrl.abort();
      }, timeoutMs)
    : null;
  const forwardAbort = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", forwardAbort, { once: true });
  }

  let res;
  let text;
  try {
    res = await fetch(buildUrl(path), {
      method,
      cache: "no-store",
      credentials: "include",
      headers:
        json
          ? { "Content-Type": "application/json", ...(headers || {}) }
          : headers,
      body: json ? JSON.stringify(json) : body,
      signal: ctrl.signal,
    });
    text = await res.text();
  } catch (e) {
    // No (complete) answer from the server: the request may or may not have
    // been processed. Mark it so callers can offer a safe retry.
    if (timedOut) throw apiError("timeout", { code: "timeout", noResponse: true, cause: e });
    if (e?.name === "AbortError") throw e; // aborted by the caller
    throw apiError("network_error", { code: "network_error", noResponse: true, cause: e });
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", forwardAbort);
  }

  if (!res.ok) {
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {}
    const code = (data && typeof data === "object" && data.error) || `http_${res.status}`;
    // Prefer the backend's readable message; never surface an HTML error page.
    const msg = (data && typeof data === "object" && (data.message || data.error)) || code;
    throw apiError(String(msg), { status: res.status, code: String(code), data });
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

export async function autocomplete(field, q, { limit = 200, signal } = {}) {
  const qs = qsFromObject({ field, q, limit });
  const data = await http(`/books/autocomplete?${qs}`, { signal });
  return Array.isArray(data) ? data : [];
}

// phys_code (Breite-Höhe-Seiten-Position): is it already used by another book?
export async function checkPhysCode(code, { exclude, signal } = {}) {
  const qs = qsFromObject({ exclude });
  return http(`/books/phys-code/${encodeURIComponent(code)}${qs ? `?${qs}` : ""}`, { signal });
}

export async function registerBook(payload, { signal } = {}) {
  return http(`/books`, { method: "POST", json: payload, signal });
}

export async function recordBarcodeConflict(bookId, { barcode, note } = {}, { signal } = {}) {
  if (!bookId) throw new Error("Missing book id");
  if (!barcode) throw new Error("Missing barcode");
  return http(`/books/${encodeURIComponent(bookId)}/barcode-conflict`, {
    method: "POST",
    json: { barcode, note },
    signal,
  });
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

export async function highlightBook(bookId, presentedAs, { signal } = {}) {
  if (!bookId) throw new Error("Missing book id");
  if (!["finished", "received"].includes(presentedAs)) {
    throw new Error("Invalid highlight type");
  }

  return http(`/books/highlights`, {
    method: "POST",
    json: {
      book_id: bookId,
      presented_as: presentedAs,
    },
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
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    console.error("[lookupIsbn] /enrich/lookup failed, retrying via /enrich/isbn", e);
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
    timeoutMs: UPLOAD_TIMEOUT_MS,
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

export async function getPublicBook(id, { signal, lang } = {}) {
  if (!id) throw new Error("Missing book id");
  const qs = qsFromObject({ lang });
  return http(`/public/books/${encodeURIComponent(id)}${qs ? `?${qs}` : ""}`, { signal });
}

/* ---------------- admin: title translations ---------------- */

export async function listTitleTranslations({ signal } = {}) {
  return http(`/admin/title-translations`, { signal });
}

export async function saveTitleTranslations(bookId, payload, { signal } = {}) {
  if (!bookId) throw new Error("Missing book id");
  return http(`/admin/books/${encodeURIComponent(bookId)}/title-translations`, {
    method: "PUT",
    json: payload,
    signal,
  });
}

export async function listStockAuthors({ limit = 80, signal } = {}) {
  const qs = qsFromObject({ limit });
  const data = await http(`/public/books/stock-authors?${qs}`, { signal });
  return Array.isArray(data) ? data : [];
}

// Autocomplete for the public collection search
export async function suggestAuthors({ q, limit = 6, signal } = {}) {
  const qs = qsFromObject({ q, limit });
  const data = await http(`/public/books/author-suggest?${qs}`, { signal });
  return Array.isArray(data) ? data : [];
}

export async function listMostReadAuthors({ limit = 50, signal } = {}) {
  const qs = qsFromObject({ limit });
  const data = await http(`/public/books/most-read-authors?${qs}`, { signal });
  return Array.isArray(data) ? data : [];
}

export async function listReceivedCandidates({ signal } = {}) {
  return http(`/admin/highlights/received-candidates`, { signal });
}

export async function removeReceivedCandidate(id, { signal } = {}) {
  if (!id) throw new Error("Missing book id");
  return http(`/admin/books/${encodeURIComponent(id)}/remove-received-candidate`, {
    method: "POST",
    json: {},
    signal,
  });
}
export async function makeHighlight(id, { signal } = {}) {
  if (!id) throw new Error("Missing book id");
  return http(`/admin/books/${encodeURIComponent(id)}/make-highlight`, {
    method: "POST",
    json: {},
    signal,
  });
}
export async function uploadBookCover(bookId, file, { signal } = {}) {
  if (!bookId) throw new Error("Missing book id");
  if (!file) throw new Error("Missing cover file");

  const formData = new FormData();
  formData.append("cover", file);

  return http(`/books/${encodeURIComponent(bookId)}/cover`, {
    method: "POST",
    body: formData,
    signal,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
}

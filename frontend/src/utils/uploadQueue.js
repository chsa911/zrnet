import { apiUrl } from "../api/apiRoot";

// frontend/src/utils/uploadQueue.js
// IndexedDB upload queue (iPhone-safe).
//
// Supports three job shapes:
//  1) Legacy request-based jobs:
//     job.request = { url, method, bodyType, json, form, fileBlob, fileField, fileName }
//  2) PagesInLine "create" jobs:
//     { flow:"create", step:"create"|"cover", payload:{...}, cover:File, coverName, savedId? }
//  3) Existing-draft "finalize" jobs:
//     { flow:"finalize", draftId:"<book uuid>", step:"create"|"cover", payload:{...}, cover?:File }
//
// Key goals:
//  - Never leave jobs stuck on "uploading" forever (uploadingAt watchdog).
//  - For create/finalize jobs: perform the save step ONCE, then upload cover only if a file exists.
//  - Deduplicate repeated submit attempts so one bad save does not create a pile of identical queued jobs.
//  - Provide helpers expected by UploadQueueManager.
//
// Notes:
//  - DO NOT run any IDB actions at module top-level (no top-level await).
//  - iOS Safari can abort fetch and leave jobs stuck; we use uploadingAt + resetStuckUploadingJobs().

const DB_NAME = "zrnet_upload_queue";
const DB_VERSION = 1;
const STORE = "jobs";
const UPLOADING_TTL_MS = 60_000;
const MIN_FILE_BYTES = 1024;

let _processing = false;

function hasIDB() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function genId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `job_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

function openDb() {
  return new Promise((resolve) => {
    if (!hasIDB()) return resolve(null);

    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("status", "status", { unique: false });
        os.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  if (!db) return fn(null);

  return new Promise((resolve) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);

    let out;
    try {
      out = fn(store);
    } catch {
      resolve(null);
      return;
    }

    tx.oncomplete = () => resolve(out);
    tx.onerror = () => resolve(out);
    tx.onabort = () => resolve(out);
  });
}

function stripIsbnFields(obj) {
  const p = obj && typeof obj === "object" ? { ...obj } : {};
  delete p.isbn;
  delete p.isbn13;
  delete p.isbn10;
  delete p.isbn13_raw;
  delete p.isbn13Raw;
  delete p.isbn_raw;
  return p;
}

function safeStr(v) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function normalizeForKey(v) {
  return safeStr(v).toLowerCase().replace(/\s+/g, " ").trim();
}

function fingerprintForJob(job) {
  const p = job?.payload && typeof job.payload === "object" ? job.payload : {};
  const flow = safeStr(job?.flow || "create") || "create";

  if (flow === "finalize") {
    const draftId = safeStr(job?.draftId || job?.savedId);
    if (draftId) return `finalize:${draftId}`;
  }

  const isbn = normalizeForKey(p.isbn13 || p.isbn10 || p.isbn13_raw || p.isbn13Raw || p.isbn_raw || p.isbn);
  if (isbn) return `${flow}:isbn:${isbn}`;

  const title = normalizeForKey(p.title_display || p.BTitel || p.BKw || p.title_keyword || p.title);
  const author = normalizeForKey(p.name_display || p.author_name_display || p.author_display || p.BAutor || p.author);
  const publisher = normalizeForKey(p.publisher_name_display || p.BVerlag || p.publisher);

  if (title && author) return `${flow}:title-author:${title}|${author}`;
  if (title && publisher) return `${flow}:title-publisher:${title}|${publisher}`;
  if (title) return `${flow}:title:${title}`;
  return null;
}

function jobRank(job) {
  return (
    (job?.savedId ? 100 : 0) +
    (job?.draftId ? 30 : 0) +
    (job?.step === "cover" ? 20 : 0) +
    (job?.cover ? 10 : 0) +
    Number(job?.createdAt || 0) / 1e13
  );
}

async function squashDuplicateJobs() {
  return withStore("readwrite", (store) => {
    if (!store) return 0;

    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        const buckets = new Map();

        for (const job of items) {
          const fp = fingerprintForJob(job);
          if (!fp) continue;
          if (!buckets.has(fp)) buckets.set(fp, []);
          buckets.get(fp).push(job);
        }

        let removed = 0;
        for (const list of buckets.values()) {
          if (list.length < 2) continue;

          list.sort((a, b) => jobRank(b) - jobRank(a));
          const keep = list[0];

          for (const dup of list.slice(1)) {
            const merged = {
              ...keep,
              payload: { ...(dup?.payload || {}), ...(keep?.payload || {}) },
              cover: keep?.cover || dup?.cover || null,
              coverName: keep?.coverName || dup?.coverName || null,
              savedId: keep?.savedId || dup?.savedId || null,
              draftId: keep?.draftId || dup?.draftId || null,
              retries: Math.max(Number(keep?.retries || 0), Number(dup?.retries || 0)),
              createdAt: Math.min(Number(keep?.createdAt || Date.now()), Number(dup?.createdAt || Date.now())),
              status: keep?.status === "error" && dup?.status === "pending" ? "pending" : keep?.status,
              lastError: keep?.lastError || dup?.lastError || null,
            };
            store.put(merged);
            store.delete(dup.id);
            removed++;
          }
        }

        resolve(removed);
      };
      req.onerror = () => resolve(0);
    });
  });
}

export async function enqueueUploadJob(job) {
  const incoming = {
    id: job?.id || genId(),
    createdAt: job?.createdAt || Date.now(),
    status: job?.status || "pending",
    retries: job?.retries || 0,
    lastError: job?.lastError || null,
    uploadingAt: job?.uploadingAt || null,
    ...job,
  };

  return withStore("readwrite", (store) => {
    if (!store) return incoming.id;

    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        const fp = fingerprintForJob(incoming);
        const existing = fp ? items.find((j) => j?.id !== incoming.id && fingerprintForJob(j) === fp) : null;

        const next = existing
          ? {
              ...existing,
              ...incoming,
              id: existing.id,
              createdAt: Math.min(Number(existing.createdAt || Date.now()), Number(incoming.createdAt || Date.now())),
              payload: { ...(existing.payload || {}), ...(incoming.payload || {}) },
              cover: incoming.cover || existing.cover || null,
              coverName: incoming.coverName || existing.coverName || null,
              savedId: incoming.savedId || existing.savedId || null,
              draftId: incoming.draftId || existing.draftId || null,
              status: incoming.status || existing.status || "pending",
            }
          : incoming;

        store.put(next);
        resolve(next.id);
      };
      req.onerror = () => {
        store.put(incoming);
        resolve(incoming.id);
      };
    });
  });
}

export async function upsertUploadJob(job) {
  return enqueueUploadJob(job);
}

export async function getPendingUploadCount() {
  return withStore("readonly", (store) => {
    if (!store) return 0;

    return new Promise((resolve) => {
      const idx = store.index("status");
      const req = idx.count("pending");
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  });
}

export async function listUploadJobs() {
  return withStore("readonly", (store) => {
    if (!store) return [];

    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  });
}

export async function deleteUploadJob(id) {
  return withStore("readwrite", (store) => {
    if (!store) return;
    store.delete(id);
  });
}

async function updateJob(id, patch) {
  return withStore("readwrite", (store) => {
    if (!store) return false;

    return new Promise((resolve) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const cur = getReq.result;
        if (!cur) return resolve(false);
        store.put({ ...cur, ...patch });
        resolve(true);
      };
      getReq.onerror = () => resolve(false);
    });
  });
}

export async function resetStuckUploadingJobs({ maxAgeMs = UPLOADING_TTL_MS } = {}) {
  const now = Date.now();
  return withStore("readwrite", (store) => {
    if (!store) return 0;

    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        let n = 0;
        for (const j of items) {
          if (j?.status === "uploading") {
            const ts = Number(j.uploadingAt || 0);
            if (!ts || now - ts >= maxAgeMs) {
              store.put({
                ...j,
                status: "error",
                lastError: j.lastError || "stuck_upload_reset",
                uploadingAt: null,
              });
              n++;
            }
          }
        }
        resolve(n);
      };
      req.onerror = () => resolve(0);
    });
  });
}

async function fetchJson(url, opts) {
  const resp = await fetch(url, { credentials: "include", ...opts });
  const text = await resp.text().catch(() => "");
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!resp.ok) {
    const msg = json?.error || (text ? text.slice(0, 200) : `http_${resp.status}`);
    throw new Error(String(msg));
  }
  return json;
}

async function uploadCreateStep(job) {
  const rawPayload = job?.payload && typeof job.payload === "object" ? job.payload : {};
  const payload = job?.skipIsbn ? stripIsbnFields(rawPayload) : rawPayload;
  const body = { ...payload, requestId: payload.requestId || job.id };

  const book = await fetchJson(apiUrl("/books"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const bookId = book?.id || book?._id;
  if (!bookId) throw new Error("create_missing_book_id");

  await updateJob(job.id, { savedId: bookId, step: "cover", lastError: null });
  return { bookId };
}

async function uploadFinalizeStep(job) {
  const targetId = job?.draftId || job?.savedId;
  if (!targetId) throw new Error("missing_draft_id");

  const rawPayload = job?.payload && typeof job.payload === "object" ? job.payload : {};
  const payload = job?.skipIsbn ? stripIsbnFields(rawPayload) : rawPayload;

  const book = await fetchJson(apiUrl(`/admin/books/${encodeURIComponent(targetId)}/register`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const bookId = book?.id || book?._id || targetId;
  await updateJob(job.id, { savedId: bookId, step: "cover", lastError: null });
  return { bookId };
}

async function uploadCoverStep(job, bookIdOverride) {
  const bookId = bookIdOverride || job?.savedId || job?.draftId;
  if (!bookId) throw new Error("missing_book_id_for_cover");

  const file = job?.cover;
  const sz = file?.size ?? 0;
  if (!file) return false;
  if (sz < MIN_FILE_BYTES) throw new Error(`empty_file_${sz}`);

  const fd = new FormData();
  fd.append("cover", file, job?.coverName || file.name || "cover.jpg");

  await fetchJson(apiUrl(`/books/${encodeURIComponent(bookId)}/cover`), {
    method: "POST",
    body: fd,
  });

  return true;
}

async function legacyUploader(job) {
  const req = job?.request;
  if (!req?.url) throw new Error("upload_job_missing_request_url");

  const method = req.method || "POST";
  const headers = { ...(req.headers || {}) };

  let body;
  if (req.bodyType === "form") {
    const fd = new FormData();
    if (req.form && typeof req.form === "object") {
      for (const [k, v] of Object.entries(req.form)) {
        if (v !== undefined && v !== null) fd.append(k, String(v));
      }
    }
    if (req.json && typeof req.json === "object") {
      fd.append("payload", JSON.stringify(req.json));
    }
    if (req.fileBlob) {
      const sz = req.fileBlob?.size ?? req.fileBlob?.length ?? 0;
      if (sz < MIN_FILE_BYTES) throw new Error(`upload_empty_file_${sz}`);
      fd.append(req.fileField || "cover", req.fileBlob, req.fileName || "cover.jpg");
    }
    body = fd;
    delete headers["Content-Type"];
    delete headers["content-type"];
  } else {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    body = JSON.stringify(req.json ?? job.payload ?? {});
  }

  const resp = await fetch(req.url, { method, headers, body, credentials: "include" });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`upload_failed_http_${resp.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }
  return true;
}

async function processCreateOrFinalizeJob(job) {
  const flow = safeStr(job?.flow || "create") || "create";
  const hasCover = !!job?.cover;
  const step = safeStr(job?.step || "create") || "create";

  let bookId = job?.savedId || job?.draftId || null;

  if (step !== "cover") {
    if (flow === "finalize") {
      const out = await uploadFinalizeStep(job);
      bookId = out?.bookId || bookId;
    } else {
      const out = await uploadCreateStep(job);
      bookId = out?.bookId || bookId;
    }
  }

  if (!hasCover) return true;
  await uploadCoverStep(job, bookId);
  return true;
}

export async function processUploadQueue({ maxJobs = 5 } = {}) {
  if (!hasIDB()) return { processed: 0, failed: 0 };
  if (_processing) return { processed: 0, failed: 0, skipped: true };

  _processing = true;
  try {
    await resetStuckUploadingJobs({ maxAgeMs: UPLOADING_TTL_MS });
    await squashDuplicateJobs();

    const jobs = await listUploadJobs();
    const pending = jobs
      .filter((j) => j?.status === "pending" || j?.status === "error")
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .slice(0, maxJobs);

    let processed = 0;
    let failed = 0;

    for (const job of pending) {
      const id = job.id;
      await updateJob(id, { status: "uploading", uploadingAt: Date.now(), lastError: null });

      try {
        if (job.flow === "create" || job.flow === "finalize" || job.step === "create" || job.step === "cover" || job.payload || job.cover) {
          await processCreateOrFinalizeJob(job);
        } else {
          await legacyUploader(job);
        }

        await deleteUploadJob(id);
        processed++;
      } catch (e) {
        failed++;
        await updateJob(id, {
          status: "error",
          uploadingAt: null,
          retries: (job.retries || 0) + 1,
          lastError: String(e?.message || e),
        });
      }
    }

    return { processed, failed };
  } finally {
    _processing = false;
  }
}

export async function retryUploadJob(id) {
  return updateJob(id, { status: "pending", uploadingAt: null, lastError: null });
}

export async function retryUploadJobWithoutIsbn(id) {
  return withStore("readwrite", (store) => {
    if (!store) return false;

    return new Promise((resolve) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const cur = getReq.result;
        if (!cur) return resolve(false);

        const next = {
          ...cur,
          skipIsbn: true,
          payload: stripIsbnFields(cur.payload),
          status: "pending",
          uploadingAt: null,
          lastError: null,
        };

        store.put(next);
        resolve(true);
      };
      getReq.onerror = () => resolve(false);
    });
  });
}

export async function dropUploadJob(id) {
  return deleteUploadJob(id);
}

export async function dropAllUploadJobs() {
  const jobs = await listUploadJobs();
  for (const j of jobs) {
    await deleteUploadJob(j.id);
  }
  return true;
}

export const getUploadJobs = listUploadJobs;
export const removeUploadJob = deleteUploadJob;

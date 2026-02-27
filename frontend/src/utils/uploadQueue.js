// frontend/src/utils/uploadQueue.js
// IndexedDB upload queue (iPhone-safe).
//
// Supports two job shapes:
//  1) Legacy request-based jobs:
//     job.request = { url, method, bodyType, json, form, fileBlob, fileField, fileName }
//  2) PagesInLine "create" jobs (current UI):
//     { flow:"create", step:"create"|"cover", payload:{...}, cover:File, coverName, draftId }
//
// Key goals:
//  - Never leave jobs stuck on "uploading" forever (uploadingAt watchdog).
//  - For create-jobs: create book ONCE, store server book id in draftId, then upload cover.
//  - Provide helpers expected by UploadQueueManager (retryUploadJob, retryUploadJobWithoutIsbn, deleteUploadJob).

const DB_NAME = "zrnet_upload_queue";
const DB_VERSION = 1;
const STORE = "jobs";
const UPLOADING_TTL_MS = 60_000; // if uploading longer than this, consider "stuck"

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
    // iOS sometimes gives tx.error === null; never hard reject, keep app alive
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

export async function enqueueUploadJob(job) {
  const j = {
    id: job?.id || genId(),
    createdAt: job?.createdAt || Date.now(),
    status: job?.status || "pending", // pending | uploading | error
    retries: job?.retries || 0,
    lastError: job?.lastError || null,
    uploadingAt: job?.uploadingAt || null,
    ...job,
  };

  await withStore("readwrite", (store) => {
    if (!store) return;
    store.put(j);
  });

  return j.id;
}

// BookForm.jsx expects this name:
export async function upsertUploadJob(job) {
  return enqueueUploadJob(job); // put() already "upserts" in IndexedDB
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
            if (!ts || now - ts > maxAgeMs) {
              store.put({ ...j, status: "error", lastError: j.lastError || "stuck_upload_reset", uploadingAt: null });
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

/* -------------------------- upload implementations ------------------------- */

async function fetchJson(url, opts) {
  // Always include credentials so /api/admin cookies work across ports (same host).
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
  const payload = job?.payload && typeof job.payload === "object" ? job.payload : {};
  // Idempotency hint: use job id as requestId (backend supports it if books.request_id exists)
  const body = { ...payload, requestId: job.id };

  const book = await fetchJson("/api/books", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const bookId = book?.id || book?._id;
  if (!bookId) throw new Error("create_missing_book_id");

  // Persist server book id and advance to cover step
  await updateJob(job.id, { draftId: bookId, step: "cover", lastError: null });
  return { bookId };
}

async function uploadCoverStep(job, bookIdOverride) {
  const bookId = bookIdOverride || job?.draftId;
  if (!bookId) throw new Error("missing_book_id_for_cover");

  const file = job?.cover;
  const sz = file?.size ?? 0;
  if (!file) throw new Error("missing_file");
  if (sz < 1024) throw new Error(`empty_file_${sz}`);

  const fd = new FormData();
  fd.append("cover", file, job?.coverName || file.name || "cover.jpg");

  await fetchJson(`/api/admin/books/${encodeURIComponent(bookId)}/cover`, {
    method: "POST",
    body: fd,
  });

  return true;
}

// Legacy generic uploader (request-based jobs)
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
      if (sz < 1024) throw new Error(`upload_empty_file_${sz}`);
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

/* --------------------------------- public --------------------------------- */

export async function processUploadQueue({ maxJobs = 5 } = {}) {
  if (!hasIDB()) return { processed: 0, failed: 0 };

  // Auto-reset stuck "uploading" jobs so they become visible/retryable.
  await resetStuckUploadingJobs({ maxAgeMs: UPLOADING_TTL_MS });

  const jobs = await listUploadJobs();

  const pending = jobs
    .filter((j) => j?.status === "pending" || j?.status === "error")
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .slice(0, maxJobs);

  let processed = 0;
  let failed = 0;

  for (const job of pending) {
    const id = job.id;

    // Mark uploading with timestamp so we can reset if Safari kills fetch
    await updateJob(id, { status: "uploading", uploadingAt: Date.now(), lastError: null });

    try {
      // PagesInLine "create" jobs
      if (job.flow === "create" || job.step === "create" || job.step === "cover" || job.payload || job.cover) {
        if (!job.draftId || job.step === "create" || !job.step) {
          const { bookId } = await uploadCreateStep(job);
          // IMPORTANT: use the bookId we just got; do not depend on re-reading job from IDB
          await uploadCoverStep(job, bookId);
        } else {
          await uploadCoverStep(job);
        }
      } else {
        // Legacy request-based jobs
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
}

// --- Exports expected by UploadQueueManager.jsx ---
export async function retryUploadJob(id) {
  return updateJob(id, { status: "pending", uploadingAt: null, lastError: null });
}

export async function retryUploadJobWithoutIsbn(id) {
  // Mark as skipIsbn; also remove isbn fields from payload if present
  return withStore("readwrite", (store) => {
    if (!store) return false;

    return new Promise((resolve) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const cur = getReq.result;
        if (!cur) return resolve(false);

        const next = { ...cur, skipIsbn: true, status: "pending", uploadingAt: null, lastError: null };

        if (next.payload && typeof next.payload === "object") {
          const p = { ...next.payload };
          delete p.isbn;
          delete p.isbn13;
          delete p.isbn10;
          delete p.isbn13_raw;
          next.payload = p;
        }

        store.put(next);
        resolve(true);
      };
      getReq.onerror = () => resolve(false);
    });
  });
}

// Convenience "drop" helpers
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

// Common aliases some components expect:
export const getUploadJobs = listUploadJobs;
export const removeUploadJob = deleteUploadJob;
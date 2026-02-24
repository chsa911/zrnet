// frontend/src/utils/uploadQueue.js
const DB_NAME = "zrnet_upload_queue";
const DB_VERSION = 1;
const STORE = "jobs";

const ENV_BASE = (import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_API_BASE || "").trim();
const BASE = String(ENV_BASE || "/api").replace(/\/$/, "");

const MAX_RETRIES = 5;
const STUCK_UPLOAD_MS = 10 * 60 * 1000; // 10 minutes

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  if (BASE.endsWith("/api") && p.startsWith("/api/")) return `${BASE}${p.slice(4)}`;
  return `${BASE}${p}`;
}

function hasIDB() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function makeId() {
  try {
    return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  } catch {
    return `${Date.now()}-${Math.random()}`;
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
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
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  if (!db) return fn(null);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let out;
    try {
      out = fn(store);
    } catch (e) {
      reject(e);
      return;
    }
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function getJob(id) {
  return withStore("readonly", (store) => {
    if (!store) return null;
    return new Promise((resolve) => {
      const r = store.get(id);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    });
  });
}

async function putJob(job) {
  return withStore("readwrite", (store) => {
    if (!store) return;
    store.put(job);
  });
}

async function updateJob(id, patch) {
  const cur = await getJob(id);
  if (!cur) return false;
  await putJob({ ...cur, ...patch });
  return true;
}

async function listJobs() {
  return withStore("readonly", (store) => {
    if (!store) return [];
    return new Promise((resolve) => {
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => resolve([]);
    });
  });
}

/* ------------------ exports used by app ------------------ */

export async function upsertUploadJob(job) {
  const j = {
    id: job?.id || makeId(),
    createdAt: job?.createdAt || Date.now(),
    status: job?.status || "pending", // pending | uploading | error | blocked
    retries: job?.retries || 0,
    lastError: job?.lastError || null,
    uploadingSince: job?.uploadingSince || null,
    ...job,
  };
  await putJob(j);
  return j.id;
}

export async function deleteUploadJob(id) {
  return withStore("readwrite", (store) => {
    if (!store) return;
    store.delete(id);
  });
}

export async function listUploadJobs() {
  return listJobs();
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

export async function retryUploadJob(id) {
  return updateJob(id, { status: "pending", lastError: null, uploadingSince: null });
}

function stripIsbnFields(payload) {
  const p = { ...(payload || {}) };
  delete p.isbn13;
  delete p.isbn10;
  //delete p.isbn13_raw;
  delete p.isbn13Raw;
  delete p.isbn_raw;
  delete p.isbn;
  return p;
}

export async function retryUploadJobWithoutIsbn(id) {
  const job = await getJob(id);
  if (!job) return false;
  const payload2 = stripIsbnFields(job.payload);
  await putJob({
    ...job,
    payload: payload2,
    status: "pending",
    lastError: null,
    uploadingSince: null,
  });
  return true;
}

/* ------------------ uploader ------------------ */

async function fetchJsonOrText(url, opts) {
  const res = await fetch(url, { credentials: "include", ...opts });
  const text = await res.text().catch(() => "");
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const msg = json?.error || json?.message || text || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json ?? text;
}

async function unstickUploadingJobs() {
  const jobs = await listJobs();
  const now = Date.now();
  const stuck = jobs.filter(
    (j) =>
      j?.status === "uploading" &&
      (j.uploadingSince == null || now - Number(j.uploadingSince) > STUCK_UPLOAD_MS)
  );
  for (const j of stuck) {
    await updateJob(j.id, {
      status: "error",
      lastError: j.lastError || "stuck_upload_reset",
      uploadingSince: null,
    });
  }
}

async function uploadBookJob(job) {
  if (typeof navigator !== "undefined" && navigator && navigator.onLine === false) {
    throw new Error("offline");
  }

  const id = job.id;
  const flow = job.flow || "create";

  let savedId = job.savedId || null;

  if (!savedId) {
    try {
      if (flow === "finalize") {
        if (!job.draftId) throw new Error("missing_draftId");
        const r = await fetchJsonOrText(
          buildUrl(`/admin/books/${encodeURIComponent(job.draftId)}/register`),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(job.payload || {}),
          }
        );
        savedId = r?.id || r?._id || job.draftId;
      } else {
        const r = await fetchJsonOrText(buildUrl(`/books`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(job.payload || {}),
        });
        savedId = r?.id || r?._id;
      }
    } catch (e) {
      // If server rejects ISBN, retry once without ISBN fields (never block)
      const msg = String(e?.message || "");
      if ((e?.status === 400 || e?.status === 422) && /isbn/i.test(msg)) {
        const payload2 = stripIsbnFields(job.payload);
        const r2 = await fetchJsonOrText(buildUrl(`/books`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload2),
        });
        savedId = r2?.id || r2?._id;
        await updateJob(id, { payload: payload2 });
      } else {
        throw e;
      }
    }

    if (!savedId) throw new Error("save_failed_no_id");
    await updateJob(id, { savedId });
  }

  const cover = job.cover || null;
  if (cover) {
    const fd = new FormData();
    fd.append("cover", cover, job.coverName || "cover.jpg");
    await fetchJsonOrText(buildUrl(`/admin/books/${encodeURIComponent(savedId)}/cover`), {
      method: "POST",
      body: fd,
    });
  }

  await deleteUploadJob(id);
}

export async function processUploadQueue({ maxJobs = 5 } = {}) {
  if (!hasIDB()) return { processed: 0, failed: 0 };

  await unstickUploadingJobs();

  const jobs = await listJobs();

  // blocked jobs are ignored until manual retry
  const candidates = jobs
    .filter((j) => j?.status === "pending" || j?.status === "error")
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    .slice(0, maxJobs);

  let processed = 0;
  let failed = 0;

  for (const job of candidates) {
    await updateJob(job.id, {
      status: "uploading",
      lastError: null,
      uploadingSince: Date.now(),
    });

    try {
      await uploadBookJob(job);
      processed++;
    } catch (e) {
      failed++;
      const nextRetries = (job.retries || 0) + 1;
      await updateJob(job.id, {
        status: nextRetries >= MAX_RETRIES ? "blocked" : "error",
        retries: nextRetries,
        lastError: String(e?.message || e),
        uploadingSince: null,
      });
      // continue => no blockage
    }
  }

  return { processed, failed };
}
// frontend/src/api/barcodes.js  (REPLACE FILE CONTENT)
import { getApiRoot } from "./apiRoot";

export async function previewBarcode(width, height) {
  const qs = new URLSearchParams({ width: String(width), height: String(height) }).toString();
  const res = await fetch(`${getApiRoot()}/barcodes/preview-barcode?${qs}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  // backend returns: { sizegroup, color, pos, band, candidate, availableCount }
  return {
    candidate: data?.candidate ?? null,
    sizegroup: data?.sizegroup ?? null,
    color: data?.color ?? null,
    pos: data?.pos ?? null,
    band: data?.band ?? null,
    availableCount: data?.availableCount ?? null,
    // backwards-ish alias (older UI called this "series")
    series: data?.series ?? data?.color ?? null,
  };
}

// -------------------- admin: barcode inventory dashboard --------------------

export async function getBarcodeSummary() {
  const res = await fetch(`${getApiRoot()}/admin/barcodes/summary`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export async function listBarcodes({ status, q, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (status && String(status).trim() && String(status).toLowerCase() !== "all") {
    params.set("status", String(status).trim());
  }
  if (q && String(q).trim()) params.set("q", String(q).trim());
  params.set("page", String(page));
  params.set("limit", String(limit));

  const res = await fetch(`${getApiRoot()}/admin/barcodes?${params.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}
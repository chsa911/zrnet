// frontend/src/api/saveFailures.js – "offene Vorgänge" (rejected registrations)
import { apiUrl } from "./apiRoot";

async function request(path, { method = "GET", json } = {}) {
  const res = await fetch(apiUrl(path), {
    method,
    credentials: "include",
    cache: "no-store",
    headers: json ? { "Content-Type": "application/json" } : undefined,
    body: json ? JSON.stringify(json) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.code = data?.error;
    throw err;
  }
  return data;
}

export function getOpenSaveFailures() {
  return request("/admin/save-failures");
}

export function dismissSaveFailures(ids, note) {
  return request("/admin/save-failures/dismiss", { method: "POST", json: { ids, note } });
}

// Form values for re-registering a Vorgang (BookFormDesktop initialBook).
export function prefillFromFailure(item) {
  const p = item?.payload && typeof item.payload === "object" ? item.payload : {};
  const prefill = { ...p };
  if (!prefill.title_display && item?.title) prefill.title_display = item.title;
  if (!prefill.name_display && !prefill.author_lastname && item?.author) prefill.name_display = item.author;
  if ((prefill.pages === undefined || prefill.pages === null || prefill.pages === "") && item?.pages != null)
    prefill.pages = item.pages;
  if (!prefill.width_cm && item?.width_cm != null) prefill.width_cm = item.width_cm;
  if (!prefill.height_cm && item?.height_cm != null) prefill.height_cm = item.height_cm;
  // Never carry the old barcode over: the registration form has no barcode
  // field (it suggests one itself), so a stale code would be sent invisibly
  // and – if it caused the rejection – fail again.
  delete prefill.barcode;
  delete prefill.requestId;
  delete prefill.request_id;
  delete prefill.followup_attempt_ids;
  return prefill;
}

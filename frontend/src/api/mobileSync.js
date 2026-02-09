// frontend/src/api/mobileSync.js
import { getApiRoot } from "./apiRoot";

const API = getApiRoot();

async function fetchJson(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
    cache: "no-store",
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export async function listNeedsReview({ page = 1, limit = 20, maxPerPages = 25 } = {}) {
  const sp = new URLSearchParams();
  sp.set("page", String(page));
  sp.set("limit", String(limit));
  sp.set("max_per_pages", String(maxPerPages));
  return fetchJson(`/mobile/needs-review?${sp.toString()}`);
}

export async function resolveMobileIssue(
  issueId,
  { action = "apply", bookId, note, overridePages = false } = {}
) {
  if (!issueId) throw new Error("missing_issue_id");
  const body = {
    action,
    book_id: bookId || null,
    note: note || null,
    override_pages: !!overridePages,
  };
  return fetchJson(`/mobile/issues/${encodeURIComponent(issueId)}/resolve`, { method: "POST", body });
}
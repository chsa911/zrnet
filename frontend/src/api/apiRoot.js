// frontend/src/api/apiRoot.js
export function getApiRoot() {
  const raw = String(
    import.meta?.env?.VITE_API_BASE_URL ||
    import.meta?.env?.VITE_API_BASE ||
    ""
  ).trim();

  if (!raw) return "/api";

  const base = raw.replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

export function apiUrl(path = "") {
  if (!path) return getApiRoot();
  if (/^https?:\/\//i.test(path)) return path;

  const root = getApiRoot().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;

  // supports both "/admin/..." and "/api/admin/..."
  return p.startsWith("/api/") ? `${root}${p.slice(4)}` : `${root}${p}`;
}

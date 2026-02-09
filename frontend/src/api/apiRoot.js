// frontend/src/api/apiRoot.js
// Builds the API root (ending with /api) without duplicating "/api".
export function getApiRoot() {
  const raw = ((import.meta?.env?.VITE_API_BASE_URL || "") + "").trim();
  if (!raw) return "/api";
  const base = raw.replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}
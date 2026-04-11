// src/api/themes.js
import { apiUrl } from "./apiRoot";

async function httpJson(path) {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    cache: "no-store",
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status}`);
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Expected JSON from ${path}, got: ${text.slice(0, 120)}`);
  }
}

export async function listThemes() {
  return httpJson("/themes");
}

export async function listThemesSummary() {
  return httpJson("/themes/summary");
}

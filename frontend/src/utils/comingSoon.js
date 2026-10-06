// frontend/src/utils/comingSoon.js
// Pages that are linked but not finished yet.
// Visitors who open one of these paths see a friendly "coming soon" page
// with the expected launch month instead of a 404.
//
//   path:  the URL path (exact match, no trailing slash)
//   eta:   expected launch as "YYYY-MM" (shown as e.g. "Dezember 2026"), or null = "soon"
//   title: optional i18n key for the page name; falls back to a generic heading
//
// To launch a page: build its route in App.jsx and remove its entry here.

export const COMING_SOON = [
  // Example:
  // { path: "/newsletter", eta: "2026-12", title: "coming_soon.name.newsletter" },
];

export function findComingSoon(pathname) {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return COMING_SOON.find((c) => c.path === p) || null;
}

/** "2026-12" -> "Dezember 2026" (in the UI language). */
export function formatEta(eta, locale) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(eta || ""));
  if (!m) return "";
  try {
    return new Intl.DateTimeFormat(locale || "de", { month: "long", year: "numeric" }).format(
      new Date(Number(m[1]), Number(m[2]) - 1, 1)
    );
  } catch {
    return eta;
  }
}

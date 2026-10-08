// frontend/src/utils/seo.js
//
// Per-page <title>, meta description, canonical URL and social-preview
// (Open Graph / Twitter) tags for the SPA.
//
// Usage in a page component (call unconditionally, before early returns):
//   useSeo({ title: "Book title – Author", description: "…", path: "/book/123" });
//
// When the page unmounts, the defaults from index.html are restored, so
// pages that don't call useSeo() show the site-wide title/description.
import { useEffect } from "react";

export const SITE_NAME = "Christophers Pages";
export const SITE_ORIGIN = "https://pagesinline.com";

// English defaults: Google crawls without a saved locale, so it sees the
// English version of the site. Pages pass translated strings via useSeo().
export const DEFAULT_TITLE = `${SITE_NAME} – Turn waiting time into reading time`;
export const DEFAULT_DESCRIPTION =
  "PagesInLine: split paperbacks into pocket sections and turn every waiting minute into reading time. My books, authors, themes and recommendations.";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/assets/images/allgemein/hosentasche_link.jpeg`;

function clip(text, max = 160) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function absUrl(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `${SITE_ORIGIN}${u.startsWith("/") ? "" : "/"}${u}`;
}

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!content) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function apply({ title, description, canonical, image, type, noindex }) {
  document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", noindex ? "noindex, follow" : "");
  upsertCanonical(canonical);

  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:type", type || "website");
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:image", image);
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);
}

/**
 * @param {object} opts
 * @param {string} [opts.title]        Page title without the site name (it is appended).
 * @param {string} [opts.description]  Short summary, clipped to ~160 chars.
 * @param {string} [opts.path]         Canonical path, e.g. "/book/123". Defaults to the current path.
 * @param {string} [opts.image]        Preview image (absolute or site-relative URL).
 * @param {string} [opts.type]         og:type, e.g. "book". Defaults to "website".
 * @param {boolean} [opts.noindex]     Ask search engines not to index this page.
 */
export function useSeo({ title, description, path, image, type, noindex } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${clip(title, 70)} | ${SITE_NAME}` : DEFAULT_TITLE;
    const canonicalPath = path ?? window.location.pathname;
    apply({
      title: fullTitle,
      description: clip(description || DEFAULT_DESCRIPTION),
      canonical: noindex ? "" : absUrl(canonicalPath),
      image: absUrl(image) || DEFAULT_IMAGE,
      type,
      noindex,
    });
  }, [title, description, path, image, type, noindex]);

  // Restore site defaults when the page goes away.
  useEffect(
    () => () =>
      apply({
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        canonical: "",
        image: DEFAULT_IMAGE,
        type: "website",
        noindex: false,
      }),
    []
  );
}

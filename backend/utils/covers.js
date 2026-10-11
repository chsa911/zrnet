// backend/utils/covers.js
// Shared cover URL resolution — checks the filesystem so old-format
// covers (covers/{id}.jpg) and new-format covers (covers/normalized/{id}.jpg)
// are both found correctly.

const fs   = require("fs");
const path = require("path");

const UPLOAD_ROOT        = process.env.UPLOAD_ROOT || path.resolve(__dirname, "../../uploads");
const COVERS_DIR         = path.join(UPLOAD_ROOT, "covers");
const COVERS_NORMALIZED  = path.join(COVERS_DIR, "normalized");
// Covers of editions in other languages: covers/locale/{locale}/{id}.jpg (+ {id}-home.jpg)
const COVERS_LOCALE      = path.join(COVERS_DIR, "locale");
const LOCALE_RE          = /^[a-z]{2}(-[A-Z]{2})?$/;
const ID_RE              = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** File paths of the cover for the edition in `locale` (null if id/locale are not valid). */
function localeCoverPaths(id, locale) {
  if (!id || !locale || !ID_RE.test(String(id)) || !LOCALE_RE.test(String(locale))) return null;
  const dir = path.join(COVERS_LOCALE, locale);
  return {
    dir,
    full: path.join(dir, `${id}.jpg`),
    home: path.join(dir, `${id}-home.jpg`),
  };
}

/**
 * Cover of the edition in `locale`, or null if none was uploaded.
 * URLs carry ?v=<mtime> so a replaced cover is not served from the browser cache.
 */
function resolveLocaleCover(id, locale) {
  const p = localeCoverPaths(id, locale);
  if (!p) return null;
  let st;
  try {
    st = fs.statSync(p.full);
  } catch {
    return null;
  }
  const base = `/uploads/covers/locale/${locale}`;
  const v = Math.round(st.mtimeMs);
  const full = `${base}/${id}.jpg?v=${v}`;
  const home = fs.existsSync(p.home) ? `${base}/${id}-home.jpg?v=${v}` : full;
  return { full, home };
}

/**
 * Returns the serving URL for a book cover, or "" if no file exists.
 * Priority: edition cover for `locale` → normalized/ (new) → root covers/ (old).
 */
function resolveCoverUrl(id, locale = null) {
  if (!id) return "";
  const lc = locale ? resolveLocaleCover(id, locale) : null;
  if (lc) return lc.full;
  if (fs.existsSync(path.join(COVERS_NORMALIZED, `${id}.jpg`)))
    return `/uploads/covers/normalized/${id}.jpg`;
  if (fs.existsSync(path.join(COVERS_DIR, `${id}.jpg`)))
    return `/uploads/covers/${id}.jpg`;
  return "";
}

module.exports = { resolveCoverUrl, resolveLocaleCover, localeCoverPaths };

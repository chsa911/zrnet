// backend/utils/covers.js
// Shared cover URL resolution — checks the filesystem so old-format
// covers (covers/{id}.jpg) and new-format covers (covers/normalized/{id}.jpg)
// are both found correctly.

const fs   = require("fs");
const path = require("path");

const UPLOAD_ROOT        = process.env.UPLOAD_ROOT || path.resolve(__dirname, "../../uploads");
const COVERS_DIR         = path.join(UPLOAD_ROOT, "covers");
const COVERS_NORMALIZED  = path.join(COVERS_DIR, "normalized");

/**
 * Returns the serving URL for a book cover, or "" if no file exists.
 * Priority: normalized/ (new) → root covers/ (old).
 */
function resolveCoverUrl(id) {
  if (!id) return "";
  if (fs.existsSync(path.join(COVERS_NORMALIZED, `${id}.jpg`)))
    return `/uploads/covers/normalized/${id}.jpg`;
  if (fs.existsSync(path.join(COVERS_DIR, `${id}.jpg`)))
    return `/uploads/covers/${id}.jpg`;
  return "";
}

module.exports = { resolveCoverUrl };

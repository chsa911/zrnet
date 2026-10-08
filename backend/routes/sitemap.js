// backend/routes/sitemap.js
//
// GET /api/public/sitemap.xml
// Generates the sitemap from the database so every book and theme page is
// listed and the file never goes stale. nginx serves it at /sitemap.xml.
const express = require("express");
const router = express.Router();

const SITE = (process.env.PUBLIC_SITE_URL || "https://pagesinline.com").replace(/\/+$/, "");
const CACHE_MS = 60 * 60 * 1000; // rebuild at most once per hour

// Public pages that exist independently of the database.
const STATIC_PATHS = [
  "/",
  "/collection",
  "/titles",
  "/authors",
  "/top-authors",
  "/bookthemes",
  "/beta-test",
  "/coaching",
  "/info/so-funktionierts",
  "/info/beschaffung",
  "/info/faq",
  "/info/impressum",
  "/info/datenschutz",
];

let cache = { xml: null, at: 0 };

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isoDate(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
}

function urlEntry(path, lastmod) {
  const loc = `<loc>${esc(SITE + path)}</loc>`;
  const mod = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
  return `  <url>${loc}${mod}</url>`;
}

async function buildSitemap(pool) {
  const entries = STATIC_PATHS.map((p) => urlEntry(p));

  const themes = await pool.query(`
    SELECT abbr
    FROM public.themes
    WHERE is_active = true AND abbr IS NOT NULL AND trim(abbr) <> ''
    ORDER BY sort_order, abbr
  `);
  for (const r of themes.rows) {
    entries.push(urlEntry(`/bookthemes/${encodeURIComponent(r.abbr.trim())}`));
  }

  const books = await pool.query(`
    SELECT
      b.id::text AS id,
      GREATEST(b.reading_status_updated_at, b.registered_at) AS lastmod
    FROM public.books b
    ORDER BY b.registered_at DESC NULLS LAST, b.id
    LIMIT 45000
  `);
  for (const r of books.rows) {
    entries.push(urlEntry(`/book/${encodeURIComponent(r.id)}`, isoDate(r.lastmod)));
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

router.get("/", async (req, res) => {
  try {
    const now = Date.now();
    if (!cache.xml || now - cache.at > CACHE_MS) {
      const pool = req.app.get("pgPool");
      if (!pool) throw new Error("pgPool missing on app");
      cache = { xml: await buildSitemap(pool), at: now };
    }
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    return res.send(cache.xml);
  } catch (e) {
    console.error("GET sitemap.xml error:", e);
    return res.status(500).type("text/plain").send("sitemap_unavailable");
  }
});

module.exports = router;
module.exports._internal = { buildSitemap, esc, STATIC_PATHS };

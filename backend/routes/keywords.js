// Schlagworte (Tabellen keywords / book_keywords, Migration V20261111_01).
//
// Öffentlich (app.js: /api/public/keywords)
//   GET  /api/public/keywords              alle Schlagworte mit Anzahl Bücher
//   GET  /api/public/keywords/:slug/books  Schlagwort + alle Titel damit
//
// Admin (app.js: /api/books, Admin-Cookie über ADMIN_ONLY_API_PREFIXES)
//   PUT  /api/books/:id/keywords  { keywords: ["Bergsteigen", "Expedition"] }
//        ersetzt die komplette Liste des Buchs; unbekannte Namen werden angelegt.
//        Antwort: [{ id, slug, name }, ...]
//
// Die Schlagworte eines Buchs liefert GET /api/public/books/:id im Feld
// "keywords" mit (routes/publicBooks.js, loadBookKeywords).
//
// Formular "Buch registrieren / bearbeiten" (auch Search & Update): POST/PATCH
// /api/books mit body.keywords = ["…"] -> booksPgController.applyPlaceTags ->
// applyBookKeywords (in derselben Transaktion wie das Buch).
//
// Solange die Migration fehlt, liefern die Lese-Endpunkte leere Listen.

const express = require("express");
const { resolveCoverUrl } = require("../utils/covers");
const publicCache = require("../utils/publicCache");

const NOT_MIGRATED = new Set(["42P01", "42883", "42703"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_KEYWORDS_PER_BOOK = 50;
const MAX_NAME_LEN = 80;

function getPool(req) {
  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  return pool;
}

function cleanName(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LEN);
}

function slugify(name) {
  const base = String(name || "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || "schlagwort";
}

async function uniqueSlug(db, name) {
  const base = slugify(name);
  const { rows } = await db.query(
    `SELECT slug FROM public.keywords WHERE slug = $1 OR slug LIKE $1 || '-%'`,
    [base]
  );
  const used = new Set(rows.map((r) => r.slug));
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
}

function normalizeNames(raw) {
  const list = Array.isArray(raw) ? raw : raw == null || raw === "" ? [] : [raw];
  const names = [];
  const seen = new Set();
  for (const item of list) {
    for (const part of String(item ?? "").split(",")) {
      const n = cleanName(part);
      if (!n || seen.has(n.toLowerCase())) continue;
      seen.add(n.toLowerCase());
      names.push(n);
    }
  }
  return names;
}

/**
 * Ersetzt die Schlagworte eines Buchs durch `rawNames` (Namen, Groß/Klein egal).
 * Unbekannte Namen werden angelegt, ungenutzte Schlagworte gelöscht.
 * Läuft in der Transaktion des Aufrufers (db = Client nach BEGIN).
 * Fehlt die Migration noch, passiert nichts (das Buch wird trotzdem gespeichert).
 */
async function applyBookKeywords(db, bookId, rawNames) {
  if (!bookId) return;
  const ready = await db.query(`SELECT to_regclass('public.book_keywords') IS NOT NULL AS ok`);
  if (!ready.rows[0]?.ok) return;

  const names = normalizeNames(rawNames).slice(0, MAX_KEYWORDS_PER_BOOK);
  const ids = [];
  for (const name of names) {
    let r = await db.query(`SELECT id FROM public.keywords WHERE lower(name) = lower($1)`, [name]);
    if (!r.rowCount) {
      const slug = await uniqueSlug(db, name);
      r = await db.query(
        `INSERT INTO public.keywords (slug, name) VALUES ($1, $2)
         ON CONFLICT ((lower(name))) DO UPDATE SET updated_at = now()
         RETURNING id`,
        [slug, name]
      );
    }
    if (!ids.includes(r.rows[0].id)) ids.push(r.rows[0].id);
  }

  await db.query(
    `DELETE FROM public.book_keywords WHERE book_id = $1::uuid AND NOT (keyword_id = ANY($2::uuid[]))`,
    [bookId, ids]
  );
  if (ids.length) {
    await db.query(
      `INSERT INTO public.book_keywords (book_id, keyword_id, sort_order)
       SELECT $1::uuid, x.id, x.ord FROM unnest($2::uuid[]) WITH ORDINALITY AS x(id, ord)
       ON CONFLICT (book_id, keyword_id) DO UPDATE SET sort_order = EXCLUDED.sort_order`,
      [bookId, ids]
    );
  }
  // Schlagworte, die an keinem Buch mehr hängen, verschwinden wieder.
  await db.query(
    `DELETE FROM public.keywords k
      WHERE NOT EXISTS (SELECT 1 FROM public.book_keywords bk WHERE bk.keyword_id = k.id)`
  );
}

/** Schlagworte eines Buchs, für GET /api/public/books/:id. Nie ein Fehler. */
async function loadBookKeywords(db, bookId) {
  try {
    const { rows } = await db.query(
      `SELECT k.id::text AS id, k.slug, k.name
         FROM public.book_keywords bk
         JOIN public.keywords k ON k.id = bk.keyword_id
        WHERE bk.book_id::text = $1
        ORDER BY bk.sort_order NULLS LAST, lower(k.name)`,
      [String(bookId)]
    );
    return rows;
  } catch (e) {
    if (!NOT_MIGRATED.has(e?.code)) console.error("loadBookKeywords failed", e);
    return [];
  }
}

/* ------------------------------- öffentlich ------------------------------- */

const publicRouter = express.Router();

// Auf dem Server zwischengespeichert wie die Buchseiten (utils/publicCache.js),
// geleert beim Speichern von Schlagworten.
publicRouter.get("/", publicCache.cacheJson(() => "keywords:all|"), async (req, res) => {
  try {
    const { rows } = await getPool(req).query(`
      SELECT k.id::text AS id, k.slug, k.name, count(bk.book_id)::int AS book_count
        FROM public.keywords k
        LEFT JOIN public.book_keywords bk ON bk.keyword_id = k.id
       GROUP BY k.id
       ORDER BY lower(k.name)
    `);
    res.json(rows);
  } catch (e) {
    if (NOT_MIGRATED.has(e?.code)) return res.json([]);
    console.error("GET /api/public/keywords error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

const keywordBooksKey = (req) => {
  const slug = String(req.params.slug || "").trim().toLowerCase();
  if (!slug || slug.length > 120) return null;
  return `keywords:slug:${slug}|`;
};

publicRouter.get("/:slug/books", publicCache.cacheJson(keywordBooksKey), async (req, res) => {
  try {
    const pool = getPool(req);
    const slug = String(req.params.slug || "").trim().toLowerCase();
    const { rows: kw } = await pool.query(
      `SELECT id::text AS id, slug, name FROM public.keywords WHERE slug = $1`,
      [slug]
    );
    if (!kw[0]) return res.status(404).json({ error: "not_found" });

    const { rows: books } = await pool.query(
      `SELECT b.id::text AS id,
              b.title_display  AS title,
              b.author_display AS author,
              b.reading_status,
              b.top_book,
              b.registered_at
         FROM public.book_keywords bk
         JOIN public.books b ON b.id = bk.book_id
        WHERE bk.keyword_id = $1::uuid
        ORDER BY lower(b.author_display) NULLS LAST, lower(b.title_display) NULLS LAST`,
      [kw[0].id]
    );

    res.json({
      keyword: kw[0],
      total: books.length,
      books: books.map((b) => ({ ...b, cover_url: resolveCoverUrl(b.id) || null })),
    });
  } catch (e) {
    if (NOT_MIGRATED.has(e?.code)) return res.status(404).json({ error: "not_found" });
    console.error("GET /api/public/keywords/:slug/books error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------------------------------- admin --------------------------------- */

const adminRouter = express.Router();

adminRouter.put("/:id/keywords", async (req, res) => {
  const bookId = String(req.params.id || "").trim().toLowerCase();
  if (!UUID_RE.test(bookId)) return res.status(400).json({ error: "invalid_id" });

  const names = normalizeNames(req.body?.keywords);
  if (names.length > MAX_KEYWORDS_PER_BOOK) {
    return res.status(400).json({ error: "too_many_keywords", message: `Höchstens ${MAX_KEYWORDS_PER_BOOK} Schlagworte pro Buch.` });
  }

  const client = await getPool(req).connect();
  try {
    const ready = await client.query(`SELECT to_regclass('public.book_keywords') IS NOT NULL AS ok`);
    if (!ready.rows[0]?.ok) {
      return res.status(503).json({ error: "not_migrated", message: "Migration V20261111_01__keywords fehlt noch." });
    }
    await client.query("BEGIN");
    const book = await client.query(`SELECT 1 FROM public.books WHERE id = $1::uuid`, [bookId]);
    if (!book.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "not_found" });
    }
    await applyBookKeywords(client, bookId, names);
    await client.query("COMMIT");

    // Buchseite leert app.js (Buch-ID in der URL), die Schlagwort-Listen hier.
    publicCache.invalidatePrefix("keywords:");

    res.json(await loadBookKeywords(client, bookId));
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    if (NOT_MIGRATED.has(e?.code)) {
      return res.status(503).json({ error: "not_migrated", message: "Migration V20261111_01__keywords fehlt noch." });
    }
    console.error("PUT /api/books/:id/keywords error:", e);
    res.status(500).json({ error: "internal_error" });
  } finally {
    client.release();
  }
});

module.exports = { publicRouter, adminRouter, loadBookKeywords, applyBookKeywords };

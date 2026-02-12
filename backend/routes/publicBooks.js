// backend/routes/publicBooks.js
// Read-only endpoints used by the public site (/site and /site/books).

const express = require("express");
const router = express.Router();

function getPool(req) {
  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  return pool;
}

const clampInt = (x, def, min, max) => {
  const n = Number.parseInt(x, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
};

function normStr(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/**
 * GET /api/public/books
 * Query:
 *  - bucket: top|finished|abandoned|registered (default registered)
 *  - author: substring filter
 *  - title: substring filter
 *  - q: free text across title/author/publisher/barcode
 *  - limit (default 50, max 200)
 *
 * Returns array of rows: [{ author, title, ... }]
 * (kept compatible with the existing public frontend)
 */
router.get("/", async (req, res) => {
  try {
    const pool = getPool(req);

    const bucket = String(req.query.bucket || "registered").toLowerCase();
    const limit = clampInt(req.query.limit, 50, 1, 200);

    const author = normStr(req.query.author);
    const title = normStr(req.query.title);
    const q = normStr(req.query.q);

    const where = [];
    const params = [];

    // Bucket filters + sorting
    let orderBy = "b.registered_at DESC";
    if (bucket === "top") {
      where.push("b.top_book = true");
      orderBy = "b.top_book_set_at DESC NULLS LAST, b.registered_at DESC";
    } else if (bucket === "finished") {
      where.push("b.reading_status = 'finished'");
      orderBy = "b.reading_status_updated_at DESC NULLS LAST, b.registered_at DESC";
    } else if (bucket === "abandoned") {
      where.push("b.reading_status = 'abandoned'");
      orderBy = "b.reading_status_updated_at DESC NULLS LAST, b.registered_at DESC";
    } else {
      // registered
      orderBy = "b.registered_at DESC";
    }

    if (author) {
      params.push(`%${author}%`);
      where.push(`COALESCE(b.author_display, b.author) ILIKE $${params.length}`);
    }
    if (title) {
      params.push(`%${title}%`);
      where.push(`COALESCE(b.full_title, b.title_keyword) ILIKE $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      where.push(
        `(
          COALESCE(b.full_title, b.title_keyword) ILIKE ${p} OR
          COALESCE(b.author_display, b.author) ILIKE ${p} OR
          b.publisher ILIKE ${p} OR
          b.title_keyword ILIKE ${p} OR
          b.title_keyword2 ILIKE ${p} OR
          b.title_keyword3 ILIKE ${p} OR
          b.isbn10 ILIKE ${p} OR
          b.isbn13 ILIKE ${p} OR
          bb.barcode ILIKE ${p}
        )`
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `
      SELECT
        b.id,
        COALESCE(b.author_display, b.author) AS author,
        COALESCE(b.full_title, b.title_keyword) AS title,
        b.registered_at,
        b.reading_status,
        b.reading_status_updated_at,
        b.top_book,
        b.top_book_set_at,
        bb.barcode
      FROM public.books b
      LEFT JOIN LATERAL (
        SELECT barcode FROM public.book_barcodes bb WHERE bb.book_id = b.id LIMIT 1
      ) bb ON true
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1}
      `,
      [...params, limit]
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /api/public/books error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/public/books/stats?year=2026
 * Returns: { in_stock, instock, finished, abandoned, top }
 *
 * - in_stock: number of distinct books with an active assignment (freed_at IS NULL)
 * - finished: counts finished books by LAST freed_at event in the requested year
 *   (stable vs. reading_status_updated_at being touched by imports/sync)
 */
router.get("/stats", async (req, res) => {
  try {
    const pool = getPool(req);
    const year = clampInt(req.query.year, new Date().getFullYear(), 1970, 2100);

    const start = `${year}-01-01`;
    const end = `${year + 1}-01-01`;

    const { rows } = await pool.query(
      `
      WITH last_free AS (
        SELECT DISTINCT ON (ba.book_id)
          ba.book_id,
          ba.freed_at
        FROM public.barcode_assignments ba
        WHERE ba.freed_at IS NOT NULL
        ORDER BY ba.book_id, ba.freed_at DESC
      )
      SELECT
        (SELECT COUNT(DISTINCT ba2.book_id)::int
         FROM public.barcode_assignments ba2
         WHERE ba2.freed_at IS NULL
        ) AS in_stock,

        (SELECT COUNT(*)::int
         FROM last_free lf
         JOIN public.books b2 ON b2.id = lf.book_id
         WHERE b2.reading_status = 'finished'
           AND lf.freed_at >= $1::timestamptz
           AND lf.freed_at <  $2::timestamptz
        ) AS finished,

        count(*) FILTER (
          WHERE b.reading_status = 'abandoned'
            AND b.reading_status_updated_at >= $1::timestamptz
            AND b.reading_status_updated_at <  $2::timestamptz
        )::int AS abandoned,

        count(*) FILTER (
          WHERE b.top_book = true
            AND b.top_book_set_at >= $1::timestamptz
            AND b.top_book_set_at <  $2::timestamptz
        )::int AS top
      FROM public.books b
      `,
      [start, end]
    );

    const out = rows[0] || { in_stock: 0, finished: 0, abandoned: 0, top: 0 };
    out.instock = out.in_stock; // keep frontend compatibility
    return res.json(out);
  } catch (err) {
    console.error("GET /api/public/books/stats error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/public/books/author-counts
 * Query:
 *  - bucket: top|finished|abandoned|registered (default finished)
 *  - author: substring filter (optional)
 *  - limit: max number of authors to return (default 50, max 500)
 *
 * Returns: [{ author: string, count: number }]
 * Sorted by count desc.
 */
router.get("/author-counts", async (req, res) => {
  try {
    const pool = getPool(req);

    const bucket = String(req.query.bucket || "finished").toLowerCase();
    const limit = clampInt(req.query.limit, 50, 1, 500);
    const author = normStr(req.query.author);

    const where = [];
    const params = [];

    if (bucket === "top") {
      where.push("b.top_book = true");
    } else if (bucket === "abandoned") {
      where.push("b.reading_status = 'abandoned'");
    } else if (bucket === "registered") {
      // no filter
    } else {
      where.push("b.reading_status = 'finished'");
    }

    if (author) {
      params.push(`%${author}%`);
      where.push(`COALESCE(b.author_display, b.author) ILIKE $${params.length}`);
    }

    where.push("COALESCE(b.author_display, b.author) IS NOT NULL");
    where.push("BTRIM(COALESCE(b.author_display, b.author)) <> ''");

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `
      SELECT
        COALESCE(b.author_display, b.author) AS author,
        COUNT(*)::int AS count
      FROM public.books b
      ${whereSql}
      GROUP BY 1
      ORDER BY count DESC, author ASC
      LIMIT $${params.length + 1}
      `,
      [...params, limit]
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /api/public/books/author-counts error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/public/books/stock-authors?limit=80
 * Returns: [{ author, count }]
 * "in stock" = active assignment (freed_at IS NULL)
 */
router.get("/stock-authors", async (req, res) => {
  try {
    const pool = getPool(req);
    const limit = clampInt(req.query.limit, 80, 1, 200);

    const { rows } = await pool.query(
      `
      SELECT
        COALESCE(b.author_display, b.author) AS author,
        COUNT(DISTINCT ba.book_id)::int AS count
      FROM public.barcode_assignments ba
      JOIN public.books b ON b.id = ba.book_id
      WHERE ba.freed_at IS NULL
        AND COALESCE(b.author_display, b.author) IS NOT NULL
        AND BTRIM(COALESCE(b.author_display, b.author)) <> ''
      GROUP BY 1
      ORDER BY count DESC, author ASC
      LIMIT $1
      `,
      [limit]
    );

    return res.json(rows);
  } catch (err) {
    console.error("GET /api/public/books/stock-authors error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/public/books/most-read-authors
 * Query:
 *  - limit (default 50, max 500)
 *
 * Returns rows like:
 *  { author, books_read, booksRead, books_in_stock, booksInStock, count }
 */
router.get("/most-read-authors", async (req, res) => {
  try {
    const pool = getPool(req);
    const limit = clampInt(req.query.limit, 50, 1, 500);

    const sql = [
      "SELECT",
      "  COALESCE(b.author_display, b.author) AS author,",
      "  COUNT(*) FILTER (WHERE b.reading_status = 'finished')::int AS books_read,",
      "  COUNT(*)::int AS books_in_stock",
      "FROM public.books b",
      "WHERE COALESCE(b.author_display, b.author) IS NOT NULL",
      "  AND BTRIM(COALESCE(b.author_display, b.author)) <> ''",
      "GROUP BY 1",
      "HAVING COUNT(*) FILTER (WHERE b.reading_status = 'finished') > 0",
      "ORDER BY books_read DESC, books_in_stock DESC, author ASC",
      "LIMIT $1",
    ].join("\n");

    const { rows } = await pool.query(sql, [limit]);

    return res.json(
      (rows || []).map((r) => ({
        author: r.author,
        books_read: r.books_read,
        booksRead: r.books_read,
        books_in_stock: r.books_in_stock,
        booksInStock: r.books_in_stock,
        count: r.books_read,
      }))
    );
  } catch (err) {
    console.error("GET /api/public/books/most-read-authors error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/public/books/:id  (single book)
 * IMPORTANT: compare id as text so UUID/int both work.
 */
router.get("/:id", async (req, res) => {
  try {
    const pool = getPool(req);
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "missing_id" });

    const { rows } = await pool.query(
      `
      SELECT
        b.id::text AS id,
        COALESCE(b.author_display, b.author) AS author,
        COALESCE(b.full_title, b.title_keyword) AS title,
        b.publisher,
        b.pages,
        b,comment,
        b.reading_status,
        b.reading_status_updated_at,
        b.top_book,
        b.top_book_set_at,
        b.registered_at,
        bb.barcode
      FROM public.books b
      LEFT JOIN LATERAL (
        SELECT barcode
        FROM public.book_barcodes bb
        WHERE bb.book_id = b.id
        LIMIT 1
      ) bb ON true
      WHERE b.id::text = $1
      LIMIT 1
      `,
      [id]
    );

    if (!rows[0]) return res.status(404).json({ error: "not_found" });
    return res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/public/books/:id error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
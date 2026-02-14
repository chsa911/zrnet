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

// single sources of truth for public display
const AUTHOR_EXPR = "a.name_display";
const TITLE_EXPR = "COALESCE(NULLIF(b.title_display,''), NULLIF(b.title_keyword,''))";

/**
 * GET /api/public/books
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
    }

    if (author) {
      params.push(`%${author}%`);
      where.push(`${AUTHOR_EXPR} ILIKE $${params.length}`);
    }
    if (title) {
      params.push(`%${title}%`);
      where.push(`${TITLE_EXPR} ILIKE $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      where.push(
        `(
          ${TITLE_EXPR} ILIKE ${p} OR
          ${AUTHOR_EXPR} ILIKE ${p} OR
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
        b.id::text AS id,
        ${AUTHOR_EXPR} AS author_name_display,
        ${TITLE_EXPR}  AS book_title_display,
        b.registered_at,
        b.reading_status,
        b.reading_status_updated_at,
        b.top_book,
        b.top_book_set_at,
        bb.barcode
      FROM public.books b
      LEFT JOIN public.authors a ON a.id = b.author_id
      LEFT JOIN LATERAL (
        SELECT barcode FROM public.book_barcodes bb WHERE bb.book_id = b.id LIMIT 1
      ) bb ON true
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1}
      `,
      [...params, limit]
    );

    return res.json(
      (rows || []).map((r) => ({
        id: r.id,

        // new names
        authorNameDisplay: r.author_name_display || "",
        bookTitleDisplay: r.book_title_display || "",

        // legacy names (keep for now)
        author: r.author_name_display || "",
        title: r.book_title_display || "",

        registered_at: r.registered_at,
        reading_status: r.reading_status,
        reading_status_updated_at: r.reading_status_updated_at,
        top_book: r.top_book,
        top_book_set_at: r.top_book_set_at,
        barcode: r.barcode,
      }))
    );
  } catch (err) {
    console.error("GET /api/public/books error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/public/books/stats?year=2026
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
    out.instock = out.in_stock; // compatibility
    return res.json(out);
  } catch (err) {
    console.error("GET /api/public/books/stats error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/public/books/author-counts
 */
router.get("/author-counts", async (req, res) => {
  try {
    const pool = getPool(req);

    const bucket = String(req.query.bucket || "finished").toLowerCase();
    const limit = clampInt(req.query.limit, 50, 1, 500);
    const author = normStr(req.query.author);

    const where = [];
    const params = [];

    if (bucket === "top") where.push("b.top_book = true");
    else if (bucket === "abandoned") where.push("b.reading_status = 'abandoned'");
    else if (bucket === "registered") {
      // no filter
    } else where.push("b.reading_status = 'finished'");

    if (author) {
      params.push(`%${author}%`);
      where.push(`${AUTHOR_EXPR} ILIKE $${params.length}`);
    }

    where.push(`${AUTHOR_EXPR} IS NOT NULL`);
    where.push(`BTRIM(${AUTHOR_EXPR}) <> ''`);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `
      SELECT
        ${AUTHOR_EXPR} AS author,
        COUNT(*)::int AS count
      FROM public.books b
      LEFT JOIN public.authors a ON a.id = b.author_id
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
 */
router.get("/stock-authors", async (req, res) => {
  try {
    const pool = getPool(req);
    const limit = clampInt(req.query.limit, 80, 1, 200);

    const { rows } = await pool.query(
      `
      SELECT
        ${AUTHOR_EXPR} AS author,
        COUNT(DISTINCT ba.book_id)::int AS count
      FROM public.barcode_assignments ba
      JOIN public.books b ON b.id = ba.book_id
      LEFT JOIN public.authors a ON a.id = b.author_id
      WHERE ba.freed_at IS NULL
        AND ${AUTHOR_EXPR} IS NOT NULL
        AND BTRIM(${AUTHOR_EXPR}) <> ''
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
 */
router.get("/most-read-authors", async (req, res) => {
  try {
    const pool = getPool(req);
    const limit = clampInt(req.query.limit, 50, 1, 500);

    const { rows } = await pool.query(
      `
      SELECT
        ${AUTHOR_EXPR} AS author,
        COUNT(*) FILTER (WHERE b.reading_status = 'finished')::int AS books_read,
        COUNT(*)::int AS books_in_stock
      FROM public.books b
      LEFT JOIN public.authors a ON a.id = b.author_id
      WHERE ${AUTHOR_EXPR} IS NOT NULL
        AND BTRIM(${AUTHOR_EXPR}) <> ''
      GROUP BY 1
      HAVING COUNT(*) FILTER (WHERE b.reading_status = 'finished') > 0
      ORDER BY books_read DESC, books_in_stock DESC, author ASC
      LIMIT $1
      `,
      [limit]
    );

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
 * GET /api/public/books/:id
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
        ${AUTHOR_EXPR} AS author_name_display,
        ${TITLE_EXPR}  AS book_title_display,
        b.publisher,
        b.pages,
        b.comment,  
        b.purchase_url,
        b.reading_status,
        b.reading_status_updated_at,
        b.top_book,
        b.top_book_set_at,
        b.registered_at,
        bb.barcode
      FROM public.books b
      LEFT JOIN public.authors a ON a.id = b.author_id
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

    const r = rows[0];
    return res.json({
      id: r.id,

      // new names
      authorNameDisplay: r.author_name_display || "",
      bookTitleDisplay: r.book_title_display || "",

      // legacy names (keep for now)
      author: r.author_name_display || "",
      title: r.book_title_display || "",

      publisher: r.publisher,
      pages: r.pages,
      comment: r.comment,
      purchase_url: r.purchase_url,
      reading_status: r.reading_status,
      reading_status_updated_at: r.reading_status_updated_at,
      top_book: r.top_book,
      top_book_set_at: r.top_book_set_at,
      registered_at: r.registered_at,
      barcode: r.barcode,
    });
  } catch (err) {
    console.error("GET /api/public/books/:id error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
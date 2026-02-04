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

function yearRange(year) {
  const y = clampInt(year, new Date().getFullYear(), 1970, 2100);
  return {
    year: y,
    start: `${y}-01-01`,
    end: `${y + 1}-01-01`,
  };
}

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
    const meta = String(req.query.meta || "").trim() === "1";

    // pagination: either offset directly or (page-1)*limit
    const page = clampInt(req.query.page, 1, 1, 100000);
    const offsetRaw = req.query.offset;
    const offset = offsetRaw != null ? clampInt(offsetRaw, 0, 0, 200000) : (page - 1) * limit;

    // year filter (makes list match the header counts)
    const yearQ = normStr(req.query.year);
    const yr = yearQ ? yearRange(yearQ) : null;

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

      if (yr) {
        params.push(yr.start, yr.end);
        where.push(`b.top_book_set_at >= $${params.length - 1}::timestamptz`);
        where.push(`b.top_book_set_at <  $${params.length}::timestamptz`);
      }
    } else if (bucket === "finished") {
      where.push("b.reading_status = 'finished'");
      orderBy = "b.reading_status_updated_at DESC NULLS LAST, b.registered_at DESC";

      if (yr) {
        params.push(yr.start, yr.end);
        where.push(`b.reading_status_updated_at >= $${params.length - 1}::timestamptz`);
        where.push(`b.reading_status_updated_at <  $${params.length}::timestamptz`);
      }
    } else if (bucket === "abandoned") {
      where.push("b.reading_status = 'abandoned'");
      orderBy = "b.reading_status_updated_at DESC NULLS LAST, b.registered_at DESC";

      if (yr) {
        params.push(yr.start, yr.end);
        where.push(`b.reading_status_updated_at >= $${params.length - 1}::timestamptz`);
        where.push(`b.reading_status_updated_at <  $${params.length}::timestamptz`);
      }
    } else {
      // registered
      orderBy = "b.registered_at DESC";

      if (yr) {
        params.push(yr.start, yr.end);
        where.push(`b.registered_at >= $${params.length - 1}::timestamptz`);
        where.push(`b.registered_at <  $${params.length}::timestamptz`);
      }
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

    const listSql =
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
      OFFSET $${params.length + 2}
      `;

    const { rows } = await pool.query(listSql, [...params, limit, offset]);

    if (!meta) return res.json(rows);

    // total count for pagination UI
    const countSql =
      `
      SELECT count(*)::int AS total
      FROM public.books b
      LEFT JOIN LATERAL (
        SELECT barcode FROM public.book_barcodes bb WHERE bb.book_id = b.id LIMIT 1
      ) bb ON true
      ${whereSql}
      `;
    const totalRes = await pool.query(countSql, params);
    const total = totalRes.rows?.[0]?.total ?? 0;

    return res.json({
      bucket,
      year: yr?.year ?? null,
      limit,
      offset,
      total,
      items: rows,
    });
  } catch (err) {
    console.error("GET /api/public/books error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/public/books/stats?year=2026
 * Returns: { finished, abandoned, top }
 */
router.get("/stats", async (req, res) => {
  try {
    const pool = getPool(req);
    const year = clampInt(req.query.year, new Date().getFullYear(), 1970, 2100);

    const start = `${year}-01-01`;
    const end = `${year + 1}-01-01`;

    const { rows } = await pool.query(
      `
      SELECT
        /* "Im Bestand" / stock: books registered in the given year */
        count(*) FILTER (
          WHERE b.registered_at >= $1::timestamptz
            AND b.registered_at <  $2::timestamptz
        )::int AS registered,

        /* books that have at least one barcode (kept for backward compatibility with older UIs) */
        count(*) FILTER (
          WHERE b.registered_at >= $1::timestamptz
            AND b.registered_at <  $2::timestamptz
            AND EXISTS (
              SELECT 1 FROM public.book_barcodes bb WHERE bb.book_id = b.id
            )
        )::int AS books_with_barcode,

        count(*) FILTER (
          WHERE b.reading_status = 'finished'
            AND b.reading_status_updated_at >= $1::timestamptz
            AND b.reading_status_updated_at <  $2::timestamptz
        )::int AS finished,

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

    const row = rows[0] || { registered: 0, books_with_barcode: 0, finished: 0, abandoned: 0, top: 0 };

    // Return a couple of aliases so different frontends can "pick" whatever they expect.
    return res.json({
      year,
      registered: row.registered,
      books_with_barcode: row.books_with_barcode,
      in_stock: row.books_with_barcode,
      instock: row.books_with_barcode,
      finished: row.finished,
      abandoned: row.abandoned,
      top: row.top,
    });
  } catch (err) {
    console.error("GET /api/public/books/stats error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;

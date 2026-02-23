// backend/routes/publicBooks.js
// Read-only endpoints used by the public site (/site and /site/books).

const express = require("express");
const router = express.Router();
const crypto = require("crypto");

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

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "")
  );
}

const normKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

async function resolveAuthorByKey(pool, key) {
  const k = normStr(key);
  if (!k) return null;

  // UUID is already an author id.
  if (isUuid(k)) {
    const { rows } = await pool.query(
      `
      SELECT id::text AS id, name_display, abbreviation, published_titles
      FROM public.authors
      WHERE id = $1::uuid
      LIMIT 1
      `,
      [k]
    );
    return rows?.[0] || { id: k };
  }

  const kNorm = normKey(k);

  // Try exact matches first (abbr / display / name). Fallback stays in handler.
  const { rows } = await pool.query(
    `
    SELECT id::text AS id, name_display, abbreviation, published_titles
    FROM public.authors
    WHERE
      LOWER(abbreviation) = LOWER($1)
      OR regexp_replace(lower(abbreviation), '[^a-z0-9]+', '', 'g') = $2
      OR LOWER(name_display) = LOWER($1)
      OR LOWER(name) = LOWER($1)
      OR LOWER(full_name) = LOWER($1)
    ORDER BY
      CASE
        WHEN LOWER(abbreviation) = LOWER($1) THEN 0
        WHEN regexp_replace(lower(abbreviation), '[^a-z0-9]+', '', 'g') = $2 THEN 1
        WHEN LOWER(name_display) = LOWER($1) THEN 2
        WHEN LOWER(name) = LOWER($1) THEN 3
        WHEN LOWER(full_name) = LOWER($1) THEN 4
        ELSE 9
      END,
      name_display ASC
    LIMIT 1
    `,
    [k, kNorm]
  );

  return rows?.[0] || null;
}

function getClientIp(req) {
  const xf = String(req.headers["x-forwarded-for"] || "");
  if (xf) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress || "";
}

function hashIp(ip) {
  const salt = String(process.env.IP_HASH_SALT || "zr");
  const raw = `${salt}:${String(ip || "")}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function countLinks(text) {
  const m = String(text || "").match(/https?:\/\/\S+/gi);
  return m ? m.length : 0;
}

// single sources of truth for public display
const AUTHOR_EXPR = "a.name_display";
const TITLE_EXPR = "COALESCE(NULLIF(b.title_display,''), NULLIF(b.title_keyword,''))";
const PUBLISHER_EXPR = "COALESCE(p.name, b.publisher)";


// purchase providers (optional) — compute best link from isbn + templates
function applyTemplate(tpl, { isbn13, isbn10, bookId }) {
  let url = String(tpl || "");
  url = url.replace(/\{isbn13\}/g, isbn13 || "");
  url = url.replace(/\{isbn10\}/g, isbn10 || "");
  url = url.replace(/\{isbn\}/g, isbn13 || isbn10 || "");
  url = url.replace(/\{book_id\}/g, bookId || "");
  return url;
}

async function buildPurchaseLinks(pool, { isbn13, isbn10, bookId }) {
  const isbnAny = (isbn13 || isbn10 || "").trim();
  if (!isbnAny) return { best: null, candidates: [] };

  const { rows } = await pool.query(
    `
    SELECT id, code, name, url_template, priority
    FROM public.purchase_providers
    WHERE is_active=true AND kind='buy'
    ORDER BY priority ASC, id ASC
    `
  );

  const candidates = (rows || [])
    .map((p) => {
      const url = applyTemplate(p.url_template, { isbn13, isbn10, bookId });
      return {
        provider_id: p.id,
        provider_code: p.code,
        provider_name: p.name,
        priority: p.priority,
        url,
      };
    })
    // skip broken templates (still contains placeholders) or empty urls
    .filter((c) => c.url && !c.url.includes("{isbn") && !c.url.includes("{book_"));

  return { best: candidates[0] || null, candidates };
}

/**
 * GET /api/public/books
 */
router.get("/", async (req, res) => {
  try {
    const pool = getPool(req);

    const bucket = String(req.query.bucket || "registered").toLowerCase();
    const limit = clampInt(req.query.limit, 50, 1, 2000);
    const offset = clampInt(req.query.offset, 0, 0, 1_000_000);
    const yearRaw = normStr(req.query.year);
    const year = yearRaw ? clampInt(yearRaw, new Date().getFullYear(), 1970, 2100) : null;

    const author = normStr(req.query.author);
    const title = normStr(req.query.title);
    const q = normStr(req.query.q);

    const where = [];
    const params = [];

    // Join for open barcode assignment (physical on-shelf)
    const fromSql = `
      FROM public.books b
      LEFT JOIN public.authors a ON a.id = b.author_id
      LEFT JOIN public.publishers p ON p.id = b.publisher_id
      LEFT JOIN LATERAL (
        SELECT barcode
        FROM public.book_barcodes bb
        WHERE bb.book_id = b.id
        LIMIT 1
      ) bb ON true
      LEFT JOIN LATERAL (
        SELECT barcode, assigned_at
        FROM public.barcode_assignments ba
        WHERE ba.book_id = b.id
          AND ba.freed_at IS NULL
        ORDER BY ba.assigned_at DESC
        LIMIT 1
      ) open_ba ON true
    `;

    // Bucket filters + ordering
    let orderBy = "b.registered_at DESC NULLS LAST, b.id ASC";
    if (bucket === "top") {
      where.push("b.top_book = true");
      orderBy = "b.top_book_set_at DESC NULLS LAST, b.registered_at DESC NULLS LAST, b.id ASC";
      if (year) {
        params.push(`${year}-01-01`);
        params.push(`${year + 1}-01-01`);
        where.push(`b.top_book_set_at >= $${params.length - 1}::timestamptz AND b.top_book_set_at < $${params.length}::timestamptz`);
      }
    } else if (bucket === "finished") {
      where.push("b.reading_status = 'finished'");
      orderBy = "b.reading_status_updated_at DESC NULLS LAST, b.registered_at DESC NULLS LAST, b.id ASC";
      if (year) {
        params.push(`${year}-01-01`);
        params.push(`${year + 1}-01-01`);
        where.push(`b.reading_status_updated_at >= $${params.length - 1}::timestamptz AND b.reading_status_updated_at < $${params.length}::timestamptz`);
      }
    } else if (bucket === "abandoned") {
      where.push("b.reading_status = 'abandoned'");
      orderBy = "b.reading_status_updated_at DESC NULLS LAST, b.registered_at DESC NULLS LAST, b.id ASC";
      if (year) {
        params.push(`${year}-01-01`);
        params.push(`${year + 1}-01-01`);
        where.push(`b.reading_status_updated_at >= $${params.length - 1}::timestamptz AND b.reading_status_updated_at < $${params.length}::timestamptz`);
      }
    } else if (bucket === "stock" || bucket === "in_stock") {
      // “Stock” on the public stats pages = physically on shelf
      where.push("open_ba.barcode IS NOT NULL");
      orderBy = "open_ba.assigned_at DESC NULLS LAST, b.registered_at DESC NULLS LAST, b.id ASC";
    }

    // Author filter:
    // - allow UUID (author_id) from AuthorPage
    // - allow abbreviations (e.g. "Mann.")
    // - fallback to fuzzy substring match
    if (author) {
      const resolved = await resolveAuthorByKey(pool, author);
      if (resolved?.id && isUuid(resolved.id)) {
        params.push(resolved.id);
        const p = `$${params.length}`;
        where.push(
          `(
            b.author_id = ${p}::uuid
            OR EXISTS (
              SELECT 1 FROM public.book_authors ba
              WHERE ba.book_id = b.id AND ba.author_id = ${p}::uuid
            )
          )`
        );
      } else {
        params.push(`%${author}%`);
        const p = `$${params.length}`;
        where.push(
          `(
            ${AUTHOR_EXPR} ILIKE ${p}
            OR a.name ILIKE ${p}
            OR a.full_name ILIKE ${p}
            OR a.abbreviation ILIKE ${p}
            OR b.author_display ILIKE ${p}
            OR b.author ILIKE ${p}
          )`
        );
      }
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
          a.abbreviation ILIKE ${p} OR
          ${PUBLISHER_EXPR} ILIKE ${p} OR
          b.title_keyword ILIKE ${p} OR
          b.title_keyword2 ILIKE ${p} OR
          b.title_keyword3 ILIKE ${p} OR
          b.isbn10 ILIKE ${p} OR
          b.isbn13 ILIKE ${p} OR
          COALESCE(open_ba.barcode, bb.barcode) ILIKE ${p}
        )`
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // total count (for pagination)
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total ${fromSql} ${whereSql}`,
      params
    );
    const total = countRows?.[0]?.total ?? 0;

    const dataParams = [...params, limit, offset];
    const limP = `$${params.length + 1}`;
    const offP = `$${params.length + 2}`;

    const { rows } = await pool.query(
      `
      SELECT
        b.id::text AS id,
        a.id::text AS author_id,
        ${AUTHOR_EXPR} AS author_name_display,
        ${TITLE_EXPR}  AS book_title_display,
        b.registered_at,
        b.reading_status,
        b.reading_status_updated_at,
        b.top_book,
        b.top_book_set_at,
        b.purchase_url,
        b.purchase_source,
        a.published_titles,
        COALESCE(open_ba.barcode, bb.barcode) AS barcode,
        (open_ba.barcode IS NOT NULL) AS is_in_stock,
        ('/assets/covers/' || b.id::text || '.jpg') AS cover
      ${fromSql}
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT ${limP}
      OFFSET ${offP}
      `,
      dataParams
    );

    const items = (rows || []).map((r) => ({
      id: r.id,
      author_id: r.author_id || null,
      authorId: r.author_id || null,

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

      purchase_url: r.purchase_url || null,
      purchase_source: r.purchase_source || null,

      barcode: r.barcode || null,
      is_in_stock: !!r.is_in_stock,
      isInStock: !!r.is_in_stock,

      published_titles: r.published_titles ?? null,
      publishedTitles: r.published_titles ?? null,

      cover: r.cover,
    }));

    // Backwards compatibility:
    // If meta=1 (frontend default) or offset is provided, return {items,total}.
    // Otherwise, keep returning a bare array.
    const wantsMeta = String(req.query.meta || "").trim() === "1" || offset > 0;
    return wantsMeta ? res.json({ items, total, limit, offset }) : res.json(items);
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

    // NOTE:
    // - If an author has > 10 titles in the DB, return the top 3 titles.
    // - If an author has <= 10 titles, return 1 favorite title.
    // Favorite/top ordering preference matches /api/public/authors/top-books.
    const { rows } = await pool.query(
      `
      WITH author_books AS (
        -- Primary author
        SELECT
          a.id AS author_id,
          a.name_display AS author,
          b.id AS book_id,
          b.reading_status
        FROM public.books b
        JOIN public.authors a ON a.id = b.author_id

        UNION

        -- Co-authors (if present)
        SELECT
          a.id AS author_id,
          a.name_display AS author,
          ba.book_id AS book_id,
          b.reading_status
        FROM public.book_authors ba
        JOIN public.authors a ON a.id = ba.author_id
        JOIN public.books b ON b.id = ba.book_id
      ),
      author_stats AS (
        SELECT
          author_id,
          author,
          COUNT(DISTINCT book_id) FILTER (WHERE reading_status = 'finished')::int AS books_read,
          COUNT(DISTINCT book_id)::int AS books_total
        FROM author_books
        WHERE author IS NOT NULL
          AND BTRIM(author) <> ''
        GROUP BY author_id, author
        HAVING COUNT(DISTINCT book_id) FILTER (WHERE reading_status = 'finished') > 0
      ),
      ranked_books AS (
        SELECT
          s.author_id,
          b.id::text AS book_id,
          ${TITLE_EXPR} AS title_display,
          b.purchase_url,
          ROW_NUMBER() OVER (
            PARTITION BY s.author_id
            ORDER BY
              -- Admin-controlled featured slots (preferred)
              CASE
                WHEN s.books_total > 10 THEN
                  CASE WHEN b.featured_rank BETWEEN 1 AND 3 THEN 0 ELSE 1 END
                ELSE
                  -- for authors with <= 10 titles we only want #1; demote #2/#3
                  CASE
                    WHEN b.featured_rank = 1 THEN 0
                    WHEN b.featured_rank IS NULL THEN 1
                    ELSE 2
                  END
              END,
              b.featured_rank ASC NULLS LAST,
              b.top_book DESC,
              b.top_book_set_at DESC NULLS LAST,
              (b.reading_status = 'finished') DESC,
              b.reading_status_updated_at DESC NULLS LAST,
              b.registered_at DESC NULLS LAST,
              b.id ASC
          ) AS rn
        FROM author_stats s
        JOIN author_books ab ON ab.author_id = s.author_id
        JOIN public.books b ON b.id = ab.book_id
      )
      SELECT
        s.author,
        s.books_read,
        s.books_total,
        CASE
          WHEN s.books_total > 10 THEN
            COALESCE(
              ARRAY_AGG(r.title_display ORDER BY r.rn)
                FILTER (
                  WHERE r.rn <= 3
                    AND r.title_display IS NOT NULL
                    AND BTRIM(r.title_display) <> ''
                ),
              '{}'::text[]
            )
          ELSE
            COALESCE(
              ARRAY_AGG(r.title_display ORDER BY r.rn)
                FILTER (
                  WHERE r.rn <= 1
                    AND r.title_display IS NOT NULL
                    AND BTRIM(r.title_display) <> ''
                ),
              '{}'::text[]
            )
        END AS featured_titles,
        CASE
          WHEN s.books_total > 10 THEN
            COALESCE(ARRAY_AGG(r.book_id ORDER BY r.rn) FILTER (WHERE r.rn <= 3), '{}'::text[])
          ELSE
            COALESCE(ARRAY_AGG(r.book_id ORDER BY r.rn) FILTER (WHERE r.rn <= 1), '{}'::text[])
        END AS featured_book_ids,
        CASE
          WHEN s.books_total > 10 THEN
            COALESCE(ARRAY_AGG(r.purchase_url ORDER BY r.rn) FILTER (WHERE r.rn <= 3), '{}'::text[])
          ELSE
            COALESCE(ARRAY_AGG(r.purchase_url ORDER BY r.rn) FILTER (WHERE r.rn <= 1), '{}'::text[])
        END AS featured_purchase_urls
      FROM author_stats s
      LEFT JOIN ranked_books r ON r.author_id = s.author_id
      GROUP BY s.author, s.books_read, s.books_total
      ORDER BY s.books_read DESC, s.books_total DESC, s.author ASC
      LIMIT $1
      `,
      [limit]
    );

    return res.json(
      (rows || []).map((r) => {
        const titles = Array.isArray(r.featured_titles)
          ? r.featured_titles.filter((x) => x && String(x).trim())
          : [];
        const best = titles[0] || null;

        return {
          author: r.author,
          books_read: r.books_read,
          booksRead: r.books_read,

          // keep legacy naming used in UI (this is total titles in DB for that author)
          books_in_stock: r.books_total,
          booksInStock: r.books_total,

          // backward compat
          best_title: best,
          bestTitle: best,

          // new fields
          titles,
          featured_titles: titles,
          featuredTitles: titles,
          featured_book_ids: r.featured_book_ids || [],
          featuredBookIds: r.featured_book_ids || [],
          featured_purchase_urls: r.featured_purchase_urls || [],
          featuredPurchaseUrls: r.featured_purchase_urls || [],

          // legacy
          count: r.books_read,
        };
      })
    );
  } catch (err) {
    console.error("GET /api/public/books/most-read-authors error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/public/books/:id/comments
 * Public: only approved comments.
 */
router.get("/:id/comments", async (req, res) => {
  try {
    const pool = getPool(req);
    const bookId = String(req.params.id || "").trim();
    if (!isUuid(bookId)) return res.status(400).json({ error: "invalid_book_id" });

    const limit = clampInt(req.query.limit, 200, 1, 500);

    const { rows } = await pool.query(
      `
      SELECT
        id::text AS id,
        book_id::text AS book_id,
        parent_id::text AS parent_id,
        COALESCE(NULLIF(author_name,''), 'Guest') AS author_name,
        body,
        created_at
      FROM public.book_comments
      WHERE book_id = $1::uuid
        AND status = 'approved'
      ORDER BY created_at ASC
      LIMIT $2
      `,
      [bookId, limit]
    );

    return res.json({ items: rows || [] });
  } catch (err) {
    // If table doesn't exist yet, fail gracefully for public pages.
    if (String(err?.message || "").toLowerCase().includes("book_comments")) {
      return res.json({ items: [] });
    }
    console.error("GET /api/public/books/:id/comments error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * POST /api/public/books/:id/comments
 * Guest: creates a pending comment (moderation recommended).
 * Basic anti-spam:
 *  - honeypot field "website" (must be empty)
 *  - link limit
 *  - rate limiting by ip_hash (DB-based)
 */
router.post("/:id/comments", async (req, res) => {
  try {
    const pool = getPool(req);
    const bookId = String(req.params.id || "").trim();
    if (!isUuid(bookId)) return res.status(400).json({ error: "invalid_book_id" });

    const authorName = normStr(req.body?.authorName ?? req.body?.author_name) || "";
    const body = normStr(req.body?.body) || "";
    const parentId = normStr(req.body?.parentId ?? req.body?.parent_id);
    const website = normStr(req.body?.website);

    // Honeypot: bots often fill it
    if (website) return res.json({ ok: true, status: "pending" });

    if (body.length < 3) return res.status(400).json({ error: "comment_too_short" });
    if (body.length > 2000) return res.status(400).json({ error: "comment_too_long" });
    if (authorName.length > 80) return res.status(400).json({ error: "name_too_long" });
    if (parentId && !isUuid(parentId)) return res.status(400).json({ error: "invalid_parent_id" });
    if (countLinks(body) > 2) return res.status(400).json({ error: "too_many_links" });

    // Ensure book exists (avoid comment spam on random uuids)
    const exists = await pool.query(`SELECT 1 FROM public.books WHERE id = $1::uuid LIMIT 1`, [bookId]);
    if (!exists.rows?.[0]) return res.status(404).json({ error: "book_not_found" });

    const ip = getClientIp(req);
    const ipHash = hashIp(ip);
    const ua = normStr(req.headers["user-agent"]) || null;

    // Rate limit: max 5 per 10 min + max 1 per 30 sec
    try {
      const recent10 = await pool.query(
        `
        SELECT count(*)::int AS c
        FROM public.book_comments
        WHERE ip_hash = $1
          AND created_at > (now() - interval '10 minutes')
        `,
        [ipHash]
      );
      if ((recent10.rows?.[0]?.c ?? 0) >= 5) {
        return res.status(429).json({ error: "rate_limited" });
      }

      const recent30 = await pool.query(
        `
        SELECT count(*)::int AS c
        FROM public.book_comments
        WHERE ip_hash = $1
          AND created_at > (now() - interval '30 seconds')
        `,
        [ipHash]
      );
      if ((recent30.rows?.[0]?.c ?? 0) >= 1) {
        return res.status(429).json({ error: "rate_limited" });
      }
    } catch (e) {
      // If table doesn't exist yet, we still allow posting to avoid hard failures in dev.
      // (But the INSERT will fail anyway.)
    }

    const id = crypto.randomUUID();

    await pool.query(
      `
      INSERT INTO public.book_comments
        (id, book_id, parent_id, author_name, body, status, ip_hash, user_agent)
      VALUES
        ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'pending', $6, $7)
      `,
      [id, bookId, parentId, authorName || null, body, ipHash, ua]
    );

    return res.status(201).json({ ok: true, status: "pending", id });
  } catch (err) {
    console.error("POST /api/public/books/:id/comments error", err);
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
        b.author_id::text AS author_id,
        ${AUTHOR_EXPR} AS author_name_display,
        ${TITLE_EXPR}  AS book_title_display,
        b.publisher,
        b.pages,
        b.comment,
        b.purchase_source,
        b.purchase_url,
        b.isbn13,
        b.isbn10,
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

    // Purchase link resolution
    // 1) manual link on books.purchase_url
    // 2) otherwise: best provider template (purchase_providers) using isbn
    let purchase = { best: null, candidates: [] };
    try {
      purchase = await buildPurchaseLinks(pool, {
        isbn13: r.isbn13,
        isbn10: r.isbn10,
        bookId: r.id,
      });
    } catch (e) {
      // If purchase_providers doesn't exist / isn't configured, keep it silent for public endpoints
      console.warn('purchase_providers not available or query failed:', e?.message || e);
    }

    const manualUrl = normStr(r.purchase_url) || '';
    const bestUrl = normStr(purchase?.best?.url) || '';
    const finalUrl = manualUrl || bestUrl;

    const bestVendor = purchase?.best?.provider_name || purchase?.best?.provider_code || '';
    const finalVendor = manualUrl ? (normStr(r.purchase_source) || 'manual') : bestVendor;

    return res.json({
      id: r.id,

      // stable ids
      authorId: r.author_id || null,

      // new names
      authorNameDisplay: r.author_name_display || "",
      bookTitleDisplay: r.book_title_display || "",

      // legacy names (keep for now)
      author: r.author_name_display || "",
      title: r.book_title_display || "",

      publisher: r.publisher,
      pages: r.pages,
      comment: r.comment,
      purchase_source: r.purchase_source || null,
      purchase_url: r.purchase_url,
      purchase_url_best: bestUrl || null,
      purchase_vendor_best: bestVendor || null,
      purchase_url_final: finalUrl || null,
      purchase_vendor_final: finalVendor || null,
      purchase_links: (purchase?.candidates || []).map((c) => ({
        code: c.provider_code,
        name: c.provider_name,
        url: c.url,
        priority: c.priority,
      })),
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
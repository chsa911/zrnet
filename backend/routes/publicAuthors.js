// backend/routes/publicAuthors.js
// Public, read-only author endpoints used by the public website.

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

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "")
  );
}

// Prefer display name, else full_name, else name
const AUTHOR_EXPR =
  "COALESCE(NULLIF(a.name_display,''), NULLIF(a.full_name,''), NULLIF(a.name,''))";

// Same, but without table alias (for authors table queries)
const AUTHOR_COL_EXPR =
  "COALESCE(NULLIF(name_display,''), NULLIF(full_name,''), NULLIF(name,''))";

const TITLE_EXPR = "COALESCE(NULLIF(b.title_display,''), NULLIF(b.title_keyword,''))";

/**
 * GET /api/public/authors/overview
 */
router.get("/overview", async (req, res) => {
  try {
    const pool = getPool(req);

    const q = normStr(req.query.q);
    const startsWithRaw = normStr(req.query.startsWith);
    const limit = clampInt(req.query.limit, 5000, 1, 20000);
    const offset = clampInt(req.query.offset, 0, 0, 5_000_000);

    const qLike = q ? `%${q}%` : null;

    let startsWith = null;
    let startsIsDigits = false;
    if (startsWithRaw) {
      const s = startsWithRaw.toUpperCase();
      if (s === "#0-9" || s === "#" || s === "0-9") {
        startsIsDigits = true;
      } else if (/^[A-Z]$/.test(s)) {
        startsWith = s;
      }
    }

    const params = [qLike, limit, offset];
    let startsFilterSql = "";
    if (startsIsDigits) {
      startsFilterSql = `AND (b.last_sort ~ '^[0-9]')`;
    } else if (startsWith) {
      params.push(`${startsWith}%`);
      startsFilterSql = `AND (UPPER(b.last_sort) LIKE $${params.length})`;
    }

    const { rows } = await pool.query(
      `
      WITH authored AS (
        -- Primary author
        SELECT b.id AS book_id, b.author_id, b.reading_status
        FROM public.books b
        WHERE b.author_id IS NOT NULL

        UNION

        -- Co-authors
        SELECT b.id AS book_id, ba.author_id, b.reading_status
        FROM public.book_authors ba
        JOIN public.books b ON b.id = ba.book_id
        WHERE ba.author_id IS NOT NULL
      ),
      ids AS (
        SELECT DISTINCT author_id FROM authored
      ),
      base AS (
        SELECT
          a.id,
          ${AUTHOR_EXPR} AS author_display,
          a.first_name,
          a.last_name,
          a.abbreviation,
          a.author_nationality,
          COALESCE(a.published_titles, 0)::int AS total,

          TRIM(SPLIT_PART(${AUTHOR_EXPR}, ',', 1)) AS left_part,
          NULLIF(TRIM(SPLIT_PART(${AUTHOR_EXPR}, ',', 2)), '') AS right_part,

          COALESCE(
            NULLIF(TRIM(a.last_name), ''),
            CASE
              WHEN ${AUTHOR_EXPR} LIKE '%,%' THEN regexp_replace(TRIM(SPLIT_PART(${AUTHOR_EXPR}, ',', 1)), '^.*\\s', '')
              ELSE NULL
            END,
            regexp_replace(${AUTHOR_EXPR}, '^.*\\s', '')
          ) AS last_sort,

          CASE
            WHEN ${AUTHOR_EXPR} LIKE '%,%' THEN NULLIF(TRIM(regexp_replace(TRIM(SPLIT_PART(${AUTHOR_EXPR}, ',', 1)), '\\s+[^\\s]+$', '')), '')
            ELSE NULL
          END AS name_addition_sort,

          COALESCE(
            NULLIF(TRIM(a.first_name), ''),
            NULLIF(TRIM(SPLIT_PART(${AUTHOR_EXPR}, ',', 2)), ''),
            NULLIF(TRIM(regexp_replace(${AUTHOR_EXPR}, '\\s+[^\\s]+$', '')), '')
          ) AS first_sort,

          CASE
            WHEN a.author_nationality ~ '^[A-Za-z]{2,3}$' THEN UPPER(a.author_nationality)
            ELSE NULL
          END AS nationality_abbr
        FROM public.authors a
        JOIN ids ON ids.author_id = a.id
        WHERE ($1::text IS NULL OR ${AUTHOR_EXPR} ILIKE $1)
      ),
      agg AS (
        SELECT
          b.id::text AS id,
          b.last_sort,
          b.name_addition_sort,
          b.first_sort,
          b.author_display,
          b.nationality_abbr,
          b.author_nationality,
          b.total,

          COUNT(DISTINCT ab.book_id) FILTER (WHERE ab.reading_status <> 'wishlist')::int AS on_hand,
          COUNT(DISTINCT ab.book_id) FILTER (WHERE ab.reading_status = 'finished')::int AS finished,
          COUNT(DISTINCT ab.book_id) FILTER (WHERE ab.reading_status = 'wishlist')::int AS wishlist
        FROM base b
        LEFT JOIN authored ab ON ab.author_id = b.id
        WHERE 1=1
        ${startsFilterSql}
        GROUP BY
          b.id, b.last_sort, b.name_addition_sort, b.first_sort,
          b.author_display, b.nationality_abbr, b.author_nationality, b.total
      )
      SELECT
        id,
        last_sort,
        name_addition_sort,
        first_sort,
        nationality_abbr,
        on_hand,
        finished,
        wishlist,
        total,
        GREATEST(total - on_hand - wishlist, 0)::int AS not_match,
        COUNT(*) OVER()::int AS total_authors
      FROM agg
      ORDER BY
        LOWER(last_sort) ASC,
        LOWER(COALESCE(name_addition_sort, '')) ASC,
        LOWER(COALESCE(first_sort, '')) ASC,
        id ASC
      LIMIT $2 OFFSET $3
      `,
      params
    );

    const total = rows?.[0]?.total_authors ?? 0;

    const items = (rows || []).map((r) => {
      const last = normStr(r.last_sort);
      const add = normStr(r.name_addition_sort);
      const first = normStr(r.first_sort);

      const author = [last, add, first].filter(Boolean).join(" ");

      return {
        id: r.id,

        last,
        name_addition: add,
        first,
        author,

        nationality_abbr: r.nationality_abbr || null,

        on_hand: r.on_hand ?? 0,
        finished: r.finished ?? 0,
        completed: r.finished ?? 0,
        wishlist: r.wishlist ?? 0,

        total: r.total ?? 0,
        not_match: r.not_match ?? 0,

        last_name: last,
        first_name: first,
        name_display: author,
      };
    });

    res.setHeader("Cache-Control", "no-store");
    return res.json({ total, limit, offset, items });
  } catch (err) {
    console.error("GET /api/public/authors/overview error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/public/authors/overview-letters?q=<search>
 */
router.get("/overview-letters", async (req, res) => {
  try {
    const pool = getPool(req);
    const q = normStr(req.query.q);
    const qLike = q ? `%${q}%` : null;

    const { rows } = await pool.query(
      `
      WITH authored AS (
        SELECT b.author_id, b.reading_status
        FROM public.books b
        WHERE b.author_id IS NOT NULL

        UNION

        SELECT ba.author_id, b.reading_status
        FROM public.book_authors ba
        JOIN public.books b ON b.id = ba.book_id
        WHERE ba.author_id IS NOT NULL
      ),
      ids AS (SELECT DISTINCT author_id FROM authored),
      base AS (
        SELECT
          a.id,
          ${AUTHOR_EXPR} AS author_display,
          COALESCE(
            NULLIF(TRIM(a.last_name), ''),
            CASE
              WHEN ${AUTHOR_EXPR} LIKE '%,%' THEN regexp_replace(TRIM(SPLIT_PART(${AUTHOR_EXPR}, ',', 1)), '^.*\\s', '')
              ELSE NULL
            END,
            regexp_replace(${AUTHOR_EXPR}, '^.*\\s', '')
          ) AS last_sort
        FROM public.authors a
        JOIN ids ON ids.author_id = a.id
        WHERE ($1::text IS NULL OR ${AUTHOR_EXPR} ILIKE $1)
      ),
      buckets AS (
        SELECT
          CASE
            WHEN last_sort ~ '^[0-9]' THEN '#0-9'
            ELSE UPPER(SUBSTRING(last_sort FROM 1 FOR 1))
          END AS bucket
        FROM base
      )
      SELECT bucket, COUNT(*)::int AS count
      FROM buckets
      WHERE bucket IS NOT NULL AND bucket <> ''
      GROUP BY bucket
      ORDER BY bucket
      `,
      [qLike]
    );

    res.setHeader("Cache-Control", "no-store");
    return res.json({ items: rows || [] });
  } catch (err) {
    console.error("GET /api/public/authors/overview-letters error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

/**
 * GET /api/public/authors/:id
 */
router.get(
  "/:id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})",
  async (req, res) => {
    try {
      const pool = getPool(req);
      const id = normStr(req.params.id);
      if (!id || !isUuid(id)) {
        return res.status(400).json({ error: "invalid_author_id" });
      }

      const { rows } = await pool.query(
        `
        SELECT
          id::text AS id,
          name,
          name_display,
          full_name,
          first_name,
          last_name,
          birth_date,
          death_date,
          abbreviation,
          published_titles,
          number_of_millionsellers,
          male_female,
          author_nationality,
          place_of_birth
        FROM public.authors
        WHERE id = $1::uuid
        LIMIT 1
        `,
        [id]
      );

      if (!rows?.[0]) return res.status(404).json({ error: "author_not_found" });
      return res.json(rows[0]);
    } catch (err) {
      console.error("GET /api/public/authors/:id error", err);
      return res.status(500).json({ error: "internal_error" });
    }
  }
);

/**
 * GET /api/public/authors/top-books?author=<uuid|name>&limit=3&exclude=<bookId>
 */
router.get("/top-books", async (req, res) => {
  try {
    const pool = getPool(req);

    const authorParam = normStr(req.query.author);
    const limit = clampInt(req.query.limit, 3, 1, 12);
    const exclude = normStr(req.query.exclude);

    if (!authorParam) return res.status(400).json({ error: "missing_author" });

    let authorRow = null;

    if (isUuid(authorParam)) {
      const { rows } = await pool.query(
        `
        SELECT id::text AS id, ${AUTHOR_COL_EXPR} AS name_display
        FROM public.authors
        WHERE id = $1::uuid
        LIMIT 1
        `,
        [authorParam]
      );
      authorRow = rows?.[0] || null;
    } else {
      const q = authorParam;
      const qLike = `%${q}%`;
      const { rows } = await pool.query(
        `
        SELECT id::text AS id, ${AUTHOR_COL_EXPR} AS name_display
        FROM public.authors
        WHERE
          (${AUTHOR_COL_EXPR} ILIKE $2)
          OR (name ILIKE $2)
          OR (full_name ILIKE $2)
          OR (abbreviation ILIKE $2)
        ORDER BY
          CASE
            WHEN LOWER(${AUTHOR_COL_EXPR}) = LOWER($1) THEN 0
            WHEN LOWER(name) = LOWER($1) THEN 1
            WHEN LOWER(full_name) = LOWER($1) THEN 2
            ELSE 3
          END,
          ${AUTHOR_COL_EXPR} ASC NULLS LAST
        LIMIT 1
        `,
        [q, qLike]
      );
      authorRow = rows?.[0] || null;
    }

    if (!authorRow) return res.status(404).json({ error: "author_not_found" });

    const params = [authorRow.id, limit];
    let excludeSql = "";
    if (exclude && isUuid(exclude)) {
      params.push(exclude);
      excludeSql = `AND b.id <> $${params.length}::uuid`;
    }

    const { rows: books } = await pool.query(
      `
      SELECT
        b.id::text AS id,
        ${TITLE_EXPR} AS title_display,
        ${AUTHOR_EXPR} AS author_name_display,
        b.reading_status,
        b.reading_status_updated_at,
        b.featured_rank,
        b.top_book,
        b.top_book_set_at,
        b.registered_at,
        b.purchase_url,
        ('/media/covers/' || b.id::text || '.jpg') AS cover
      FROM public.books b
      LEFT JOIN public.authors a ON a.id = $1::uuid
      WHERE
        (
          b.author_id = $1::uuid
          OR EXISTS (
            SELECT 1
            FROM public.book_authors ba
            WHERE ba.book_id = b.id
              AND ba.author_id = $1::uuid
          )
        )
        ${excludeSql}
      ORDER BY
        CASE WHEN b.featured_rank BETWEEN 1 AND 3 THEN 0 ELSE 1 END,
        b.featured_rank ASC NULLS LAST,
        b.top_book DESC,
        b.top_book_set_at DESC NULLS LAST,
        (b.reading_status = 'finished') DESC,
        b.reading_status_updated_at DESC NULLS LAST,
        b.registered_at DESC NULLS LAST,
        b.id ASC
      LIMIT $2
      `,
      params
    );

    return res.json({
      author: {
        id: authorRow.id,
        nameDisplay: authorRow.name_display || authorParam,
      },
      items: (books || []).map((r) => ({
        id: r.id,
        titleDisplay: r.title_display || "",
        authorNameDisplay: r.author_name_display || "",
        cover: r.cover,
        purchaseUrl: r.purchase_url || null,
        readingStatus: r.reading_status || null,
        readingStatusUpdatedAt: r.reading_status_updated_at || null,
        featuredRank: r.featured_rank ?? null,
        topBook: !!r.top_book,
        topBookSetAt: r.top_book_set_at || null,
        registeredAt: r.registered_at || null,
      })),
    });
  } catch (err) {
    console.error("GET /api/public/authors/top-books error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
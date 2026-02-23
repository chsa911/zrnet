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

// single source of truth for display
const AUTHOR_EXPR = "a.name_display";
// (authors table without alias)
const AUTHOR_COL = "name_display";
const TITLE_EXPR = "COALESCE(NULLIF(b.title_display,''), NULLIF(b.title_keyword,''))";

/**
 * GET /api/public/authors/:id
 * Minimal author lookup used by the public AuthorPage when the URL contains a UUID.
 * Returns snake_case fields matching DB column names.
 */
router.get(
  "/:id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})",
  async (req, res) => {
    try {
      const pool = getPool(req);
      const id = normStr(req.params.id);
      if (!id || !isUuid(id)) return res.status(400).json({ error: "invalid_author_id" });

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
 * Returns the top N books for an author (within your collection).
 * Ordering preference:
 *  1) books marked as top_book
 *  2) newest top_book_set_at
 *  3) finished books before others
 *  4) newest reading_status_updated_at / registered_at
 */
router.get("/top-books", async (req, res) => {
  try {
    const pool = getPool(req);

    const authorParam = normStr(req.query.author);
    const limit = clampInt(req.query.limit, 3, 1, 12);
    const exclude = normStr(req.query.exclude);

    if (!authorParam) return res.status(400).json({ error: "missing_author" });

    // 1) Resolve author (by id or best matching name)
    let authorRow = null;
    if (isUuid(authorParam)) {
      const { rows } = await pool.query(
        `
        SELECT id::text AS id, name_display
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
        SELECT id::text AS id, name_display
        FROM public.authors
        WHERE
          (${AUTHOR_COL} ILIKE $2)
          OR (name ILIKE $2)
          OR (full_name ILIKE $2)
        ORDER BY
          CASE
            WHEN LOWER(${AUTHOR_COL}) = LOWER($1) THEN 0
            WHEN LOWER(name) = LOWER($1) THEN 1
            WHEN LOWER(full_name) = LOWER($1) THEN 2
            ELSE 3
          END,
          name_display ASC
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

    // 2) Fetch top books for that author (supports co-authors via book_authors)
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
        ('/assets/covers/' || b.id::text || '.jpg') AS cover
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

const express = require("express");
const router = express.Router();

const {
  adminAuthRequired,
  adminLogin,
  adminLogout,
} = require("../middleware/adminAuth");
const { registerExistingBook } = require("../controllers/booksPgController");

function getPool(req) {
  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  return pool;
}

function clampInt(v, def, min, max) {
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function normStr(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s || null;
}

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "")
  );
}

const AUTHORED_CTE = `
  WITH authored AS (
    SELECT b.id AS book_id, b.author_id, b.reading_status
    FROM public.books b
    WHERE b.author_id IS NOT NULL

    UNION

    SELECT b.id AS book_id, ba.author_id, b.reading_status
    FROM public.book_authors ba
    JOIN public.books b ON b.id = ba.book_id
    WHERE ba.author_id IS NOT NULL
  )
`;

router.get("/health", (_req, res) => {
  res.json({ ok: true, area: "admin" });
});

router.post("/login", adminLogin);
router.post("/logout", adminLogout);

router.get("/me", adminAuthRequired, (_req, res) => {
  res.json({ ok: true });
});

router.get("/authors/overview", adminAuthRequired, async (req, res) => {
  try {
    const pool = getPool(req);
    const q = normStr(req.query.q);
    const qLike = q ? `%${q}%` : null;

    const { rows } = await pool.query(
      `
      ${AUTHORED_CTE}
      SELECT
        a.id::text AS id,
        a.first_name,
        a.last_name,
        COALESCE(
          NULLIF(a.name_display, ''),
          NULLIF(concat_ws(' ', a.first_name, a.last_name), ''),
          NULLIF(concat_ws(' ', a.last_name, a.first_name), '')
        ) AS name_display,
        COUNT(DISTINCT au.book_id) FILTER (WHERE au.reading_status = 'finished')::int AS completed_books,
        COUNT(DISTINCT au.book_id) FILTER (WHERE au.reading_status = 'abandoned')::int AS not_match_books,
        COUNT(DISTINCT au.book_id) FILTER (WHERE au.reading_status IN ('in_progress', 'in_stock'))::int AS on_hand_books,
        COUNT(DISTINCT au.book_id)::int AS total_books
      FROM public.authors a
      JOIN authored au ON au.author_id = a.id
      WHERE (
        $1::text IS NULL
        OR a.last_name ILIKE $1
        OR a.first_name ILIKE $1
        OR a.name_display ILIKE $1
        OR a.abbreviation ILIKE $1
      )
      GROUP BY a.id, a.first_name, a.last_name, a.name_display
      ORDER BY
        LOWER(COALESCE(NULLIF(a.last_name, ''), NULLIF(a.name_display, ''), '')) ASC,
        LOWER(COALESCE(NULLIF(a.first_name, ''), '')) ASC,
        LOWER(COALESCE(NULLIF(a.name_display, ''), '')) ASC,
        a.id ASC
      `,
      [qLike]
    );

    res.setHeader("Cache-Control", "no-store");
    res.json({ items: rows });
  } catch (err) {
    console.error("GET /api/admin/authors/overview error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/abbreviations", adminAuthRequired, async (req, res) => {
  try {
    const pool = getPool(req);
    const q = normStr(req.query.q);
    const limit = clampInt(req.query.limit, 1000, 1, 5000);
    const qLike = q ? `%${q}%` : null;

    const { rows } = await pool.query(
      `
      ${AUTHORED_CTE}
      SELECT
        a.id::text AS author_id,
        a.first_name AS author_first_name,
        a.last_name AS author_last_name,
        a.first_name,
        a.last_name,
        regexp_replace(COALESCE(a.abbreviation, ''), '\\.+$', '') AS abbr_norm,
        CASE
          WHEN NULLIF(regexp_replace(COALESCE(a.abbreviation, ''), '\\.+$', ''), '') IS NULL THEN NULL
          ELSE regexp_replace(COALESCE(a.abbreviation, ''), '\\.+$', '') || '.'
        END AS abbr_display,
        COUNT(DISTINCT au.book_id)::int AS title_count,
        COALESCE(a.published_titles, COUNT(DISTINCT au.book_id))::int AS published_titles
      FROM public.authors a
      JOIN authored au ON au.author_id = a.id
      WHERE NULLIF(regexp_replace(COALESCE(a.abbreviation, ''), '\\.+$', ''), '') IS NOT NULL
        AND (
          $1::text IS NULL
          OR a.last_name ILIKE $1
          OR a.first_name ILIKE $1
          OR a.name_display ILIKE $1
          OR a.abbreviation ILIKE $1
        )
      GROUP BY a.id, a.first_name, a.last_name, a.abbreviation, a.published_titles, a.name_display
      ORDER BY
        LOWER(regexp_replace(COALESCE(a.abbreviation, ''), '\\.+$', '')) ASC,
        LOWER(COALESCE(NULLIF(a.last_name, ''), NULLIF(a.name_display, ''), '')) ASC,
        LOWER(COALESCE(NULLIF(a.first_name, ''), '')) ASC,
        a.id ASC
      LIMIT $2
      `,
      [qLike, limit]
    );

    res.setHeader("Cache-Control", "no-store");
    res.json({ items: rows });
  } catch (err) {
    console.error("GET /api/admin/abbreviations error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/authors/:authorId/books", adminAuthRequired, async (req, res) => {
  try {
    const pool = getPool(req);
    const authorId = String(req.params.authorId || "").trim();
    if (!isUuid(authorId)) {
      return res.status(400).json({ error: "invalid_author_id" });
    }

    const { rows } = await pool.query(
      `
      WITH authored AS (
        SELECT b.id AS book_id, b.author_id
        FROM public.books b
        WHERE b.author_id IS NOT NULL

        UNION

        SELECT ba.book_id, ba.author_id
        FROM public.book_authors ba
        WHERE ba.author_id IS NOT NULL
      )
      SELECT DISTINCT ON (b.id)
        b.id::text AS id,
        COALESCE(
          NULLIF(b.title_display, ''),
          NULLIF(b.title_keyword, ''),
          NULLIF(b.title_en, ''),
          b.id::text
        ) AS title_display,
        b.subtitle_display,
        COALESCE(NULLIF(p.name_display, ''), NULLIF(p.name, '')) AS publisher_name_display,
        b.pages,
        b.reading_status,
        b.registered_at,
        b.added_at,
        bb.barcode
      FROM authored au
      JOIN public.books b ON b.id = au.book_id
      LEFT JOIN public.publishers p ON p.id = b.publisher_id
      LEFT JOIN LATERAL (
        SELECT barcode
        FROM public.book_barcodes bb
        WHERE bb.book_id = b.id
        LIMIT 1
      ) bb ON true
      WHERE au.author_id = $1::uuid
      ORDER BY
        b.id,
        LOWER(
          COALESCE(
            NULLIF(b.title_display, ''),
            NULLIF(b.title_keyword, ''),
            NULLIF(b.title_en, ''),
            b.id::text
          )
        ) ASC
      `,
      [authorId]
    );

    const items = [...rows].sort((a, b) => {
      const aa = String(a?.title_display || "").toLowerCase();
      const bb = String(b?.title_display || "").toLowerCase();
      return aa.localeCompare(bb, undefined, { sensitivity: "base" });
    });

    res.setHeader("Cache-Control", "no-store");
    res.json({ items });
  } catch (err) {
    console.error("GET /api/admin/authors/:authorId/books error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/barcodes/summary", adminAuthRequired, async (req, res) => {
  try {
    const pool = getPool(req);

    const [
      inventoryRes,
      openAssignmentsRes,
      assignedWithoutOpenRes,
      openWithoutAssignedRes,
    ] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'AVAILABLE')::int AS available,
          COUNT(*) FILTER (WHERE status = 'ASSIGNED')::int AS assigned,
          COUNT(*) FILTER (WHERE status NOT IN ('AVAILABLE', 'ASSIGNED'))::int AS other
        FROM public.barcode_inventory
      `),
      pool.query(`
        SELECT COUNT(*)::int AS open_assigned
        FROM public.barcode_assignments
        WHERE freed_at IS NULL
      `),
      pool.query(`
        SELECT COUNT(*)::int AS cnt
        FROM public.barcode_inventory bi
        LEFT JOIN public.barcode_assignments ba
          ON lower(ba.barcode) = lower(bi.barcode)
         AND ba.freed_at IS NULL
        WHERE bi.status = 'ASSIGNED'
          AND ba.barcode IS NULL
      `),
      pool.query(`
        SELECT COUNT(*)::int AS cnt
        FROM public.barcode_assignments ba
        LEFT JOIN public.barcode_inventory bi
          ON lower(bi.barcode) = lower(ba.barcode)
        WHERE ba.freed_at IS NULL
          AND (bi.barcode IS NULL OR bi.status <> 'ASSIGNED')
      `),
    ]);

    const inv = inventoryRes.rows[0] || {};

    res.setHeader("Cache-Control", "no-store");
    res.json({
      total: inv.total || 0,
      available: inv.available || 0,
      assigned: inv.assigned || 0,
      other: inv.other || 0,
      open_assigned: openAssignmentsRes.rows[0]?.open_assigned || 0,
      mismatch: {
        assigned_without_open: assignedWithoutOpenRes.rows[0]?.cnt || 0,
        open_without_assigned: openWithoutAssignedRes.rows[0]?.cnt || 0,
      },
    });
  } catch (err) {
    console.error("GET /api/admin/barcodes/summary error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/barcodes", adminAuthRequired, async (req, res) => {
  try {
    const pool = getPool(req);
    const page = clampInt(req.query.page, 1, 1, 100000);
    const limit = clampInt(req.query.limit, 50, 1, 500);
    const offset = (page - 1) * limit;
    const status = normStr(req.query.status);
    const q = normStr(req.query.q);

    const where = [];
    const params = [];

    if (status) {
      params.push(String(status).toUpperCase());
      where.push(`bi.status = $${params.length}`);
    }

    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      where.push(`(
        bi.barcode ILIKE ${p}
        OR COALESCE(NULLIF(b.title_display, ''), NULLIF(b.title_keyword, ''), NULLIF(b.title_en, ''), '') ILIKE ${p}
        OR COALESCE(NULLIF(a.name_display, ''), NULLIF(concat_ws(' ', a.first_name, a.last_name), '')) ILIKE ${p}
      )`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    params.push(limit, offset);
    const limitRef = `$${params.length - 1}`;
    const offsetRef = `$${params.length}`;

    const { rows } = await pool.query(
      `
      WITH open_assignments AS (
        SELECT DISTINCT ON (lower(ba.barcode))
          ba.barcode,
          ba.book_id,
          ba.assigned_at
        FROM public.barcode_assignments ba
        WHERE ba.freed_at IS NULL
        ORDER BY lower(ba.barcode), ba.assigned_at DESC, ba.book_id
      ),
      base AS (
        SELECT
          bi.barcode,
          bi.status,
          COALESCE(bi.sizegroup, bi.size_rule_id) AS sizegroup,
          bi.band,
          bi.rank_in_inventory,
          oa.book_id,
          oa.assigned_at,
          bi.updated_at,
          COALESCE(
            NULLIF(b.title_display, ''),
            NULLIF(b.title_keyword, ''),
            NULLIF(b.title_en, ''),
            b.id::text
          ) AS book_title,
          COALESCE(
            NULLIF(a.name_display, ''),
            NULLIF(concat_ws(' ', a.first_name, a.last_name), '')
          ) AS book_author,
          b.reading_status AS book_reading_status
        FROM public.barcode_inventory bi
        LEFT JOIN open_assignments oa
          ON lower(oa.barcode) = lower(bi.barcode)
        LEFT JOIN public.books b
          ON b.id = oa.book_id
        LEFT JOIN public.authors a
          ON a.id = b.author_id
        ${whereSql}
      )
      SELECT
        *,
        COUNT(*) OVER()::int AS total_items
      FROM base
      ORDER BY
        CASE WHEN status = 'ASSIGNED' THEN 0 ELSE 1 END,
        rank_in_inventory NULLS LAST,
        barcode ASC
      LIMIT ${limitRef} OFFSET ${offsetRef}
      `,
      params
    );

    const totalItems = rows[0]?.total_items || 0;
    const pages = Math.max(1, Math.ceil(totalItems / limit));
    const items = rows.map(({ total_items, ...r }) => r);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      items,
      totalItems,
      page,
      pages,
      limit,
    });
  } catch (err) {
    console.error("GET /api/admin/barcodes error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/books/:id/register", adminAuthRequired, registerExistingBook);

router.post("/books/:id/make-highlight", adminAuthRequired, async (req, res) => {
  try {
    const pool = getPool(req);
    const id = String(req.params.id || "").trim();
    if (!isUuid(id)) return res.status(400).json({ error: "invalid_id" });

    const bookRes = await pool.query(
      `
      SELECT id, reading_status
      FROM public.books
      WHERE id = $1::uuid
      LIMIT 1
      `,
      [id]
    );

    if (!bookRes.rowCount) return res.status(404).json({ error: "not_found" });

    const status = String(bookRes.rows[0].reading_status || "").toLowerCase();
    const slot =
      status === "finished"
        ? "finished"
        : status === "in_stock"
          ? "received"
          : null;

    if (!slot) {
      return res.status(409).json({
        error: "unsupported_status",
        detail: "Only finished and in_stock books can be promoted to home highlights.",
      });
    }

    const current = await pool.query(
      `
      SELECT book_id
      FROM public.home_featured_periods
      WHERE slot = $1
        AND presented_to IS NULL
      LIMIT 1
      `,
      [slot]
    );

    const noChange = String(current.rows[0]?.book_id || "") === id;

    if (!noChange) {
      await pool.query(
        `SELECT public.set_home_featured_slot($1, $2::uuid, 'admin')`,
        [slot, id]
      );
    }

    res.json({ ok: true, slot, noChange });
  } catch (err) {
    console.error("POST /api/admin/books/:id/make-highlight error", err);
    res.status(500).json({
      error: "internal_error",
      detail: String(err?.message || err),
    });
  }
});

router.get("/drafts/find", adminAuthRequired, async (req, res) => {
  try {
    const pool = getPool(req);
    const limit = clampInt(req.query.limit, 10, 1, 50);

    const isbn = normStr(req.query.isbn);
    const code = normStr(req.query.code);
    const titleDisplay = normStr(req.query.title_display);
    const subtitleDisplay = normStr(req.query.subtitle_display);
    const titleKeyword = normStr(req.query.title_keyword);
    const authorLast = normStr(req.query.author_lastname);
    const authorFirst = normStr(req.query.author_firstname);
    const authorDisplay = normStr(req.query.name_display);
    const publisherDisplay = normStr(req.query.publisher_name_display);
    const publisherAbbr = normStr(req.query.publisher_abbr);

    const values = [];
    const scores = [];
    const ors = [];

    function addContains(expr, value, weight) {
      if (!value) return;
      values.push(`%${value}%`);
      const ref = `$${values.length}`;
      ors.push(`${expr} ILIKE ${ref}`);
      scores.push(`CASE WHEN ${expr} ILIKE ${ref} THEN ${weight} ELSE 0 END`);
    }

    function addExact(expr, value, weight) {
      if (!value) return;
      values.push(value);
      const ref = `$${values.length}`;
      ors.push(`${expr} = ${ref}`);
      scores.push(`CASE WHEN ${expr} = ${ref} THEN ${weight} ELSE 0 END`);
    }

    addExact("COALESCE(b.isbn13, '')", isbn, 100);
    addExact("COALESCE(b.isbn10, '')", isbn, 100);

    if (code && /^\d+$/.test(code)) {
      values.push(Number(code));
      const ref = `$${values.length}`;
      ors.push(`b.pages = ${ref}`);
      scores.push(`CASE WHEN b.pages = ${ref} THEN 15 ELSE 0 END`);
    }

    addContains("COALESCE(b.title_display, '')", titleDisplay, 30);
    addContains("COALESCE(b.subtitle_display, '')", subtitleDisplay, 20);
    addContains("COALESCE(b.title_keyword, '')", titleKeyword, 20);
    addContains("COALESCE(a.last_name, '')", authorLast, 20);
    addContains("COALESCE(a.first_name, '')", authorFirst, 10);
    addContains("COALESCE(a.name_display, '')", authorDisplay, 25);
    addContains("COALESCE(p.name_display, '')", publisherDisplay, 10);
    addContains("COALESCE(p.abbr, '')", publisherAbbr, 10);

    if (!ors.length) return res.json({ items: [] });

    values.push(limit);
    const limitRef = `$${values.length}`;

    const { rows } = await pool.query(
      `
      SELECT
        b.id::text AS id,
        COALESCE(NULLIF(b.title_display, ''), NULLIF(b.title_keyword, ''), NULLIF(b.title_en, '')) AS title_display,
        b.subtitle_display,
        COALESCE(NULLIF(a.name_display, ''), NULLIF(concat_ws(' ', a.first_name, a.last_name), '')) AS author_name_display,
        a.first_name AS author_first_name,
        a.last_name AS author_last_name,
        COALESCE(NULLIF(p.name_display, ''), NULLIF(p.name, '')) AS publisher_name_display,
        p.abbr AS publisher_abbr,
        b.pages,
        b.isbn13,
        b.isbn10,
        (${scores.join(" + ")})::int AS match_score
      FROM public.books b
      LEFT JOIN public.authors a ON a.id = b.author_id
      LEFT JOIN public.publishers p ON p.id = b.publisher_id
      WHERE ${ors.join(" OR ")}
      ORDER BY match_score DESC, b.registered_at DESC NULLS LAST, b.added_at DESC NULLS LAST, b.id
      LIMIT ${limitRef}
      `,
      values
    );

    res.setHeader("Cache-Control", "no-store");
    res.json({ items: rows });
  } catch (err) {
    console.error("GET /api/admin/drafts/find error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;   
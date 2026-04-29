  // backend/routes/admin.js
  const express = require("express");
  // Use async fs to avoid blocking Node's event loop during uploads.
  const fs = require("fs/promises");
  const path = require("path");
  const multer = require("multer");
  const router = express.Router();
  const {
    adminAuthRequired,
    adminLogin,
    adminLogout,
  } = require("../middleware/adminAuth");
  const { registerBook, registerExistingBook } = require("../controllers/booksPgController");

  const upload = multer({ storage: multer.memoryStorage() });

  function cmToMm(v) {
    const n = Number(String(v).replace(",", "."));
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 10);
  }

  function posToBand(pos) {
    if (pos === "l") return "special";
    if (pos === "d") return "low";
    return "high";
  }

  function clampInt(v, { min = 1, max = 200, def = 50 } = {}) {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.max(min, Math.min(max, Math.trunc(n)));
  }

  function clampOffset(v, { min = 0, max = 1000000, def = 0 } = {}) {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.max(min, Math.min(max, Math.trunc(n)));
  }

  /**
   * Pick size rule by width/height.
   * IMPORTANT: do NOT restrict to eq_heights here; eq_heights is used only to decide pos/band.
   */
  async function pickSizeRule(pool, widthMm, heightMm) {
    const r = await pool.query(
      `
        SELECT id, name, min_height, eq_heights
        FROM public.size_rules
        WHERE $1 BETWEEN min_width AND max_width
          AND $2 >= min_height
        ORDER BY (max_width - min_width) ASC, min_width ASC
        LIMIT 1
        `,
      [widthMm, heightMm]
    );
    return r.rows[0] || null;
  }

  /**
   * Decide pos from height and rule:
   *  - l if height is exactly in eq_heights (default 205/210/215)
   *  - d if height <= min_height
   *  - o otherwise
   */
  function computePos(rule, heightMm) {
    const eq =
      Array.isArray(rule.eq_heights) && rule.eq_heights.length
        ? rule.eq_heights
        : [205, 210, 215];

    if (eq.includes(heightMm)) return "l";
    if (heightMm <= Number(rule.min_height)) return "d";
    return "o";
  }

  /**
   * Pick lowest-ranked AVAILABLE barcode from inventory for (sizegroup, band).
   * sizegroup is assumed to equal size_rules.id.
   */
  async function pickBarcode(pool, sizegroup, band) {
    const r = await pool.query(
      `
        SELECT bi.barcode, bi.rank_in_inventory
        FROM public.barcode_inventory bi
        LEFT JOIN public.barcode_assignments ba
          ON lower(ba.barcode) = lower(bi.barcode)
        AND ba.freed_at IS NULL
        WHERE bi.status = 'AVAILABLE'
          AND bi.rank_in_inventory IS NOT NULL
          AND bi.sizegroup = $1
          AND bi.band = $2
          AND ba.barcode IS NULL
        ORDER BY bi.rank_in_inventory
        LIMIT 1
        `,
      [sizegroup, band]
    );
    return r.rows[0] || null;
  }

  /* -------------------- auth endpoints (public) -------------------- */
  router.post("/login", adminLogin);
  router.post("/logout", adminLogout);

  /* -------------------- protected endpoints -------------------- */
  router.use(adminAuthRequired);

  // simple auth check for frontend guards
  router.get("/me", (_req, res) => {
    res.json({ ok: true });
  });
  /* -------------------- authors overview -------------------- */
/* -------------------- authors overview -------------------- */

// GET /api/admin/authors/overview
// GET /api/admin/authors/overview
router.get("/authors/overview", async (req, res) => {
  const pool = req.app.get("pgPool");
  if (!pool) return res.status(500).json({ error: "pgPool missing" });

  try {
    const r = await pool.query(`
      SELECT
        a.name_display AS author,
        COUNT(*) FILTER (WHERE b.reading_status = 'finished')::int AS completed,
        COUNT(*) FILTER (WHERE b.reading_status = 'abandoned')::int AS not_a_match,
        COUNT(*) FILTER (
          WHERE COALESCE(b.reading_status, 'in_stock') IN ('in_progress', 'in_stock')
        )::int AS on_hand,
        COUNT(*)::int AS total
      FROM public.authors a
      LEFT JOIN public.books b ON b.author_id = a.id
      WHERE a.name_display IS NOT NULL
        AND btrim(a.name_display) <> ''
        AND regexp_replace(a.name_display, '[^A-Za-zÄÖÜäöüß0-9]+', '', 'g') <> ''
      GROUP BY a.id, a.name_display
      ORDER BY regexp_replace(a.name_display, '^[^A-Za-zÄÖÜäöüß0-9]+', '') ASC
    `);

    return res.json({ items: r.rows || [] });
  } catch (e) {
    console.error("GET /api/admin/authors/overview failed", e);
    return res.status(500).json({
      error: "authors_overview_failed",
      detail: String(e?.message || e),
    });
  }
});
/* -------------------- abbreviations admin -------------------- */

  // GET /api/admin/abbreviations?source=abbrev_map|author_aliases|publisher_aliases|authors&type=author|publisher&level=1&q=foo
  router.get("/abbreviations", async (req, res) => {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const source = String(req.query.source || "all").trim().toLowerCase();
    const type = String(req.query.type || "all").trim().toLowerCase();
    const levelRaw = String(req.query.level || "all").trim().toLowerCase();
    const q = String(req.query.q || "").trim();
    const limit = clampInt(req.query.limit, { min: 1, max: 2000, def: 500 });
    const offset = clampOffset(req.query.offset, { min: 0, max: 1000000, def: 0 });

    const validSources = new Set(["all", "abbrev_map", "author_aliases", "publisher_aliases", "authors"]);
    const validTypes = new Set(["all", "author", "publisher"]);

    if (!validSources.has(source)) {
      return res.status(400).json({ error: "invalid_source" });
    }
    if (!validTypes.has(type)) {
      return res.status(400).json({ error: "invalid_type" });
    }

    let level = null;
    if (levelRaw && levelRaw !== "all") {
      if (!/^\d+$/.test(levelRaw)) return res.status(400).json({ error: "invalid_level" });
      level = Math.max(1, Math.trunc(Number(levelRaw)));
    }

    try {
      const parts = [];

      if (source === "all" || source === "abbrev_map") {
        parts.push(`
          SELECT
            'abbrev_map'::text AS source_table,
            am.type::text AS type,
            am.abbr_raw::text AS abbr_raw,
            am.abbr_norm::text AS abbr_norm,
            am.full_name::text AS full_name,
            am.full::text AS "full",
            char_length(coalesce(am.abbr_norm, ''))::int AS abbr_len
          FROM public.abbrev_map am
        `);
      }

      if (source === "all" || source === "author_aliases") {
        parts.push(`
          SELECT
            'author_aliases'::text AS source_table,
            'author'::text AS type,
            NULL::text AS abbr_raw,
            aa.abbr_norm::text AS abbr_norm,
            aa.full_name::text AS full_name,
            NULL::text AS "full",
            char_length(coalesce(aa.abbr_norm, ''))::int AS abbr_len
          FROM public.author_aliases aa
        `);
      }

      if (source === "all" || source === "publisher_aliases") {
        parts.push(`
          SELECT
            'publisher_aliases'::text AS source_table,
            'publisher'::text AS type,
            NULL::text AS abbr_raw,
            pa.abbr_norm::text AS abbr_norm,
            pa.full_name::text AS full_name,
            NULL::text AS "full",
            char_length(coalesce(pa.abbr_norm, ''))::int AS abbr_len
          FROM public.publisher_aliases pa
        `);
      }

      if (source === "all" || source === "authors") {
        parts.push(`
          SELECT
            'authors'::text AS source_table,
            'author'::text AS type,
            a.abbreviation::text AS abbr_raw,
            regexp_replace(lower(coalesce(a.abbreviation, '')), '[^a-z0-9]+', '', 'g')::text AS abbr_norm,
            coalesce(a.name_display, a.name, a.full_name)::text AS full_name,
            a.full_name::text AS "full",
            char_length(regexp_replace(lower(coalesce(a.abbreviation, '')), '[^a-z0-9]+', '', 'g'))::int AS abbr_len
          FROM public.authors a
          WHERE a.abbreviation IS NOT NULL
            AND btrim(a.abbreviation) <> ''
        `);
      }

      if (!parts.length) return res.json({ items: [], total: 0, limit, offset });

      const params = [];
      const where = [];

      if (type !== "all") {
        params.push(type);
        where.push(`type = $${params.length}`);
      }

      if (level != null) {
        params.push(level);
        where.push(`abbr_len = $${params.length}`);
      }

      if (q) {
        params.push(`%${q}%`);
        const pno = params.length;
        where.push(`(
          coalesce(abbr_raw, '') ILIKE $${pno}
          OR coalesce(abbr_norm, '') ILIKE $${pno}
          OR coalesce(full_name, '') ILIKE $${pno}
          OR coalesce("full", '') ILIKE $${pno}
        )`);
      }

      params.push(limit);
      const limitP = params.length;
      params.push(offset);
      const offsetP = params.length;

      const sql = `
        WITH src AS (
          ${parts.join("\nUNION ALL\n")}
        )
        SELECT source_table, type, abbr_raw, abbr_norm, full_name, "full", abbr_len
        FROM src
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY type ASC, abbr_len ASC, abbr_norm ASC, full_name ASC
        LIMIT $${limitP}
        OFFSET $${offsetP}
      `;

      const { rows } = await pool.query(sql, params);
      return res.json({ items: rows, total: rows.length, limit, offset });
    } catch (e) {
      console.error("GET /api/admin/abbreviations failed", e);
      return res.status(500).json({
        error: "abbreviations_query_failed",
        detail: String(e?.message || e),
      });
    }
  });

  /* -------------------- cover upload -------------------- */

  // POST /api/admin/books/:id/cover  (multipart field: cover)
  router.post("/books/:id/cover", upload.single("cover"), async (req, res) => {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "missing_id" });
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id
      )
    ) {
      return res.status(400).json({ error: "invalid_id" });
    }
    if (!req.file) return res.status(400).json({ error: "missing_file" });

    const byteLen = req.file?.buffer?.length ?? 0;
    if (byteLen < 1024) {
      return res.status(400).json({ error: "empty_file", bytes: byteLen });
    }

    try {
      const uploadRoot =
        process.env.UPLOAD_ROOT || path.resolve(__dirname, "../../uploads");
      const dir = path.join(uploadRoot, "covers");
      await fs.mkdir(dir, { recursive: true });

      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const main = path.join(dir, `${id}.jpg`);
      const archive = path.join(dir, `${id}-${ts}.jpg`);

      await Promise.all([
        fs.writeFile(main, req.file.buffer),
        fs.writeFile(archive, req.file.buffer),
      ]);

      // Mark cover presence on the book row (and verify the book exists)
      const upd = await pool.query(
        `
          UPDATE public.books
          SET raw = jsonb_set(
            coalesce(raw,'{}'::jsonb),
            '{capture,coverUploadedAt}',
            to_jsonb(now()),
            true
          )
          WHERE id = $1::uuid
          RETURNING (raw->'capture'->>'coverUploadedAt') AS coveruploadedat
          `,
        [id]
      );

      if (!upd.rowCount) {
        try {
          await fs.unlink(main);
        } catch {}
        try {
          await fs.unlink(archive);
        } catch {}
        return res.status(404).json({ error: "book_not_found_for_cover", id });
      }

      return res.json({
        ok: true,
        id,
        bytes: req.file.buffer.length,
        cover: `/media/covers/${id}.jpg`,
        coverUploadedAt: upd.rows?.[0]?.coveruploadedat || null,
      });
    } catch (e) {
      console.error("cover upload failed", e);
      return res.status(500).json({
        error: "cover_upload_failed",
        detail: String(e?.message || e),
      });
    }
  });

  /* -------------------- draft lookup (photo/manual placeholders) -------------------- */

  // GET /api/admin/drafts/find?isbn=...&code=...&title_display=...&author_lastname=...&publisher_name_display=...
  router.get("/drafts/find", async (req, res) => {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const isbn = String(req.query.isbn || "").trim();
    const codeRaw = String(req.query.code || "").trim();
    const titleDisplay = String(req.query.title_display || "").trim();
    const subtitleDisplay = String(req.query.subtitle_display || "").trim();
    const titleKeyword = String(req.query.title_keyword || "").trim();
    const authorLast = String(req.query.author_lastname || "").trim();
    const authorFirst = String(req.query.author_firstname || "").trim();
    const authorDisplay = String(req.query.name_display || req.query.author_name_display || "").trim();
    const publisherDisplay = String(req.query.publisher_name_display || "").trim();
    const publisherAbbr = String(req.query.publisher_abbr || "").trim();

    let code = null;
    if (codeRaw) {
      if (!/^[0-9]+$/.test(codeRaw)) {
        return res.status(400).json({ error: "invalid_code" });
      }
      const n = Number(codeRaw);
      if (!Number.isFinite(n) || n <= 0) {
        return res.status(400).json({ error: "invalid_code" });
      }
      code = Math.trunc(n);
    }

    if (!isbn && code == null && !titleDisplay && !subtitleDisplay && !titleKeyword && !authorLast && !authorFirst && !authorDisplay && !publisherDisplay && !publisherAbbr) {
      return res.status(400).json({ error: "missing_search_params" });
    }

    try {
      const params = [];
      const matches = [];

      if (isbn) {
        params.push(isbn);
        const p = `$${params.length}`;
        matches.push(`(b.isbn13 = ${p} OR b.isbn10 = ${p} OR b.isbn13_raw = ${p})`);
      }
      if (code != null) {
        params.push(code);
        matches.push(`b.pages = $${params.length}`);
      }

      for (const value of [titleDisplay, subtitleDisplay, titleKeyword]) {
        if (!value) continue;
        params.push(`%${value}%`);
        const p = `$${params.length}`;
        matches.push(`(
          b.title_display ILIKE ${p}
          OR b.subtitle_display ILIKE ${p}
          OR b.title_keyword ILIKE ${p}
          OR concat_ws(' ', b.title_display, b.subtitle_display) ILIKE ${p}
        )`);
      }

      if (authorLast) {
        params.push(`%${authorLast}%`);
        const p = `$${params.length}`;
        matches.push(`(
          a.last_name ILIKE ${p}
          OR a.name_display ILIKE ${p}
          OR concat_ws(' ', a.first_name, a.last_name) ILIKE ${p}
        )`);
      }
      if (authorFirst) {
        params.push(`%${authorFirst}%`);
        const p = `$${params.length}`;
        matches.push(`(
          a.first_name ILIKE ${p}
          OR concat_ws(' ', a.first_name, a.last_name) ILIKE ${p}
        )`);
      }
      if (authorDisplay) {
        params.push(`%${authorDisplay}%`);
        const p = `$${params.length}`;
        matches.push(`(
          a.name_display ILIKE ${p}
          OR concat_ws(' ', a.first_name, a.last_name) ILIKE ${p}
        )`);
      }

      if (publisherDisplay) {
        params.push(`%${publisherDisplay}%`);
        const p = `$${params.length}`;
        matches.push(`(
          p.name_display ILIKE ${p}
          OR p.name ILIKE ${p}
        )`);
      }
      if (publisherAbbr) {
        params.push(`%${publisherAbbr}%`);
        const p = `$${params.length}`;
        matches.push(`p.abbr ILIKE ${p}`);
      }

      const q = `
        SELECT
          b.id::text AS id,
          b.added_at,
          b.registered_at,
          b.reading_status,
          b.pages,
          b.width,
          b.height,
          b.isbn13,
          b.isbn10,
          b.isbn13_raw,
          b.title_display,
          b.subtitle_display,
          b.title_keyword,
          b.purchase_url,
          b.comment,
          b.original_language,
          a.id::text AS author_id,
          a.first_name AS author_first_name,
          a.last_name AS author_last_name,
          a.name_display AS author_name_display,
          
          a.abbreviation AS author_abbreviation,
          a.author_nationality,
          a.place_of_birth,
          a.male_female,
          a.published_titles,
          a.number_of_millionsellers,
          p.id::text AS publisher_id,
          p.name AS publisher_name,
          p.name_display AS publisher_name_display,
          p.abbr AS publisher_abbr
        FROM public.books b
        LEFT JOIN public.authors a ON a.id = b.author_id
        LEFT JOIN public.publishers p ON p.id = b.publisher_id
        WHERE b.reading_status = 'in_stock'
          AND (${matches.join(" OR ")})
        ORDER BY (b.registered_at IS NULL) DESC, b.added_at DESC NULLS LAST, b.registered_at DESC NULLS LAST
        LIMIT 20
      `;

      const r = await pool.query(q, params);
      const items = (r.rows || []).map((row) => ({
        ...row,
        width_cm: row.width != null ? row.width / 10 : null,
        height_cm: row.height != null ? row.height / 10 : null,
        coverUrl: `/media/covers/${row.id}.jpg`,
      }));
      return res.json({ items });
    } catch (e) {
      console.error("draft find failed", e);
      return res.status(500).json({
        error: "draft_find_failed",
        detail: String(e?.message || e),
      });
    }
  });

  /* -------------------- finalize draft (assign barcode + update) -------------------- */

  // POST /api/admin/books/:id/register
  router.post("/books/:id/register", registerExistingBook);

  /* -------------------- comments moderation -------------------- */

  // GET /api/admin/comments?status=pending|approved|rejected|spam&bookId=<uuid>&page=1&limit=50
  router.get("/comments", async (req, res) => {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const statusRaw = String(req.query?.status || "")
      .trim()
      .toLowerCase();
    const status =
      statusRaw && ["pending", "approved", "rejected", "spam"].includes(statusRaw)
        ? statusRaw
        : null;

    const bookId =
      String(req.query?.bookId || req.query?.book_id || "").trim() || null;

    const page = clampInt(req.query?.page, { min: 1, max: 100000, def: 1 });
    const limit = clampInt(req.query?.limit, { min: 1, max: 200, def: 50 });
    const offset = (page - 1) * limit;

    try {
      const countRes = await pool.query(
        `
          SELECT count(*)::int AS total
          FROM public.book_comments c
          WHERE ($1::text IS NULL OR c.status = $1)
            AND ($2::uuid IS NULL OR c.book_id = $2::uuid)
          `,
        [status, bookId]
      );
      const totalItems = countRes.rows?.[0]?.total ?? 0;
      const pages = Math.max(1, Math.ceil(totalItems / limit));

      const listRes = await pool.query(
        `
          SELECT
            c.id::text AS id,
            c.book_id::text AS book_id,
            c.parent_id::text AS parent_id,
            c.author_name,
            c.body,
            c.status,
            c.created_at,
            c.approved_at,
            c.rejected_at,
            COALESCE(NULLIF(b.title_display,''), NULLIF(b.title_keyword,'')) AS book_title,
            a.name_display AS book_author
          FROM public.book_comments c
          LEFT JOIN public.books b ON b.id = c.book_id
          LEFT JOIN public.authors a ON a.id = b.author_id
          WHERE ($1::text IS NULL OR c.status = $1)
            AND ($2::uuid IS NULL OR c.book_id = $2::uuid)
          ORDER BY c.created_at DESC
          LIMIT $3 OFFSET $4
          `,
        [status, bookId, limit, offset]
      );

      return res.json({
        items: listRes.rows || [],
        page,
        limit,
        totalItems,
        pages,
      });
    } catch (e) {
      console.error("GET /api/admin/comments failed:", e);
      return res.status(500).json({
        error: "comments_list_failed",
        detail: String(e?.message || e),
      });
    }
  });

  // POST /api/admin/comments/:id/approve
  router.post("/comments/:id/approve", async (req, res) => {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "missing_id" });

    try {
      const r = await pool.query(
        `
          UPDATE public.book_comments
          SET status='approved', approved_at=now(), rejected_at=NULL
          WHERE id = $1::uuid
          RETURNING id::text AS id, status, approved_at
          `,
        [id]
      );
      if (!r.rows?.[0]) return res.status(404).json({ error: "not_found" });
      return res.json({ ok: true, ...r.rows[0] });
    } catch (e) {
      return res
        .status(500)
        .json({ error: "approve_failed", detail: String(e?.message || e) });
    }
  });

  // POST /api/admin/comments/:id/reject
  router.post("/comments/:id/reject", async (req, res) => {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "missing_id" });

    try {
      const r = await pool.query(
        `
          UPDATE public.book_comments
          SET status='rejected', rejected_at=now()
          WHERE id = $1::uuid
          RETURNING id::text AS id, status, rejected_at
          `,
        [id]
      );
      if (!r.rows?.[0]) return res.status(404).json({ error: "not_found" });
      return res.json({ ok: true, ...r.rows[0] });
    } catch (e) {
      return res
        .status(500)
        .json({ error: "reject_failed", detail: String(e?.message || e) });
    }
  });

  /* -------------------- barcode dashboard -------------------- */

  // GET /api/admin/barcodes/summary
  router.get("/barcodes/summary", async (req, res) => {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    try {
      const inv = await pool.query(
        `
          SELECT
            count(*)::int AS total,
            sum(CASE WHEN status::text = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS available,
            sum(CASE WHEN status::text = 'ASSIGNED'  THEN 1 ELSE 0 END)::int AS assigned,
            sum(CASE WHEN status::text NOT IN ('AVAILABLE','ASSIGNED') THEN 1 ELSE 0 END)::int AS other
          FROM public.barcode_inventory
          `
      );

      const open = await pool.query(
        `
          SELECT count(*)::int AS open_assigned
          FROM public.barcode_assignments
          WHERE freed_at IS NULL
          `
      );

      const mismatch = await pool.query(
        `
          WITH open_ba AS (
            SELECT DISTINCT lower(barcode) AS bc
            FROM public.barcode_assignments
            WHERE freed_at IS NULL
          )
          SELECT
            sum(CASE WHEN bi.status::text = 'ASSIGNED' AND ob.bc IS NULL THEN 1 ELSE 0 END)::int AS assigned_without_open,
            sum(CASE WHEN bi.status::text <> 'ASSIGNED' AND ob.bc IS NOT NULL THEN 1 ELSE 0 END)::int AS open_without_assigned
          FROM public.barcode_inventory bi
          LEFT JOIN open_ba ob ON ob.bc = lower(bi.barcode)
          `
      );

      return res.json({
        ...inv.rows[0],
        open_assigned: open.rows[0]?.open_assigned ?? 0,
        mismatch: mismatch.rows[0] || {
          assigned_without_open: 0,
          open_without_assigned: 0,
        },
      });
    } catch (e) {
      return res.status(500).json({
        error: "barcode_summary_failed",
        detail: String(e?.message || e),
      });
    }
  });

  // GET /api/admin/barcodes
  router.get("/barcodes", async (req, res) => {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const statusRaw = String(req.query?.status || "").trim();
    const status = statusRaw ? statusRaw.toUpperCase() : null;

    const qRaw = String(req.query?.q || "").trim();
    const q = qRaw ? qRaw : null;

    const page = clampInt(req.query?.page, { min: 1, max: 100000, def: 1 });
    const limit = clampInt(req.query?.limit, { min: 1, max: 500, def: 50 });
    const offset = (page - 1) * limit;

    try {
      const countRes = await pool.query(
        `
          SELECT count(*)::int AS total
          FROM public.barcode_inventory bi
          WHERE ($1::text IS NULL OR bi.status::text = $1)
            AND ($2::text IS NULL OR bi.barcode ILIKE '%' || $2 || '%')
          `,
        [status, q]
      );
      const totalItems = countRes.rows[0]?.total ?? 0;
      const pages = Math.max(1, Math.ceil(totalItems / limit));

      const listRes = await pool.query(
        `
          SELECT
            bi.barcode,
            bi.status::text AS status,
            bi.sizegroup,
            bi.band,
            bi.rank_in_inventory,
            regexp_replace(bi.barcode, '[0-9]+$', '') AS prefix,
            bi.updated_at,
            ba.book_id,
            ba.assigned_at,
            COALESCE(b.title_display, b.title_keyword, b.title_en) AS book_title,
            COALESCE(a.name_display, a.last_name) AS book_author,
            b.reading_status AS book_reading_status
          FROM public.barcode_inventory bi
          LEFT JOIN LATERAL (
            SELECT book_id, assigned_at
            FROM public.barcode_assignments
            WHERE freed_at IS NULL
              AND lower(barcode) = lower(bi.barcode)
            ORDER BY assigned_at DESC
            LIMIT 1
          ) ba ON true
          LEFT JOIN public.books b ON b.id = ba.book_id
          LEFT JOIN public.authors a ON a.id = b.author_id
          WHERE ($1::text IS NULL OR bi.status::text = $1)
            AND ($2::text IS NULL OR bi.barcode ILIKE '%' || $2 || '%')
          ORDER BY bi.barcode ASC
          LIMIT $3 OFFSET $4
          `,
        [status, q, limit, offset]
      );

      return res.json({
        items: listRes.rows || [],
        page,
        limit,
        totalItems,
        pages,
      });
    } catch (e) {
      console.error("barcode_list_failed:", e);
      return res.status(500).json({
        error: "barcode_list_failed",
        detail: String(e?.message || e),
      });
    }
  });

  router.post("/register", async (req, res) => {
    const body = req.body || {};
    req.body = {
      assign_barcode: body.assign_barcode,
      barcode: body.barcode,
      width_cm: body.width_cm,
      height_cm: body.height_cm,
      author_id: body.author_id,
      author_lastname: body.author_lastname,
      author_firstname: body.author_firstname,
      name_display: body.name_display,
      author_abbreviation: body.author_abbreviation,
      author_nationality: body.author_nationality,
      place_of_birth: body.place_of_birth,
      male_female: body.male_female,
      published_titles: body.published_titles,
      number_of_millionsellers: body.number_of_millionsellers,
      publisher_id: body.publisher_id,
      publisher_name_display: body.publisher_name_display,
      publisher_abbr: body.publisher_abbr,
      title_display: body.title_display,
      subtitle_display: body.subtitle_display,
      title_keyword: body.title_keyword,
      title_keyword_position: body.title_keyword_position,
      title_keyword2: body.title_keyword2,
      title_keyword2_position: body.title_keyword2_position,
      title_keyword3: body.title_keyword3,
      title_keyword3_position: body.title_keyword3_position,
      pages: body.pages,
      purchase_url: body.purchase_url,
      isbn13: body.isbn13,
      isbn10: body.isbn10,
      isbn13_raw: body.isbn13_raw,
      original_language: body.original_language,
      comment: body.comment,
      top_book: body.top_book,
      reading_status: body.reading_status,
      requestId: body.requestId,
      request_id: body.request_id,
    };
    return registerBook(req, res);
  });

  /* -------------------- needs_review (mobile app) -------------------- */

  router.get("/needs-review", async (req, res) => {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const page = clampInt(req.query.page, { min: 1, max: 100000, def: 1 });
    const limit = clampInt(req.query.limit, { min: 1, max: 200, def: 50 });
    const offset = (page - 1) * limit;

    const issueStatus = String(req.query.issue_status || "open")
      .trim()
      .toLowerCase();
    const q = String(req.query.q || "").trim();

    try {
      const where = [];
      const params = [];
      let i = 1;

      where.push("r.status = 'needs_review'");

      if (issueStatus && issueStatus !== "all") {
        where.push(`COALESCE(LOWER(i.status), 'open') = $${i}`);
        params.push(issueStatus);
        i += 1;
      }

      if (q) {
        where.push(
          `(
              r.barcode ILIKE $${i}
              OR i.reason ILIKE $${i}
              OR i.client_change_id ILIKE $${i}
            )`
        );
        params.push(`%${q}%`);
        i += 1;
      }

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const countRes = await pool.query(
        `
          SELECT count(*)::int AS total
          FROM mobile_sync.receipts r
          LEFT JOIN mobile_sync.issues i ON i.id = r.issue_id
          ${whereSql}
          `,
        params
      );

      const itemsRes = await pool.query(
        `
          SELECT
            r.id AS receipt_id,
            r.client_change_id,
            r.received_at,
            r.barcode,
            r.pages,
            r.reading_status,
            r.reading_status_updated_at,
            r.top_book,
            r.topbook_set_at,
            r.issue_id,
            r.payload AS receipt_payload,

            i.status AS issue_status,
            i.reason,
            i.candidate_book_ids,
            i.details,
            i.note,
            i.created_at AS issue_created_at,
            i.payload AS issue_payload
          FROM mobile_sync.receipts r
          LEFT JOIN mobile_sync.issues i ON i.id = r.issue_id
          ${whereSql}
          ORDER BY r.received_at DESC
          LIMIT $${i} OFFSET $${i + 1}
          `,
        [...params, limit, offset]
      );

      return res.json({
        items: itemsRes.rows,
        total: countRes.rows[0]?.total ?? 0,
        page,
        limit,
      });
    } catch (e) {
      const msg = String(e?.message || e);
      if (
        /mobile_sync\./i.test(msg) &&
        /(does not exist|undefined table|relation)/i.test(msg)
      ) {
        return res.json({ items: [], total: 0, page, limit });
      }
      return res
        .status(500)
        .json({ error: "needs_review_failed", detail: msg });
    }
  });

  /**
   * Resolve / discard a mobile_sync issue.
   *
   * POST /api/admin/needs-review/:issueId/resolve
   * Body: { status?: "resolved"|"discarded", note?: string }
   */
  router.post("/needs-review/:issueId/resolve", async (req, res) => {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const issueId = String(req.params.issueId || "").trim();
    if (!issueId) return res.status(400).json({ error: "issue_id_required" });

    const statusRaw = String(req.body?.status || "resolved")
      .trim()
      .toLowerCase();
    const status = statusRaw === "discarded" ? "discarded" : "resolved";
    const note = req.body?.note ? String(req.body.note) : null;

    try {
      const r = await pool.query(
        `
          UPDATE mobile_sync.issues
          SET
            status = $2,
            note = COALESCE($3, note),
            resolved_at = now(),
            resolved_by = 'admin'
          WHERE id = $1::uuid
          RETURNING id, status, resolved_at, note
          `,
        [issueId, status, note]
      );

      if (r.rowCount !== 1) {
        return res.status(404).json({ error: "issue_not_found" });
      }

      return res.json({ ok: true, issue: r.rows[0] });
    } catch (e) {
      return res.status(500).json({
        error: "issue_update_failed",
        detail: String(e?.message || e),
      });
    }
  });

  module.exports = router;
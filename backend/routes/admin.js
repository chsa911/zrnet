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

      // GET /api/a dmin/authors/overview
      // GET /api/admin/authors/overview
      router.get("/authors/overview", async (req, res) => {
        const pool = req.app.get("pgPool");
        if (!pool) return res.status(500).json({ error: "pgPool missing" });

        try {
          const r = await pool.query(`
  SELECT
    a.id::text AS id,
    NULLIF(btrim(a.last_name), '') AS last_name,
    NULLIF(btrim(a.first_name), '') AS first_name,
    NULLIF(btrim(a.name_display), '') AS name_display,
    NULLIF(btrim(a.name_display), '') AS author,
    NULLIF(btrim(a.namenszusatz), '') AS namenszusatz,

    COUNT(b.id) FILTER (WHERE b.reading_status = 'finished')::int AS completed,

    COUNT(b.id) FILTER (
      WHERE b.reading_status = 'abandoned'
    )::int AS not_a_match,

    COUNT(b.id) FILTER (
      WHERE COALESCE(b.reading_status, 'in_stock')
      IN ('in_progress', 'in_stock')
    )::int AS on_hand,
COUNT(b.id)::int AS total,

COUNT(b.id) FILTER (WHERE b.top_book = true)::int AS top_books
  FROM public.authors a

  LEFT JOIN public.books b
    ON b.author_id = a.id


  WHERE a.name_display IS NOT NULL
    AND btrim(a.name_display) <> ''
    AND regexp_replace(
      a.name_display,
      '[^A-Za-zÄÖÜäöüß0-9]+',
      '',
      'g'
    ) <> ''

  GROUP BY
    a.id,
    a.last_name,
    a.first_name,
    a.name_display,
    a.namenszusatz
    

  ORDER BY
    LOWER(NULLIF(btrim(a.last_name), '')) ASC NULLS LAST,
    LOWER(COALESCE(NULLIF(btrim(a.first_name), ''), '')) ASC,
    LOWER(NULLIF(btrim(a.name_display), '')) ASC,
    a.id ASC
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

      // GET /api/admin/authors/lookup?q=arch&limit=20
      // Strict author lookup for abbreviation assignment.
      // It matches ONLY authors whose last_name starts with the typed value.
      // It returns name_display so the UI can show the complete author name.
      router.get("/authors/lookup", async (req, res) => {
        const pool = req.app.get("pgPool");
        if (!pool) return res.status(500).json({ error: "pgPool missing" });

        const qRaw = String(req.query.q || "").trim();
        const limit = clampInt(req.query.limit, { min: 1, max: 75, def: 30 });

        if (qRaw.length < 1) return res.json({ items: [] });

        try {
          const { rows } = await pool.query(
            `
            SELECT
              a.id::text AS id,
              a.name,
              a.full_name,
              a.name_display,
              a.first_name,
              a.last_name,
              a.abbr,
              coalesce(a.published_titles, 0)::int AS published_titles
            FROM public.authors a
            WHERE NULLIF(btrim(a.last_name), '') IS NOT NULL
              AND lower(btrim(a.last_name)) LIKE lower($1::text) || '%'
            ORDER BY
              lower(btrim(a.last_name)),
              lower(coalesce(a.name_display, a.full_name, a.name, '')),
              a.id
            LIMIT $2::int
            `,
            [qRaw, limit]
          );

          return res.json({ items: rows });
        } catch (e) {
          console.error("GET /api/admin/authors/lookup failed", e);
          return res.status(500).json({
            error: "authors_lookup_failed",
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

        const main = path.join(dir, `${id}.jpg`);
const raw = path.join(dir, `${id}-raw.jpg`);

await Promise.all([
  fs.writeFile(main, req.file.buffer),
  fs.writeFile(raw, req.file.buffer),
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
  await fs.unlink(raw);
} catch {}
            return res.status(404).json({ error: "book_not_found_for_cover", id });
          }

          return res.json({
            ok: true,
            id,
            bytes: req.file.buffer.length,
            cover: `/assets/covers${id}.jpg`,
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

        const isbn = String(req.query.isbn || "").trim().toUpperCase().replace(/[^0-9X]/g, "");
        const codeRaw = String(req.query.pages || req.query.code || "").trim();
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
            matches.push(`(
              regexp_replace(upper(coalesce(b.isbn13, '')), '[^0-9X]', '', 'g') = ${p}
              OR regexp_replace(upper(coalesce(b.isbn10, '')), '[^0-9X]', '', 'g') = ${p}
              OR regexp_replace(upper(coalesce(b.isbn13_raw, '')), '[^0-9X]', '', 'g') = ${p}
            )`);
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
              
            NULL::text AS author_abbreviation,
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
            ORDER BY b.registered_at DESC NULLS LAST, b.added_at DESC NULLS LAST
            LIMIT 20
          `;

          const r = await pool.query(q, params);
          const items = (r.rows || []).map((row) => ({
            ...row,
            width_cm: row.width != null ? row.width / 10 : null,
            height_cm: row.height != null ? row.height / 10 : null,
            coverUrl: `/assets/covers${row.id}.jpg`,
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


      // GET /api/admin/barcodes/occupancy
      router.get("/barcodes/occupancy", async (req, res) => {
        const pool = req.app.get("pgPool");
        if (!pool) return res.status(500).json({ error: "pgPool missing" });

        try {
          const r = await pool.query(
            `
              WITH normalized AS (
                SELECT
                  bi.barcode,
                  bi.status::text AS status,
                  bi.sizegroup,
                  bi.band,
                  lower(regexp_replace(bi.barcode, '[0-9]+$', '')) AS prefix,
                  NULLIF(substring(bi.barcode FROM '([0-9]+)$'), '')::int AS position
                FROM public.barcode_inventory bi
              ), grouped AS (
                SELECT
                  prefix,
                  sizegroup,
                  band,
                  count(*)::int AS total,
                  sum(CASE WHEN status = 'ASSIGNED' THEN 1 ELSE 0 END)::int AS taken,
                  sum(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS free,
                  sum(CASE WHEN status NOT IN ('AVAILABLE','ASSIGNED') THEN 1 ELSE 0 END)::int AS other,
                  min(position)::int AS first_position,
                  max(position)::int AS last_position,
                  min(position) FILTER (WHERE status = 'AVAILABLE')::int AS next_free_position,
                  (array_agg(barcode ORDER BY position NULLS LAST, barcode) FILTER (WHERE status = 'AVAILABLE'))[1] AS next_free_barcode,
                  (array_agg(barcode ORDER BY position NULLS LAST, barcode))[1] AS first_barcode,
                  (array_agg(barcode ORDER BY position DESC NULLS LAST, barcode DESC))[1] AS last_barcode
                FROM normalized
                WHERE prefix IS NOT NULL AND prefix <> ''
                GROUP BY prefix, sizegroup, band
              )
              SELECT
                prefix,
                sizegroup,
                band,
                total,
                taken,
                free,
                other,
                first_position,
                last_position,
                first_barcode,
                last_barcode,
                next_free_position,
                next_free_barcode,
                round((taken::numeric / NULLIF(total, 0)) * 100, 1)::float AS occupancy_percent,
                CASE
                  WHEN free = 0 THEN 'FULL'
                  WHEN (taken::numeric / NULLIF(total, 0)) >= 0.95 THEN 'ALMOST_FULL'
                  WHEN (taken::numeric / NULLIF(total, 0)) >= 0.85 THEN 'HIGH'
                  ELSE 'OK'
                END AS occupancy_status
              FROM grouped
              ORDER BY (taken::numeric / NULLIF(total, 0)) DESC NULLS LAST, free ASC, prefix ASC, sizegroup ASC NULLS LAST, band ASC NULLS LAST
            `
          );

          return res.json({ items: r.rows || [] });
        } catch (e) {
          console.error("barcode_occupancy_failed:", e);
          return res.status(500).json({
            error: "barcode_occupancy_failed",
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
    // GET /api/admin/authors/:authorId
    router.get("/authors/:authorId", async (req, res) => {
      const pool = req.app.get("pgPool");
      if (!pool) return res.status(500).json({ error: "pgPool missing" });

      try {
        const r = await pool.query(
          `
          SELECT *
          FROM public.authors
          WHERE id = $1::uuid
          LIMIT 1
          `,
          [req.params.authorId]
        );

        if (!r.rows[0]) return res.status(404).json({ error: "author_not_found" });

        res.json({ author: r.rows[0] });
      } catch (e) {
        res.status(500).json({ error: "author_load_failed", detail: String(e?.message || e) });
      }
    });

    // PATCH /api/admin/authors/:authorId
    router.patch("/authors/:authorId", async (req, res) => {
      const pool = req.app.get("pgPool");
      if (!pool) return res.status(500).json({ error: "pgPool missing" });

      const allowed = [
        "first_name",
        "last_name",
        "name_display",
        "author_nationality",
        "place_of_birth",
        "male_female",
        "published_titles",
        "number_of_millionsellers"
      ];

      const sets = [];
      const values = [];

      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
          values.push(req.body[key] === "" ? null : req.body[key]);
          sets.push(`${key} = $${values.length}`);
        }
      }

      if (!sets.length) return res.status(400).json({ error: "nothing_to_update" });

      values.push(req.params.authorId);

      try {
        const r = await pool.query(
          `
          UPDATE public.authors
          SET ${sets.join(", ")}
          WHERE id = $${values.length}::uuid
          RETURNING *
          `,
          values
        );

        if (!r.rows[0]) return res.status(404).json({ error: "author_not_found" });

        res.json({ author: r.rows[0] });
      } catch (e) {
        res.status(500).json({ error: "author_update_failed", detail: String(e?.message || e) });
      }
    });
   // Replace ONLY this route in backend/routes/admin.js:
// GET /api/admin/authors/:authorId/titles

router.get("/authors/:authorId/titles", async (req, res) => {
  const pool = req.app.get("pgPool");
  if (!pool) return res.status(500).json({ error: "pgPool missing" });

  const { authorId } = req.params;
  const status = String(req.query.status || "").trim();
  const topBookOnly = String(req.query.top_book || req.query.topBook || "").trim() === "1";

  try {
    const params = [authorId];

    let sql = `
      SELECT
        b.id::text AS id,
        b.title_display,
        b.reading_status,
        b.reading_status_updated_at,
        b.registered_at,
        b.added_at,
        COALESCE(b.top_book, false) AS top_book
      FROM public.books b
      WHERE b.author_id = $1::uuid
    `;

    if (status) {
      const statuses = status
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (statuses.length) {
        params.push(statuses);
        sql += ` AND b.reading_status = ANY($${params.length}::text[])`;
      }
    }

    if (topBookOnly) {
      sql += ` AND COALESCE(b.top_book, false) = true`;
    }

    sql += `
      ORDER BY
        COALESCE(b.reading_status_updated_at, b.registered_at, b.added_at) DESC NULLS LAST,
        LOWER(COALESCE(b.title_display, '')) ASC
    `;

    const { rows } = await pool.query(sql, params);

    res.json({
      items: rows.map((row) => ({
        ...row,
        reading_history: [
          {
            status: row.reading_status,
            date:
              row.reading_status_updated_at ||
              row.registered_at ||
              row.added_at,
          },
        ],
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/authors/:authorId/titles failed", e);
    res.status(500).json({
      error: "failed_to_load_author_titles",
      detail: String(e?.message || e),
    });
  }
});

    /* -------------------- abbreviation assignment -------------------- */

    function normalizeAbbrDotted(value) {
      const raw = String(value || "").trim().toLowerCase();
      const cleaned = raw.replace(/\s+/g, "");
      if (!cleaned) return "";
      return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
    }

    function normalizeAbbrBare(value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/\.+$/g, "");
    }

   async function findAuthorAssignment(pool, abbrInput) {
  const dotted = normalizeAbbrDotted(abbrInput);
  if (!dotted) return null;

  const r = await pool.query(
    `
    SELECT
      $1::text AS abbr_norm,
      a.name AS full_name,
      a.id::text AS current_author_id,
      a.name AS current_author_name,
      a.name_display AS current_name_display,
      a.full_name AS current_author_full_name,
      a.first_name AS current_first_name,
      a.last_name AS current_last_name,
      a.abbr AS current_abbr
    FROM public.authors a
    WHERE lower(a.abbr) = lower($1)
    ORDER BY lower(coalesce(a.name_display, a.full_name, a.name, ''))
    LIMIT 1
    `,
    [dotted]
  );

  return r.rows[0] || null;
} 
    async function getAuthorForAbbreviation(pool, authorId) {
      const r = await pool.query(
        `
        SELECT
          id::text AS id,
          name,
          full_name,
          name_display,
          first_name,
          last_name,
          abbr
        FROM public.authors
        WHERE id = $1::uuid
        LIMIT 1
        `,
        [authorId]
      );
      return r.rows[0] || null;
    }

    function abbreviationItemFromAuthor(abbrNorm, author) {
      if (!author) return null;
      return {
        abbr_norm: abbrNorm,
        full_name: author.name || author.name_display || author.full_name,
        current_author_id: author.id,
        current_author_name: author.name,
        current_full_name: author.name || author.name_display || author.full_name,
        current_name_display: author.name_display || author.full_name || author.name,
        current_author_full_name: author.full_name,
        current_first_name: author.first_name,
        current_last_name: author.last_name,
        current_abbr: abbrNorm || author.abbr,
      };
    }

    // GET /api/admin/abbreviations?level=1&limit=2000&q=a
    router.get("/abbreviations", async (req, res) => {
      const pool = req.app.get("pgPool");
      if (!pool) return res.status(500).json({ error: "pgPool missing" });

      const level = clampInt(req.query.level, { min: 1, max: 10, def: 1 });
      const limit = clampInt(req.query.limit, { min: 1, max: 5000, def: 2000 });
      const q = String(req.query.q || "").trim().toLowerCase();

      try {
        const params = [level, limit];
        let qFilter = "";
        if (q) {
          params.push(`%${q}%`);
          qFilter = `
            AND (
              x.abbr_norm ILIKE $3
              OR x.full_name ILIKE $3
            )
          `;
        }

        const r = await pool.query(
          `
          WITH all_rows AS (
            SELECT abbr_norm, full_name, 'author_aliases'::text AS source
            FROM public.author_aliases
            UNION ALL
            SELECT abbr_norm, full_name, 'abbrev_map'::text AS source
            FROM public.abbrev_map
            WHERE full_name IS NOT NULL
          ), dedup AS (
            SELECT DISTINCT ON (regexp_replace(abbr_norm, '\\.+$', ''))
              CASE
                WHEN abbr_norm LIKE '%.%' THEN abbr_norm
                ELSE abbr_norm || '.'
              END AS abbr_norm,
              full_name,
              source
            FROM all_rows
            WHERE abbr_norm IS NOT NULL
              AND btrim(abbr_norm) <> ''
            ORDER BY regexp_replace(abbr_norm, '\\.+$', ''),
              CASE WHEN source = 'author_aliases' THEN 0 ELSE 1 END
          )
          SELECT
            x.abbr_norm,
            x.full_name AS current_full_name,
            x.full_name,
            x.source
          FROM dedup x
          WHERE char_length(regexp_replace(x.abbr_norm, '[^[:alnum:]]+', '', 'g')) = $1::int
          ${qFilter}
          ORDER BY lower(x.abbr_norm)
          LIMIT $2::int
          `,
          params
        );

        return res.json({ items: r.rows || [] });
      } catch (e) {
        console.error("GET /api/admin/abbreviations failed", e);
        return res.status(500).json({
          error: "abbreviations_list_failed",
          detail: String(e?.message || e),
        });
      }
    });

    // GET /api/admin/abbreviations/:abbrNorm
    router.get("/abbreviations/:abbrNorm", async (req, res) => {
      const pool = req.app.get("pgPool");
      if (!pool) return res.status(500).json({ error: "pgPool missing" });

      try {
        const item = await findAuthorAssignment(pool, req.params.abbrNorm);
        return res.json({ item });
      } catch (e) {
        console.error("GET /api/admin/abbreviations/:abbrNorm failed", e);
        return res.status(500).json({
          error: "abbreviation_lookup_failed",
          detail: String(e?.message || e),
        });
      }
    });

    // PATCH /api/admin/abbreviations/:abbrNorm
    router.patch("/abbreviations/:abbrNorm", async (req, res) => {
      const pool = req.app.get("pgPool");
      if (!pool) return res.status(500).json({ error: "pgPool missing" });

      const abbrNorm = normalizeAbbrDotted(req.params.abbrNorm);
      const bare = normalizeAbbrBare(req.params.abbrNorm);
      const authorId = String(req.body?.authorId || req.body?.author_id || "").trim();

      let author = null;
      let fullName = String(
        req.body?.full_name ||
          req.body?.fullName ||
          req.body?.name_display ||
          req.body?.authorName ||
          ""
      ).trim();

      try {
        if (authorId) {
          author = await getAuthorForAbbreviation(pool, authorId);
          if (!author) return res.status(404).json({ error: "author_not_found" });
          // Store the canonical machine name when available, because old rows use values like "archer".
          fullName = author.name || author.name_display || author.full_name || fullName;
        }

        if (!abbrNorm || !fullName) {
          return res.status(400).json({ error: "missing_abbr_or_author" });
        }
      } catch (e) {
        return res.status(500).json({ error: "author_lookup_failed", detail: String(e?.message || e) });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Keep public.authors.abbr in sync with author_aliases/abbrev_map.
        // This moves the abbreviation from the old owner to the selected author atomically.
        if (authorId) {
          await client.query(
            `
            UPDATE public.authors
            SET abbr = NULL
            WHERE lower(abbr) = lower($1)
              AND id <> $2::uuid
            `,
            [abbrNorm, authorId]
          );

          await client.query(
            `
            UPDATE public.authors
            SET abbr = $1
            WHERE id = $2::uuid
            `,
            [abbrNorm, authorId]
          );

          author.abbr = abbrNorm;
        }

        await client.query(
          `
          INSERT INTO public.author_aliases (abbr_norm, full_name)
          VALUES ($1, $2)
          ON CONFLICT (abbr_norm)
          DO UPDATE SET full_name = excluded.full_name
          `,
          [abbrNorm, fullName]
        );

        await client.query(
          `
          INSERT INTO public.abbrev_map (abbr_norm, full_name, "type", abbr_raw, "full")
          VALUES ($1, $2, 'author', $1, $2)
          ON CONFLICT (abbr_norm)
          DO UPDATE SET
            full_name = excluded.full_name,
            "type" = excluded."type",
            abbr_raw = excluded.abbr_raw,
            "full" = excluded."full"
          `,
          [abbrNorm, fullName]
        );

        if (bare && bare !== abbrNorm) {
          await client.query(
            `DELETE FROM public.author_aliases WHERE abbr_norm = $1`,
            [bare]
          );
          await client.query(
            `DELETE FROM public.abbrev_map WHERE abbr_norm = $1`,
            [bare]
          );
        }

        await client.query("COMMIT");
        const item = author
          ? abbreviationItemFromAuthor(abbrNorm, author)
          : await findAuthorAssignment(pool, abbrNorm);
        return res.json({ ok: true, item });
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        console.error("PATCH /api/admin/abbreviations/:abbrNorm failed", e);
        return res.status(500).json({
          error: "abbreviation_update_failed",
          detail: String(e?.message || e),
        });
      } finally {
        client.release();
      }
    });
/* -------------------- free author assignment -------------------- */

// GET /api/admin/author-assignment/books?q=wanderhure
router.get("/author-assignment/books", async (req, res) => {
  const pool = req.app.get("pgPool");
  if (!pool) return res.status(500).json({ error: "pgPool missing" });

  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.json({ items: [] });

  try {
    const result = await pool.query(
      `
        SELECT

    MIN(b.id::text) AS id,

    b.title_display,

    COUNT(*)::int AS book_count,

    a.id::text AS current_author_id,

    a.name_display AS current_author

  FROM public.books b

  LEFT JOIN public.authors a ON a.id = b.author_id

  WHERE b.title_display ILIKE $1

  GROUP BY b.title_display, a.id, a.name_display

  ORDER BY b.title_display

  LIMIT 30
      `,
      [`%${q}%`]
    );

    res.json({ items: result.rows });
  } catch (e) {
    res.status(500).json({
      error: "book_assignment_search_failed",
      detail: String(e?.message || e),
    });
  }
});

// GET /api/admin/author-assignment/authors?q=archer
router.get("/author-assignment/authors", async (req, res) => {
  const pool = req.app.get("pgPool");
  if (!pool) return res.status(500).json({ error: "pgPool missing" });

  const q = String(req.query.q || "").trim();
  if (q.length < 1) return res.json({ items: [] });

  try {
    const result = await pool.query(
      `
      SELECT
        id::text AS id,
        name_display,
        first_name,
        last_name,
        abbr
      FROM public.authors
      WHERE
        name_display ILIKE $1
        OR last_name ILIKE $1
        OR abbr ILIKE $1
      ORDER BY name_display
      LIMIT 30
      `,
      [`%${q}%`]
    );

    res.json({ items: result.rows });
  } catch (e) {
    res.status(500).json({
      error: "author_assignment_search_failed",
      detail: String(e?.message || e),
    });
  }
});

// POST /api/admin/author-assignment/assign
router.post("/author-assignment/assign", async (req, res) => {
  const pool = req.app.get("pgPool");
  if (!pool) return res.status(500).json({ error: "pgPool missing" });

  const titleDisplay = String(req.body?.title_display || "").trim();
  const authorId = String(req.body?.author_id || "").trim();

  if (!titleDisplay || !authorId) {
    return res.status(400).json({ error: "missing_title_or_author" });
  }

  try {
    const result = await pool.query(
      `
      UPDATE public.books b
      SET
        author_id = $1::uuid,
        authors_number = 1
      FROM public.authors a
      WHERE b.title_display = $2
        AND a.id = $1::uuid
      RETURNING
        b.id::text AS book_id,
        b.title_display,
        a.id::text AS author_id,
        a.name_display AS author_name_display
      `,
      [authorId, titleDisplay]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "title_or_author_not_found" });
    }

    res.json({
      ok: true,
      updated: result.rowCount,
      item: result.rows[0],
    });
  } catch (e) {
    res.status(500).json({
      error: "author_assignment_failed",
      detail: String(e?.message || e),
    });
  }
});
// GET /api/admin/highlights/received-candidates
router.get("/highlights/received-candidates", async (req, res) => {
  const pool = req.app.get("pgPool");
  if (!pool) {
    return res.status(500).json({ error: "pgPool missing" });
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        id::text AS id,
        title_display,
        title_keyword,
        pages,
        added_at,
        raw->'capture'->>'receivedCandidate' AS received_candidate
      FROM public.books
      WHERE raw->'capture'->>'receivedCandidate' = 'true'
      ORDER BY added_at DESC NULLS LAST
      LIMIT 100
    `);

    res.json({ items: rows });
  } catch (err) {
    console.error(
      "GET /api/admin/highlights/received-candidates error",
      err
    );

    res.status(500).json({
      error: "internal_error",
      detail: String(err?.message || err),
    });
  }
});

router.post("/books/:id/make-highlight", async (req, res) => {
  const pool = req.app.get("pgPool");
  if (!pool) {
    return res.status(500).json({ error: "pgPool missing" });
  }

  const id = String(req.params.id || "").trim();

  try {
    // close current received highlight
    await pool.query(`
      UPDATE public.highlights
      SET presented_till = now()
      WHERE presented_as = 'received'
        AND presented_till IS NULL
    `);

    // create new received highlight
    await pool.query(
      `
      INSERT INTO public.highlights (
        presented_as,
        book_id,
        presented_at,
        source
      )
      VALUES (
        'received',
        $1::uuid,
        now(),
        'manual'
      )
      `,
      [id]
    );
// 1 close old received highlight

// 2 insert new received highlight

// 3 clear previous homepage received slot
await pool.query(`
  UPDATE public.books
  SET home_featured_slot = NULL
  WHERE home_featured_slot = 'received'
`);

// 4 set this book as homepage received
await pool.query(
  `
  UPDATE public.books
  SET home_featured_slot = 'received',
      received_at = now()
  WHERE id = $1::uuid
  `,
  [id]
);

// 5 remove from candidate queue
    // remove from candidate queue
    await pool.query(
      `
      UPDATE public.books
      SET raw = jsonb_set(
        coalesce(raw, '{}'::jsonb),
        '{capture}',
        coalesce(raw->'capture', '{}'::jsonb)
          - 'receivedCandidate',
        true
      )
      WHERE id = $1::uuid
      `,
      [id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("make-highlight failed", err);

    res.status(500).json({
      error: "make_highlight_failed",
      detail: String(err?.message || err),
    });
  }
});
// POST /api/admin/books/:id/assign-author
// Reassign a selected book/title to the chosen author.
router.post("/books/:id/assign-author", async (req, res) => {
  const pool = req.app.get("pgPool");
  if (!pool) return res.status(500).json({ error: "pgPool missing" });

  const bookId = String(req.params.id || "").trim();
  const authorId = String(req.body?.authorId || "").trim();

  if (!bookId || !authorId) {
    return res.status(400).json({ error: "missing_book_or_author" });
  }

  try {
    const upd = await pool.query(
      `
      UPDATE public.books
      SET author_id = $2::uuid,
          updated_at = now()
      WHERE id = $1::uuid
      RETURNING id::text, title_display, author_id::text
      `,
      [bookId, authorId]
    );

    if (!upd.rowCount) return res.status(404).json({ error: "book_not_found" });

    return res.json({ ok: true, item: upd.rows[0] });
  } catch (e) {
    console.error("POST /api/admin/books/:id/assign-author failed", e);
    return res.status(500).json({
      error: "assign_author_failed",
      detail: String(e?.message || e),
    });
  }
});

module.exports = router;
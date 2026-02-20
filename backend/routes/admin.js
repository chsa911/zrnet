  // backend/routes/admin.js
  const express = require("express");
  const router = express.Router();
  const { adminAuthRequired, adminLogin, adminLogout } = require("../middleware/adminAuth");

  function cmToMm(v) {
    const n = Number(String(v).replace(",", "."));
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 10);
  }

  // pos: d (down), l (left/exact heights), o (oben/high)
  function posToBand(pos) {
    if (pos === "l") return "special";
    if (pos === "d") return "low";
    return "high"; // pos === "o"
  }

  function clampInt(v, { min = 1, max = 200, def = 50 } = {}) {
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
    const eq = Array.isArray(rule.eq_heights) && rule.eq_heights.length
      ? rule.eq_heights
      : [205, 210, 215];

    if (eq.includes(heightMm)) return "l";
    if (heightMm <= Number(rule.min_height)) return "d";
    return "o";
  }

  /**
   * Pick lowest-ranked AVAILABLE barcode from inventory for (sizegroup, band).
   * sizegroup is assumed to equal size_rules.id (your ids are 2..21, matching your CSV).
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

  /* -------------------- comments moderation -------------------- */

  function clampOffset(v, { min = 0, max = 1000000, def = 0 } = {}) {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.max(min, Math.min(max, Math.trunc(n)));
  }

  // GET /api/admin/comments?status=pending|approved|rejected|spam&bookId=<uuid>&page=1&limit=50
  router.get("/comments", async (req, res) => {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const statusRaw = String(req.query?.status || "").trim().toLowerCase();
    const status = statusRaw && ["pending", "approved", "rejected", "spam"].includes(statusRaw)
      ? statusRaw
      : null;

    const bookId = String(req.query?.bookId || req.query?.book_id || "").trim() || null;

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
      return res.status(500).json({ error: "comments_list_failed", detail: String(e?.message || e) });
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
      return res.status(500).json({ error: "approve_failed", detail: String(e?.message || e) });
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
      return res.status(500).json({ error: "reject_failed", detail: String(e?.message || e) });
    }
  });

  /* -------------------- barcode dashboard -------------------- */

  // GET /api/admin/barcodes/summary
  // Returns counts for dashboard cards.
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

      // Optional consistency checks (helpful when debugging sync triggers)
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
        mismatch: mismatch.rows[0] || { assigned_without_open: 0, open_without_assigned: 0 },
      });
    } catch (e) {
      return res
        .status(500)
        .json({ error: "barcode_summary_failed", detail: String(e?.message || e) });
    }
  });

  // GET /api/admin/barcodes
  // Query: status=AVAILABLE|ASSIGNED|... , q=<search>, page=<n>, limit=<n>
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
      return res
        .status(500)
        .json({ error: "barcode_list_failed", detail: String(e?.message || e) });
    }
  });

  router.post("/register", async (req, res) => {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const widthMm = cmToMm(req.body?.width_cm);
    const heightMm = cmToMm(req.body?.height_cm);
    if (widthMm == null || heightMm == null) {
      return res.status(400).json({ error: "width_cm/height_cm required" });
    }

    const pages =
      req.body?.pages === null || req.body?.pages === undefined || req.body?.pages === ""
        ? null
        : Number(req.body.pages);

    const title = req.body?.title ? String(req.body.title) : null;
    const author = req.body?.author ? String(req.body.author) : null;
    const publisher = req.body?.publisher ? String(req.body.publisher) : null;

    const sizeRule = await pickSizeRule(pool, widthMm, heightMm);
    if (!sizeRule) {
      return res.status(400).json({
        error: "No size_rule matches these dimensions",
        width_mm: widthMm,
        height_mm: heightMm,
      });
    }

    const pos = computePos(sizeRule, heightMm);
    const band = posToBand(pos);

    const picked = await pickBarcode(pool, sizeRule.id, band);
    if (!picked) {
      return res.status(400).json({
        error: "No available barcode for this sizegroup/band",
        size_rule_id: sizeRule.id,
        size_rule_name: sizeRule.name,
        band,
        pos
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1) Create book
      const b = await client.query(
        `
        INSERT INTO public.books (
          width, height, pages,
          full_title, author_display, author, publisher,
          reading_status, registered_at
        )
        VALUES ($1,$2,$3,$4,$5,$5,$6,'in_progress', now())
        RETURNING id, registered_at
        `,
        [widthMm, heightMm, Number.isFinite(pages) ? pages : null, title, author, publisher]
      );

      const bookId = b.rows[0].id;
      const registeredAt = b.rows[0].registered_at;

      // 2) Mark inventory assigned (and stamp size_rule_id for traceability)
      const upd = await client.query(
        `
        UPDATE public.barcode_inventory
        SET status='ASSIGNED', updated_at=now(), size_rule_id=$2
        WHERE barcode=$1
        `,
        [picked.barcode, sizeRule.id]
      );

      if (upd.rowCount !== 1) {
        throw new Error("barcode_inventory_update_failed");
      }

      // 3) Create open assignment period (freed_at NULL = currently assigned)
      await client.query(
        `
        INSERT INTO public.barcode_assignments (barcode, book_id, assigned_at, freed_at)
        VALUES ($1,$2,$3,NULL)
        `,
        [picked.barcode, bookId, registeredAt]
      );

      await client.query("COMMIT");

      return res.json({
        ok: true,
        book_id: bookId,
        barcode: picked.barcode,
        rank: picked.rank_in_inventory,
        size_rule: { id: sizeRule.id, name: sizeRule.name },
        band,
        pos,
        width_mm: widthMm,
        height_mm: heightMm,
      });
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      return res.status(500).json({ error: "register_failed", detail: String(e?.message || e) });
    } finally {
      client.release();
    }
  });

  /* -------------------- needs_review (mobile app) -------------------- */

  /**
   * List items that were written by the mobile app with status = needs_review.
   *
   * GET /api/admin/needs-review?issue_status=open|resolved|discarded|all&page=1&limit=50&q=...
   */
  router.get("/needs-review", async (req, res) => {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const page = clampInt(req.query.page, { min: 1, max: 100000, def: 1 });
    const limit = clampInt(req.query.limit, { min: 1, max: 200, def: 50 });
    const offset = (page - 1) * limit;

    const issueStatus = String(req.query.issue_status || "open").trim().toLowerCase();
    const q = String(req.query.q || "").trim();

    // If the mobile_sync tables were never created yet (no mobile sync happened), return empty list.
    // (Avoid hard failing on fresh installs.)
    try {
      const where = [];
      const params = [];
      let i = 1;

      where.push("r.status = 'needs_review'");

      if (issueStatus && issueStatus !== "all") {
        // issue may be NULL if receipt has no issue_id; treat as open
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
      // Fresh DB: schema/table might not exist yet.
      const msg = String(e?.message || e);
      if (/mobile_sync\./i.test(msg) && /(does not exist|undefined table|relation)/i.test(msg)) {
        return res.json({ items: [], total: 0, page, limit });
      }
      return res.status(500).json({ error: "needs_review_failed", detail: msg });
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

    const statusRaw = String(req.body?.status || "resolved").trim().toLowerCase();
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

      if (r.rowCount !== 1) return res.status(404).json({ error: "issue_not_found" });

      return res.json({ ok: true, issue: r.rows[0] });
    } catch (e) {
      return res.status(500).json({ error: "issue_update_failed", detail: String(e?.message || e) });
    }
  });

  module.exports = router;
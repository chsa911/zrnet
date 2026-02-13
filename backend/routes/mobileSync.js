  // backend/routes/mobileSync.js

  const express = require("express");
  const router = express.Router();
  const { adminAuthRequired } = require("../middleware/adminAuth");

  function getPool(req) {
    const pool = req.app.get("pgPool");
    if (!pool) throw new Error("pgPool missing on app");
    return pool;
  }

  function normStatus(s) {
    if (!s) return null;
    const x = String(s).trim().toLowerCase();
    if (x === "open" || x === "inprogress" || x === "in-progress") return "in_progress";
    if (x === "in_progress" || x === "finished" || x === "abandoned") return x;
    return x;
  }

  function parseIntOrNull(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }

  function parseTs(v) {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  function clampInt(v, { min = 1, max = 200, def = 50 } = {}) {
    const n = Number(v);
    if (!Number.isFinite(n)) return def;
    return Math.max(min, Math.min(max, Math.trunc(n)));
  }

  // ---- sync tolerances ----
  const PAGE_TOLERANCE = Number(process.env.PAGE_TOLERANCE ?? 10);

  function pagesDiff(a, b) {
    if (a === null || a === undefined || b === null || b === undefined) return null;
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isFinite(na) || !Number.isFinite(nb)) return null;
    return Math.abs(na - nb);
  }

  function pagesWithinTolerance(a, b, tol = PAGE_TOLERANCE) {
    const d = pagesDiff(a, b);
    return d !== null && d <= tol;
  }

  // ---- schema bootstrap (safe to run repeatedly) ----
  let ensured = false;

  async function ensureMobileSyncTables(client) {
    if (ensured) return;

    await client.query(`CREATE SCHEMA IF NOT EXISTS mobile_sync`);
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS mobile_sync.issues (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        created_at timestamptz NOT NULL DEFAULT now(),
        status text NOT NULL DEFAULT 'open', -- open|resolved|discarded
        reason text NOT NULL,

        client_change_id text NOT NULL UNIQUE,
        barcode text NOT NULL,
        pages int4 NULL,

        candidate_book_ids uuid[] NULL,
        details jsonb NULL,
        payload jsonb NOT NULL,

        note text NULL,
        resolved_at timestamptz NULL,
        resolved_by text NULL
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mobile_sync_issues_created
      ON mobile_sync.issues (created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mobile_sync_issues_status
      ON mobile_sync.issues (status)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS mobile_sync.receipts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        client_change_id text NOT NULL UNIQUE,
        received_at timestamptz NOT NULL DEFAULT now(),
        status text NOT NULL, -- applied|needs_review

        barcode text NOT NULL,
        book_id uuid NULL,

        pages int4 NULL,
        reading_status text NULL,
        reading_status_updated_at timestamptz NULL,

        top_book boolean NULL,
        topbook_set_at timestamptz NULL,

        issue_id uuid NULL,
        payload jsonb NOT NULL
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mobile_sync_receipts_received
      ON mobile_sync.receipts (received_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mobile_sync_receipts_status
      ON mobile_sync.receipts (status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mobile_sync_receipts_barcode
      ON mobile_sync.receipts (lower(barcode))
    `);

    // Make sure books has the columns we need for mobile timestamps
    await client.query(`
      ALTER TABLE public.books
        ADD COLUMN IF NOT EXISTS reading_status_updated_at timestamptz
    `);

    await client.query(`
      ALTER TABLE public.books
        ADD COLUMN IF NOT EXISTS topbook_set_at timestamptz
    `);

    ensured = true;
  }

  async function receiptExists(client, clientChangeId) {
    const r = await client.query(
      `SELECT 1 FROM mobile_sync.receipts WHERE client_change_id = $1 LIMIT 1`,
      [clientChangeId]
    );
    return r.rowCount > 0;
  }

  async function writeIssueAndReceipt(client, change, parsed, reason, details, candidateBookIds) {
    const { clientChangeId, barcode, pages } = parsed;

    const issue = await client.query(
      `
      INSERT INTO mobile_sync.issues (
        reason, client_change_id, barcode, pages, candidate_book_ids, details, payload
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (client_change_id) DO UPDATE
        SET reason = EXCLUDED.reason
      RETURNING id
      `,
      [reason, clientChangeId, barcode, pages, candidateBookIds || null, details || null, change]
    );

    const issueId = issue.rows[0]?.id || null;

    await client.query(
      `
      INSERT INTO mobile_sync.receipts (
        client_change_id, status, barcode, book_id,
        pages, reading_status, reading_status_updated_at,
        top_book, topbook_set_at,
        issue_id, payload
      )
      VALUES (
        $1,'needs_review',$2,$3,
        $4::int4,$5::text,$6::timestamptz,
        $7::boolean,$8::timestamptz,
        $9::uuid,$10::jsonb
      )
      ON CONFLICT (client_change_id) DO NOTHING
      `,
      [
        parsed.clientChangeId,
        parsed.barcode,
        null,
        parsed.pages,
        parsed.readingStatus,
        parsed.rsUpdatedAt,
        parsed.topBook,
        parsed.topBookSetAt,
        issueId,
        change,
      ]
    );
  }

  async function writeAppliedReceipt(client, change, parsed, bookId) {
    await client.query(
      `
      INSERT INTO mobile_sync.receipts (
        client_change_id, status, barcode, book_id,
        pages, reading_status, reading_status_updated_at,
        top_book, topbook_set_at,
        issue_id, payload
      )
      VALUES (
        $1,'applied',$2,$3::uuid,
        $4::int4,$5::text,$6::timestamptz,
        $7::boolean,$8::timestamptz,
        NULL,$9::jsonb
      )
      ON CONFLICT (client_change_id) DO NOTHING
      `,
      [
        parsed.clientChangeId,
        parsed.barcode,
        bookId,
        parsed.pages,
        parsed.readingStatus,
        parsed.rsUpdatedAt,
        parsed.topBook,
        parsed.topBookSetAt,
        change,
      ]
    );
  }

  async function updateBookFromMobile(client, bookId, parsed) {
    const { pages, readingStatus, rsUpdatedAt, topBook, topBookSetAt } = parsed;

    await client.query(
      `
      UPDATE public.books
      SET
        pages = COALESCE($2::int4, pages),

        reading_status = COALESCE($3::text, reading_status),
        reading_status_updated_at = COALESCE($4::timestamptz, reading_status_updated_at),

        top_book = COALESCE($5::boolean, top_book),
        topbook_set_at =
          CASE
            WHEN $5::boolean IS TRUE
              AND top_book IS DISTINCT FROM TRUE
              AND ($6::timestamptz) IS NOT NULL
              THEN $6::timestamptz
            WHEN $5::boolean IS FALSE
              THEN NULL::timestamptz
            ELSE topbook_set_at
          END
      WHERE id = $1::uuid
      `,
      [bookId, pages, readingStatus, rsUpdatedAt, topBook, topBookSetAt]
    );
  }

  /**
   * APPLY-OR-ISSUE MOBILE SYNC (push-only)
   *
   * POST /api/mobile-sync/sync
   * Body: { changes: [{ clientChangeId, barcode, pages?, readingStatus, reading_status_updated_at, topBook?, topbook_set_at? , ...}] }
   */
  router.post("/sync", async (req, res) => {
    const pool = getPool(req);
    const changes = Array.isArray(req.body?.changes) ? req.body.changes : [];
    if (changes.length === 0) return res.json({ applied: [], failed: [] });
    if (changes.length > 50) return res.status(400).json({ error: "too_many_changes" });

    const applied = [];
    const failed = [];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureMobileSyncTables(client);

      for (const c of changes) {
        const clientChangeId = String(c.clientChangeId || c.client_change_id || "").trim();
        const barcode = String(c.barcode || "").trim();
        const pages = parseIntOrNull(c.pages);

        const readingStatus = normStatus(c.readingStatus || c.reading_status);
        const rsUpdatedAt = parseTs(
          c.reading_status_updated_at ||
            c.readingStatusUpdatedAt ||
            c.readingStatusChangedAt ||
            c.reading_status_changed_at
        );

        const topBook =
          c.topBook === true || c.topBook === false
            ? c.topBook
            : c.top_book === true || c.top_book === false
            ? c.top_book
            : null;

        const topBookSetAt = parseTs(c.topbook_set_at || c.topBookSetAt || c.top_book_set_at);

        if (!clientChangeId || !barcode || !readingStatus || !rsUpdatedAt) {
          failed.push({ clientChangeId: clientChangeId || null, error: "INVALID_PAYLOAD" });
          continue;
        }

        // Idempotency
        if (await receiptExists(client, clientChangeId)) {
          applied.push(clientChangeId);
          continue;
        }

        const parsed = {
          clientChangeId,
          barcode,
          pages,
          readingStatus,
          rsUpdatedAt,
          topBook,
          topBookSetAt,
        };

        // ✅ Auto-resolve duplicates: if we already applied same barcode+timestamp before, reuse that book_id
        const dup = await client.query(
          `
          SELECT book_id
          FROM mobile_sync.receipts
          WHERE status = 'applied'
            AND lower(barcode) = lower($1)
            AND reading_status_updated_at = $2::timestamptz
            AND book_id IS NOT NULL
          ORDER BY received_at DESC
          LIMIT 1
          `,
          [barcode, rsUpdatedAt]
        );

        if (dup.rowCount === 1) {
          const bookId = dup.rows[0].book_id;
          await updateBookFromMobile(client, bookId, parsed);
          await writeAppliedReceipt(client, c, parsed, bookId);
          applied.push(clientChangeId);
          continue;
        }

        // 1) find active assignments for barcode
        const cand = await client.query(
          `
          SELECT book_id
          FROM public.barcode_assignments
          WHERE lower(barcode) = lower($1)
            AND freed_at IS NULL
          ORDER BY assigned_at DESC NULLS LAST
          LIMIT 50
          `,
          [barcode]
        );

        const candidates = cand.rows.map((r) => r.book_id).filter(Boolean);

        if (candidates.length === 0) {
          await writeIssueAndReceipt(
            client,
            c,
            parsed,
            "barcode_not_found",
            { note: "No active barcode_assignments for barcode" },
            null
          );
          applied.push(clientChangeId);
          continue;
        }

        async function fetchCandidatePages(ids) {
          const r = await client.query(
            `SELECT id, pages FROM public.books WHERE id = ANY($1::uuid[])`,
            [ids]
          );
          const map = new Map();
          for (const row of r.rows) map.set(row.id, row.pages === null ? null : Number(row.pages));
          return map;
        }

        let chosenBookId = null;

        if (candidates.length === 1) {
          chosenBookId = candidates[0];
        } else {
          // multiple candidates: pages MUST be present
          if (pages === null) {
            await writeIssueAndReceipt(
              client,
              c,
              parsed,
              "barcode_ambiguous_missing_pages",
              { candidate_count: candidates.length },
              candidates
            );
            applied.push(clientChangeId);
            continue;
          }

          const pagesMap = await fetchCandidatePages(candidates);
          const matches = candidates.filter((id) => pagesMap.get(id) !== null && pagesWithinTolerance(pagesMap.get(id), pages));

          if (matches.length === 1) {
            chosenBookId = matches[0];
          } else {
            await writeIssueAndReceipt(
              client,
              c,
              parsed,
              "barcode_ambiguous_pages_no_unique_match",
              {
                candidate_count: candidates.length,
                incoming_pages: pages,
                matching_candidates: matches,
              },
              candidates
            );
            applied.push(clientChangeId);
            continue;
          }
        }

        // 2) chosen book exists?
        const book = await client.query(
          `SELECT id, pages, top_book FROM public.books WHERE id = $1::uuid LIMIT 1`,
          [chosenBookId]
        );

        if (book.rowCount !== 1) {
          await writeIssueAndReceipt(
            client,
            c,
            parsed,
            "book_not_found",
            { chosen_book_id: chosenBookId },
            candidates.length > 1 ? candidates : [chosenBookId]
          );
          applied.push(clientChangeId);
          continue;
        }

        const existingPages = book.rows[0].pages === null ? null : Number(book.rows[0].pages);

        // 3) pages mismatch check
        if (pages !== null && existingPages !== null && !pagesWithinTolerance(pages, existingPages)) {
          const diff = pagesDiff(pages, existingPages);
          await writeIssueAndReceipt(
            client,
            c,
            parsed,
            "pages_mismatch",
            {
              chosen_book_id: chosenBookId,
              expected_pages: existingPages,
              incoming_pages: pages,
              diff,
              tolerance: PAGE_TOLERANCE,
            },
            candidates.length > 1 ? candidates : [chosenBookId]
          );
          applied.push(clientChangeId);
          continue;
        }

        // 4) topbook timestamp requirement when setting to true on a book that is not already true
        const alreadyTop = book.rows[0].top_book === true;
        if (topBook === true && !alreadyTop && !topBookSetAt) {
          await writeIssueAndReceipt(
            client,
            c,
            parsed,
            "topbook_missing_timestamp",
            { chosen_book_id: chosenBookId },
            candidates.length > 1 ? candidates : [chosenBookId]
          );
          applied.push(clientChangeId);
          continue;
        }

        // 5) Apply update immediately
        await updateBookFromMobile(client, chosenBookId, parsed);
        await writeAppliedReceipt(client, c, parsed, chosenBookId);

        applied.push(clientChangeId);
      }

      await client.query("COMMIT");
      res.json({ applied, failed });
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      res.status(500).json({ error: "sync_failed", detail: String(e?.message || e) });
    } finally {
      client.release();
    }
  });

  // --------------------------------------------------------------------------
  // Admin helper endpoints (cookie-authenticated)
  // --------------------------------------------------------------------------

  // GET /api/mobile-sync/needs-review?issue_status=open|resolved|discarded|all&page=1&limit=50&q=...
  async function listNeedsReview(req, res) {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const page = clampInt(req.query.page, { min: 1, max: 100000, def: 1 });
    const limit = clampInt(req.query.limit, { min: 1, max: 200, def: 50 });
    const offset = (page - 1) * limit;
    const issueStatus = String(req.query.issue_status || "open").trim().toLowerCase();
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

      const items = (itemsRes.rows || []).map((row) => {
        const rp = row.receipt_payload || {};
        const ip = row.issue_payload || {};

        const pick = (...vals) => {
          for (const v of vals) {
            if (v === undefined || v === null) continue;
            if (typeof v === "string" && v.trim() === "") continue;
            return v;
          }
          return null;
        };

        const barcode = pick(row.barcode, ip.barcode, rp.barcode, rp.isbn, ip.isbn, rp?.change?.barcode, ip?.change?.barcode);
        const pages = pick(row.pages, ip.pages, rp.pages);

        const status = pick(
          row.reading_status,
          rp.readingStatus,
          rp.reading_status,
          ip.readingStatus,
          ip.reading_status
        );

        const updated_at = pick(
          row.reading_status_updated_at,
          rp.reading_status_updated_at,
          rp.readingStatusUpdatedAt,
          rp.readingStatusChangedAt,
          rp.updated_at,
          row.received_at,
          row.issue_created_at
        );

        const receipt = {
          receipt_id: row.receipt_id,
          receiptId: row.receipt_id,
          client_change_id: row.client_change_id,
          clientChangeId: row.client_change_id,
          received_at: row.received_at,
          receivedAt: row.received_at,
          barcode,
          pages,
          reading_status: row.reading_status,
          readingStatus: status,
          reading_status_updated_at: row.reading_status_updated_at,
          readingStatusUpdatedAt: updated_at,
          top_book: row.top_book,
          topBook: row.top_book,
          topbook_set_at: row.topbook_set_at,
          topBookSetAt: row.topbook_set_at,
          payload: row.receipt_payload,
        };

        const issue = row.issue_id
          ? {
              issue_id: row.issue_id,
              issueId: row.issue_id,
              status: row.issue_status || "open",
              issue_status: row.issue_status || "open",
              issueStatus: row.issue_status || "open",
              reason: row.reason || null,
              candidate_book_ids: row.candidate_book_ids || null,
              candidateBookIds: row.candidate_book_ids || null,
              details: row.details || null,
              note: row.note || null,
              created_at: row.issue_created_at || null,
              createdAt: row.issue_created_at || null,
              payload: row.issue_payload,
            }
          : null;

        const incoming = {
          direction: "Incoming",
          status,
          updated_at,
          updatedAt: updated_at,
          changed_at: updated_at,
          changedAt: updated_at,
        };

        const entity = { barcode, pages };

        return {
          ...row,
          barcode,
          pages,

          // compatibility fields
          direction: "Incoming",
          status,
          updated_at,

          receipt,
          issue,
          incoming,
          entity,

          // camelCase top-level aliases
          receiptId: row.receipt_id,
          issueId: row.issue_id,
          clientChangeId: row.client_change_id,
          receivedAt: row.received_at,
          readingStatus: status,
          readingStatusUpdatedAt: updated_at,
          issueStatus: row.issue_status || "open",
          issueCreatedAt: row.issue_created_at,
          candidateBookIds: row.candidate_book_ids,
        };
      });

      const total = countRes.rows[0]?.total ?? 0;
      const pages_total = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

      return res.json({ items, total, page, limit, pages: pages_total });
    } catch (e) {
      const msg = String(e?.message || e);
      if (/mobile_sync\./i.test(msg) && /(does not exist|undefined table|relation)/i.test(msg)) {
        return res.json({ items: [], total: 0, page, limit });
      }
      return res.status(500).json({ error: "needs_review_failed", detail: msg });
    }
  }

  router.get(["/needs-review", "/needs_review"], adminAuthRequired, listNeedsReview);

  // POST /api/mobile-sync/needs-review/:issueId/resolve
  async function resolveNeedsReview(req, res) {
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
  }

  router.post(["/needs-review/:issueId/resolve", "/needs_review/:issueId/resolve"], adminAuthRequired, resolveNeedsReview);

  // --------------------------------------------------------------------------
  // Resolve endpoint used by SyncIssues UI
  // POST /api/mobile-sync/resolve  (alias /issues/resolve)
  // Body: { issueId, action:"apply"|"discard", bookId?, note?, overrideBarcode? }
  // --------------------------------------------------------------------------

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isUuid = (v) => UUID_RE.test(String(v || "").trim());

  async function freeBarcode(client, barcodeRaw) {
    const barcode = String(barcodeRaw || "").trim();
    if (!barcode) return;

    // free active assignment(s) of this barcode
    await client.query(
      `UPDATE public.barcode_assignments
      SET freed_at = now()
      WHERE lower(barcode) = lower($1)
        AND freed_at IS NULL`,
      [barcode]
    );

    // best-effort: inventory -> AVAILABLE (your DB has code + barcode)
    try {
      await client.query(
        `UPDATE public.barcode_inventory
        SET status = 'AVAILABLE', updated_at = now()
        WHERE lower(code) = lower($1) OR lower(barcode) = lower($1)`,
        [barcode]
      );
    } catch {}

    // legacy mapping (best effort)
    try {
      await client.query(`DELETE FROM public.book_barcodes WHERE lower(barcode) = lower($1)`, [barcode]);
    } catch {}
  }

  async function resolveIssueAction(req, res) {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool missing" });

    const issueId = String(req.body?.issueId || req.body?.issue_id || req.body?.id || "").trim();
    if (!issueId) return res.status(400).json({ error: "issue_id_required" });

    const actionRaw = String(req.body?.action || req.body?.status || "resolve").trim().toLowerCase();
    const action =
      actionRaw === "discarded" ? "discard" :
      actionRaw === "resolved" ? "resolve" :
      actionRaw;

    const note = req.body?.note != null && String(req.body.note).trim() !== "" ? String(req.body.note) : null;
    const bookId = String(req.body?.bookId || req.body?.book_id || "").trim();
    const overrideBarcode = req.body?.overrideBarcode ? String(req.body.overrideBarcode).trim() : null;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await ensureMobileSyncTables(client);

      const rr = await client.query(
        `
        SELECT
          r.id AS receipt_id,
          r.client_change_id,
          r.received_at,
          r.status AS receipt_status,
          r.barcode,
          r.pages,
          r.reading_status,
          r.reading_status_updated_at,
          r.top_book,
          r.topbook_set_at,
          r.issue_id,

          i.status AS issue_status,
          i.reason,
          i.candidate_book_ids,
          i.details,
          i.note AS issue_note,
          i.created_at AS issue_created_at
        FROM mobile_sync.receipts r
        LEFT JOIN mobile_sync.issues i ON i.id = r.issue_id
        WHERE r.issue_id = $1::uuid OR i.id = $1::uuid
        ORDER BY r.received_at DESC
        LIMIT 1
        `,
        [issueId]
      );

      if (rr.rowCount !== 1) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "issue_not_found" });
      }

      const row = rr.rows[0];

      if (action === "apply") {
        if (!isUuid(bookId)) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "book_id_required" });
        }

        const parsed = {
          pages: row.pages === null ? null : Number(row.pages),
          readingStatus: normStatus(row.reading_status),
          rsUpdatedAt: parseTs(row.reading_status_updated_at),
          topBook: row.top_book === true || row.top_book === false ? row.top_book : null,
          topBookSetAt: parseTs(row.topbook_set_at),
        };

        // 1) Apply the incoming values to the chosen book
        await updateBookFromMobile(client, bookId, parsed);

        // 2) Free barcode (use override if provided)
        const barcodeToFree = overrideBarcode || String(row.barcode || "").trim();
        if (barcodeToFree) {
          await freeBarcode(client, barcodeToFree);
        }

        // 3) Mark receipt as applied so it disappears from needs_review list
        await client.query(
          `UPDATE mobile_sync.receipts
          SET status = 'applied', book_id = $2::uuid
          WHERE issue_id = $1::uuid`,
          [issueId, bookId]
        );

        // 4) Mark issue resolved
        const note2 =
          overrideBarcode && overrideBarcode !== row.barcode
            ? `${note ? note + " | " : ""}overrideBarcode=${overrideBarcode}`
            : note;

        await client.query(
          `UPDATE mobile_sync.issues
          SET status = 'resolved',
              note = COALESCE($2, note),
              resolved_at = now(),
              resolved_by = 'admin'
          WHERE id = $1::uuid`,
          [issueId, note2]
        );  

        await client.query("COMMIT");
        return res.json({ ok: true, action: "apply", issueId, bookId, freedBarcode: barcodeToFree });
      }

      // discard / resolve (no apply)
      const status = action === "discard" ? "discarded" : "resolved";

      const upd = await client.query(
        `UPDATE mobile_sync.issues
        SET status = $2,
            note = COALESCE($3, note),
            resolved_at = now(),
            resolved_by = 'admin'
        WHERE id = $1::uuid
        RETURNING id, status, resolved_at, note`,
        [issueId, status, note]
      );

      await client.query("COMMIT");
      return res.json({ ok: true, action: status, issue: upd.rows[0] || { id: issueId, status } });
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      return res.status(500).json({ error: "resolve_failed", detail: String(e?.message || e) });
    } finally {
      client.release();
    }
  }

  router.post(["/issues/resolve", "/resolve"], adminAuthRequired, resolveIssueAction);

  // --------------------------------------------------------------------------
  // ✅ Barcode search (Admin) - SOURCE: public.barcode_assignments (open only)
  // GET /api/mobile-sync/barcodes/search?q=...&mode=similar|plain&limit=25
  // Returns: barcode + assigned_at + book {title, author, pages}
  // --------------------------------------------------------------------------

  function escapeRegex(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function buildLookalikeRegex(q) {
    const s = String(q || "").trim();
    if (!s) return null;

    const map = {
      "0": "[0oO]",
      o: "[0oO]",
      O: "[0oO]",
      "1": "[1iIlL]",
      i: "[1iIlL]",
      I: "[1iIlL]",
      l: "[1iIlL]",
      L: "[1iIlL]",
      "2": "[2zZ]",
      z: "[2zZ]",
      Z: "[2zZ]",
      "5": "[5sS]",
      s: "[5sS]",
      S: "[5sS]",
      "8": "[8bB]",
      b: "[8bB]",
      B: "[8bB]",
    };

    let out = "^";
    for (const ch of s) out += map[ch] || escapeRegex(ch);
    out += "$";
    return out;
  }
  async function searchBarcodes(req, res) {
    const pool = getPool(req);
    const q = String(req.query.q || "").trim();
    const mode = String(req.query.mode || "similar").trim().toLowerCase();
    const limit = clampInt(req.query.limit, { min: 1, max: 200, def: 25 });
    if (!q) return res.json({ items: [] });

    const like = `%${q}%`;
    const likePrefix = `${q}%`;
    const rx = mode === "similar" ? buildLookalikeRegex(q) : null;

    try {
      // Source of truth: open assignments only (freed_at IS NULL)
      // Use newest assigned_at per barcode
      
const sql = `
  WITH cand AS (
    SELECT
      ba.barcode,
      ba.book_id,
      ba.assigned_at,
      ba.freed_at,

      COALESCE(
        NULLIF(b.title_display,''),
        NULLIF(b.title_en,''),
        NULLIF(b.title_keyword,'')
      ) AS title_display,

      a.name_display AS author_display,

      b.pages,

      ROW_NUMBER() OVER (
        PARTITION BY lower(ba.barcode)
        ORDER BY ba.assigned_at DESC NULLS LAST
      ) AS rn
    FROM public.barcode_assignments ba
    LEFT JOIN public.books b ON b.id = ba.book_id
    LEFT JOIN public.authors a ON a.id = b.author_id
    WHERE (
      lower(ba.barcode) = lower($1)
      OR lower(ba.barcode) LIKE lower($2)
      OR ba.barcode ILIKE $3
      ${rx ? "OR ba.barcode ~* $4" : ""}
    )
  )
  SELECT barcode, book_id, assigned_at, freed_at, title_display, author_display, pages
  FROM cand
  WHERE rn = 1
  ORDER BY
    CASE
      WHEN lower(barcode) = lower($1) THEN 0
      WHEN lower(barcode) LIKE lower($2) THEN 1
      ELSE 2
    END,
    CASE WHEN freed_at IS NULL THEN 0 ELSE 1 END,
    assigned_at DESC NULLS LAST,
    barcode
  LIMIT $${rx ? 5 : 4}
`;

const args = rx ? [q, likePrefix, like, rx, limit] : [q, likePrefix, like, limit];
      const { rows } = await pool.query(sql, args);

      
const items = rows.map((r) => ({
  barcode: r.barcode,
  assigned_at: r.assigned_at,
  assignedAt: r.assigned_at,
  freed_at: r.freed_at,
  freedAt: r.freed_at,
  is_open: r.freed_at == null,
  isOpen: r.freed_at == null,
  book: r.book_id
    ? {
        id: r.book_id,
        title_display: r.title_display || null,
        titleDisplay: r.title_display || null,
        author_display: r.author_display || null,
        authorDisplay: r.author_display || null,
        pages: r.pages ?? null,
      }
    : null,
}));

return res.json({ items });
    } catch (e) {
      return res.status(500).json({ error: "barcode_search_failed", detail: String(e?.message || e) });
    }
  }
  router.get("/barcodes/search", adminAuthRequired, searchBarcodes);
  router.get("/barcodes", adminAuthRequired, searchBarcodes);

  module.exports = router;
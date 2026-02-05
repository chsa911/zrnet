  const express = require("express");
const router = express.Router();

function getPool(req) {
  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  return pool;
}

function normStatus(s) {
  if (!s) return null;
  const x = String(s).trim().toLowerCase();
  // accept a few legacy spellings
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

// ---- schema bootstrap (safe to run repeatedly) ----
let ensured = false;

async function ensureMobileSyncTables(client) {
  if (ensured) return;

  await client.query(`CREATE SCHEMA IF NOT EXISTS mobile_sync`);
  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  // Issues for manual clarification (kept max 28 days by purge job)
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

  // Receipts / audit + idempotency (kept max 28 days by purge job)
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
  const { clientChangeId, barcode, pages, readingStatus, rsUpdatedAt, topBook, topBookSetAt } = parsed;

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
      clientChangeId,
      barcode,
      null,
      pages,
      readingStatus,
      rsUpdatedAt,
      topBook,
      topBookSetAt,
      issueId,
      change,
    ]
  );
}

async function writeAppliedReceipt(client, change, parsed, bookId) {
  const { clientChangeId, barcode, pages, readingStatus, rsUpdatedAt, topBook, topBookSetAt } = parsed;

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
    [clientChangeId, barcode, bookId, pages, readingStatus, rsUpdatedAt, topBook, topBookSetAt, change]
  );
}

async function updateBookFromMobile(client, bookId, parsed) {
  const { pages, readingStatus, rsUpdatedAt, topBook, topBookSetAt } = parsed;

  // If topBook is being set to true and this book is already true, DO NOT override topbook_set_at.
  // If topBook is explicitly false, clear topbook_set_at.
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
 * POST /api/mobile/sync
 * Body: { changes: [{ clientChangeId, barcode, pages?, readingStatus, reading_status_updated_at, topBook?, topbook_set_at? , ...}] }
 *
 * Disambiguation rules:
 * - If multiple active barcode_assignments exist:
 *   - If pages is missing => ISSUE (barcode_ambiguous_missing_pages)
 *   - Else choose the ONLY book whose books.pages == incoming.pages.
 *     - If exactly one match => apply to that book
 *     - Otherwise => ISSUE (barcode_ambiguous_pages_no_unique_match)
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
        c.reading_status_updated_at ||
        c.readingStatusChangedAt ||
        c.reading_status_changed_at
      );

      const topBook =
        (c.topBook === true || c.topBook === false) ? c.topBook :
        (c.top_book === true || c.top_book === false) ? c.top_book :
        null;

      const topBookSetAt = parseTs(
        c.topbook_set_at ||
        c.topBookSetAt ||
        c.top_book_set_at
      );

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
        topBookSetAt
      };

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

      const candidates = cand.rows.map(r => r.book_id).filter(Boolean);

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
        const matches = candidates.filter(id => pagesMap.get(id) !== null && pagesMap.get(id) === pages);

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
              matching_candidates: matches
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
      if (pages !== null && existingPages !== null && pages !== existingPages) {
        await writeIssueAndReceipt(
          client,
          c,
          parsed,
          "pages_mismatch",
          {
            chosen_book_id: chosenBookId,
            expected_pages: existingPages,
            incoming_pages: pages
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
    try { await client.query("ROLLBACK"); } catch {}
    res.status(500).json({ error: "sync_failed", detail: String(e?.message || e) });
  } finally {
    client.release();
  }
});

module.exports = router;
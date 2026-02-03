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
  if (x === "open" || x === "inprogress" || x === "in-progress") return "in_progress";
  if (x === "in_progress" || x === "finished" || x === "abandoned") return x;
  return x;
}

function parseTs(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

let ensured = false;
async function ensureInbox(client) {
  if (ensured) return;

  // Schema/table are safe to create repeatedly
  await client.query(`CREATE SCHEMA IF NOT EXISTS mobile_sync`);
  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS mobile_sync.inbox (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      client_change_id text NOT NULL UNIQUE,
      received_at timestamptz NOT NULL DEFAULT now(),

      barcode text NOT NULL,
      pages int4 NULL,

      reading_status text NOT NULL,
      reading_status_updated_at timestamptz NOT NULL,

      top_book boolean NULL,
      top_book_set_at timestamptz NULL,

      payload jsonb NOT NULL
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_mobile_sync_inbox_received
    ON mobile_sync.inbox (received_at DESC)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_mobile_sync_inbox_barcode
    ON mobile_sync.inbox (lower(barcode))
  `);

  ensured = true;
}

/**
 * STORE-ONLY MOBILE SYNC
 *
 * POST /api/mobile/sync
 * Body: { changes: [{ clientChangeId, barcode, pages?, readingStatus, readingStatusUpdatedAt, topBook?, topBookSetAt? , ...}] }
 *
 * This endpoint DOES NOT update books or barcode state.
 * It only stores all incoming data in mobile_sync.inbox (append-only, idempotent by client_change_id).
 *
 * Returns (keeps iOS compatibility):
 *   { applied: [clientChangeId], failed: [{clientChangeId,error}] }
 *
 * "applied" here means "stored (or duplicate)".
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
    await ensureInbox(client);

    for (const c of changes) {
      const clientChangeId = String(c.clientChangeId || c.client_change_id || "").trim();
      const barcode = String(c.barcode || "").trim();

      const pages =
        c.pages === null || c.pages === undefined || c.pages === ""
          ? null
          : Number.isFinite(Number(c.pages))
            ? Number(c.pages)
            : null;

      const readingStatus = normStatus(c.readingStatus || c.reading_status);

      // mobile says this timestamp is obligatory:
      const rsUpdatedAt = parseTs(
        c.readingStatusUpdatedAt ||
        c.reading_status_updated_at ||
        c.readingStatusChangedAt ||     // allow old naming
        c.reading_status_changed_at
      );

      const topBook = (c.topBook === true || c.topBook === false) ? c.topBook : null;

      const topBookSetAt = parseTs(
        c.topBookSetAt ||
        c.top_book_set_at
      );

      if (!clientChangeId || !barcode || !readingStatus || !rsUpdatedAt) {
        failed.push({ clientChangeId: clientChangeId || null, error: "INVALID_PAYLOAD" });
        continue;
      }

      // Store full payload, idempotent by client_change_id
      const r = await client.query(
        `
        INSERT INTO mobile_sync.inbox (
          client_change_id, barcode, pages,
          reading_status, reading_status_updated_at,
          top_book, top_book_set_at,
          payload
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (client_change_id) DO NOTHING
        RETURNING id
        `,
        [clientChangeId, barcode, pages, readingStatus, rsUpdatedAt, topBook, topBookSetAt, c]
      );

      // treat duplicates as success for idempotency
      applied.push(clientChangeId);
    }

    await client.query("COMMIT");
    res.json({ applied, failed });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "sync_store_failed", detail: String(e?.message || e) });
  } finally {
    client.release();
  }
});

module.exports = router;
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

/**
 * POST /api/mobile/sync
 * Body: { changes: [{ clientChangeId, barcode, pages?, readingStatus?, topBook? , ...}] }
 * Returns: { applied: [clientChangeId], failed: [{clientChangeId,error}] }
 */
router.post("/sync", async (req, res) => {
  const pool = getPool(req);
  const changes = Array.isArray(req.body?.changes) ? req.body.changes : [];
  if (changes.length === 0) return res.json({ applied: [], failed: [] });
  if (changes.length > 50) return res.status(400).json({ error: "too_many_changes" });

  // Idempotency table (run once manually in Neon is better, but this is safe)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.mobile_change_receipts (
      client_change_id text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied = [];
  const failed = [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const c of changes) {
      const clientChangeId = String(c.clientChangeId || "").trim();
      const barcode = String(c.barcode || "").trim();

      if (!clientChangeId || !barcode) {
        failed.push({ clientChangeId: clientChangeId || null, error: "invalid_payload" });
        continue;
      }

      // idempotency: if already applied, treat as success
      const r = await client.query(
        `INSERT INTO public.mobile_change_receipts (client_change_id)
         VALUES ($1) ON CONFLICT DO NOTHING`,
        [clientChangeId]
      );
      if (r.rowCount === 0) {
        applied.push(clientChangeId);
        continue;
      }

      // resolve book by barcode
      const b = await client.query(
        `SELECT book_id FROM public.book_barcodes WHERE lower(barcode)=lower($1) LIMIT 1`,
        [barcode]
      );
      const bookId = b.rows[0]?.book_id;
      if (!bookId) {
        failed.push({ clientChangeId, error: "barcode_not_found" });
        continue;
      }

      // apply updates (only the fields your PendingStore queues)
      const pages = c.pages ?? null;
      const readingStatus = normStatus(c.readingStatus);
      const topBook = (c.topBook === true || c.topBook === false) ? c.topBook : null;

      await client.query(
        `UPDATE public.books
         SET pages = COALESCE($2, pages),
             reading_status = COALESCE($3, reading_status),
             top_book = COALESCE($4, top_book)
         WHERE id = $1`,
        [bookId, pages, readingStatus, topBook]
      );

      applied.push(clientChangeId);
    }

    await client.query("COMMIT");
    res.json({ applied, failed });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "sync_failed", detail: String(e?.message || e) });
  } finally {
    client.release();
  }
});

module.exports = router;
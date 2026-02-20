// backend/routes/api/barcodes/previewBarcode.js  (Postgres + barcode_inventory)
const express = require("express");
const router = express.Router();

const cmToMm = (cm) => Math.round(Number(cm) * 10);

function getPool(req) {
  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  return pool;
}

/**
 * Resolve size_rule (color) + pos (d/l/o) from width/height using Postgres.
 * We keep your existing logic:
 *  - l if height is exactly one of eq_heights (default 205/210/215)
 *  - d if height <= min_height
 *  - o otherwise
 */
async function resolveRuleAndPos(pool, widthCm, heightCm) {
  const wMm = cmToMm(widthCm);
  const hMm = cmToMm(heightCm);
  if (!Number.isFinite(wMm) || !Number.isFinite(hMm) || wMm <= 0 || hMm <= 0) return null;

  // pick size rule based on width (same as your current logic)
  const { rows } = await pool.query(
    `
    SELECT id, name, min_height, eq_heights
    FROM public.size_rules
    WHERE $1 >= min_width
      AND ($1 <= max_width OR max_width IS NULL)
    ORDER BY min_width DESC
    LIMIT 1
    `,
    [wMm]
  );

  const r = rows[0];
  if (!r) return null;

  const eq = Array.isArray(r.eq_heights) && r.eq_heights.length ? r.eq_heights : [205, 210, 215];

  let pos = "o";
  if (eq.includes(hMm)) pos = "l";
  else if (hMm <= Number(r.min_height)) pos = "d";
  else pos = "o";

  return { sizeRuleId: r.id, color: r.name, pos };
}

// map pos -> inventory band values
function posToBand(pos) {
  if (pos === "l") return "special";
  if (pos === "d") return "low";
  return "high"; // pos === "o"
}

/**
 * GET /api/barcodes/preview-barcode?width=...&height=...
 * Also accepts: ?BBreite=...&BHoehe=...
 *
 * Returns:
 * {
 *   sizegroup: <number>,
 *   color: "<rule name>",
 *   pos: "d|l|o",
 *   band: "low|special|high",
 *   candidate: "<barcode>|null",
 *   availableCount: <number>
 * }
 */
router.get("/preview-barcode", async (req, res) => {
  try {
    const pool = getPool(req);

    const w = parseFloat(req.query.width ?? req.query.BBreite);
    const h = parseFloat(req.query.height ?? req.query.BHoehe);
    if (!Number.isFinite(w) || !Number.isFinite(h)) {
      return res.status(400).json({ error: "width_and_height_required" });
    }

    const rule = await resolveRuleAndPos(pool, w, h);
    if (!rule) return res.status(422).json({ error: "no_series_for_size" });

    const band = posToBand(rule.pos);
    const sizegroup = rule.sizeRuleId;

    // ✅ NEW: pick from barcode_inventory by rank (never mix)
    const pick = await pool.query(
      `
      SELECT bi.barcode
      FROM public.barcode_inventory bi
      LEFT JOIN public.barcode_assignments ba
        ON lower(ba.barcode) = lower(bi.barcode)
       AND ba.freed_at IS NULL
      WHERE bi.status = 'AVAILABLE'
        AND bi.rank_in_inventory IS NOT NULL
        AND (bi.size_rule_id = $1 OR bi.sizegroup = $1)
        AND bi.band = $2
        AND ba.barcode IS NULL
      ORDER BY bi.rank_in_inventory
      LIMIT 1
      `,
      [sizegroup, band]
    );

    const candidate = pick.rows[0]?.barcode ?? null;

    const countRes = await pool.query(
      `
      SELECT count(*)::int AS available
      FROM public.barcode_inventory bi
      LEFT JOIN public.barcode_assignments ba
        ON lower(ba.barcode) = lower(bi.barcode)
       AND ba.freed_at IS NULL
      WHERE bi.status = 'AVAILABLE'
        AND bi.rank_in_inventory IS NOT NULL
        AND (bi.size_rule_id = $1 OR bi.sizegroup = $1)
        AND bi.band = $2
        AND ba.barcode IS NULL
      `,
      [sizegroup, band]
    );

    const availableCount = countRes.rows[0]?.available ?? 0;

    return res.json({
      sizegroup,
      color: rule.color,
      pos: rule.pos,
      band,
      candidate,
      availableCount,
    });
  } catch (err) {
    console.error("api/barcodes/preview-barcode error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
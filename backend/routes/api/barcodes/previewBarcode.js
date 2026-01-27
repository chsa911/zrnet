// backend/routes/api/barcodes/previewBarcode.js  (Postgres version)
const express = require("express");
const router = express.Router();

const cmToMm = (cm) => Math.round(Number(cm) * 10);

function getPool(req) {
  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  return pool;
}

/**
 * Resolve size_rule (color) + position (d/l/o) from width/height using Postgres.
 *
 * Requires size_rules columns:
 *   name (color like 'gk','ak',...)
 *   min_width, max_width (mm)
 *   min_height = height threshold T (mm)
 *   eq_heights int[] (mm)
 */
async function resolveRuleAndPos(pool, widthCm, heightCm) {
  const wMm = cmToMm(widthCm);
  const hMm = cmToMm(heightCm);
  if (!Number.isFinite(wMm) || !Number.isFinite(hMm) || wMm <= 0 || hMm <= 0) return null;

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

  const eq = Array.isArray(r.eq_heights) ? r.eq_heights : [205, 210, 215];

  let pos = "o";
  if (eq.includes(hMm)) pos = "l";
  else if (hMm <= Number(r.min_height)) pos = "d";
  else pos = "o";

  return { sizeRuleId: r.id, color: r.name, pos };
}

/**
 * GET /api/barcodes/preview-barcode?width=...&height=...
 * Also accepts: ?BBreite=...&BHoehe=...
 *
 * Returns:
 * { series: "<series>", candidate: "<code>|null", availableCount: <number> }
 *
 * series is the PREFIX like "dgk" / "lak" / "ouk" (pos + color)
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

    const series = `${rule.pos}${rule.color}`; // e.g. dgk

    // No barcode_numbers table in your schema.
    // Pick a candidate by numeric suffix (e.g. dgk001, dgk002, ...) when present.
    const pick = await pool.query(
      `
      SELECT b.code
      FROM public.barcodes b
      WHERE b.status = 'AVAILABLE'
        AND b.size_rule_id = $1
        AND b.code LIKE ($2 || '%')
        AND NOT EXISTS (
          SELECT 1 FROM public.book_barcodes bb WHERE bb.barcode = b.code
        )
      ORDER BY
        NULLIF(regexp_replace(b.code, '.*?(\\d+)$', '\\1'), b.code)::int NULLS LAST,
        b.code
      LIMIT 1
      `,
      [rule.sizeRuleId, series]
    );

    const candidate = pick.rows[0]?.code ?? null;

    const countRes = await pool.query(
      `
      SELECT count(*)::int AS available
      FROM public.barcodes b
      WHERE b.status = 'AVAILABLE'
        AND b.size_rule_id = $1
        AND b.code LIKE ($2 || '%')
        AND NOT EXISTS (
          SELECT 1 FROM public.book_barcodes bb WHERE bb.barcode = b.code
        )
      `,
      [rule.sizeRuleId, series]
    );

    const availableCount = countRes.rows[0]?.available ?? 0;

    return res.json({ series, candidate, availableCount });
  } catch (err) {
    console.error("api/barcodes/preview-barcode error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
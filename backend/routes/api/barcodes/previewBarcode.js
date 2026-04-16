// backend/routes/api/barcodes/previewBarcode.js
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
 * Logic:
 *  - l if height is exactly one of eq_heights (default 205/210/215)
 *  - d if height <= min_height
 *  - o otherwise
 */
async function resolveRuleAndPos(pool, widthCm, heightCm) {
  const wMm = cmToMm(widthCm);
  const hMm = cmToMm(heightCm);

  if (!Number.isFinite(wMm) || !Number.isFinite(hMm) || wMm <= 0 || hMm <= 0) {
    return null;
  }

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

  const eq =
    Array.isArray(r.eq_heights) && r.eq_heights.length
      ? r.eq_heights.map(Number)
      : [205, 210, 215];

  let pos = "o";
  if (eq.includes(hMm)) pos = "l";
  else if (hMm <= Number(r.min_height)) pos = "d";
  else pos = "o";

  return {
    sizeRuleId: r.id,
    color: String(r.name || "").trim().toLowerCase(),
    pos,
  };
}

function posToBand(pos) {
  if (pos === "l") return "special";
  if (pos === "d") return "low";
  return "high";
}

function bandToPrefixLead(band) {
  if (band === "special") return "l";
  if (band === "low") return "e";
  return "o";
}

function expectedPrefixFromRule(rule) {
  if (!rule?.color || !rule?.pos) return null;
  const band = posToBand(rule.pos);
  return `${bandToPrefixLead(band)}${rule.color}`;
}

/**
 * GET /api/barcodes/preview-barcode?width=...&height=...
 * Also accepts: ?BBreite=...&BHoehe=...
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
    if (!rule) {
      return res.status(422).json({ error: "no_series_for_size" });
    }

    const band = posToBand(rule.pos);
    const sizegroup = rule.sizeRuleId;
    const expectedPrefix = expectedPrefixFromRule(rule);

    if (!expectedPrefix) {
      return res.status(422).json({ error: "no_prefix_for_size" });
    }

    const pick = await pool.query(
  `
  SELECT bi.barcode
  FROM public.barcode_inventory bi
  LEFT JOIN public.barcode_assignments ba
    ON lower(ba.barcode) = lower(bi.barcode)
   AND ba.freed_at IS NULL
  WHERE bi.status = 'AVAILABLE'
    AND bi.rank_in_inventory IS NOT NULL
    AND lower(regexp_replace(bi.barcode, '[0-9]+$', '')) = lower($1)
    AND ba.barcode IS NULL
  ORDER BY bi.rank_in_inventory ASC, lower(bi.barcode) ASC
  LIMIT 1
  `,
  [expectedPrefix]
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
    AND lower(regexp_replace(bi.barcode, '[0-9]+$', '')) = lower($1)
    AND ba.barcode IS NULL
  `,
  [expectedPrefix]
);
    const availableCount = countRes.rows[0]?.available ?? 0;

    return res.json({
      sizegroup,
      color: rule.color,
      pos: rule.pos,
      band,
      expectedPrefix,
      candidate,
      availableCount,
    });
  } catch (err) {
    console.error("api/barcodes/preview-barcode error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
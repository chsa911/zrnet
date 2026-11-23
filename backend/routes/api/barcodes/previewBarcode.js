// backend/routes/api/barcodes/previewBarcode.js
const express = require("express");
const router = express.Router();
const { pickFreeBarcode, countFreeBarcodes } = require("../../../utils/barcodeHolders");
const { resolveBarcodeRule, posOfBarcode, posToBand } = require("../../../utils/barcodeRules");

function getPool(req) {
  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  return pool;
}

/**
 * GET /api/barcodes/preview-barcode?width=...&height=...
 * Also accepts: ?BBreite=...&BHoehe=...
 *
 * Neues System (utils/barcodeRules.js): Farbe nur über die Breite, Position
 * nur über die Positionsgruppe (mit Ausweich-Reihenfolge, wenn voll).
 * Die Höhe wird noch angenommen, beeinflusst den Vorschlag aber nicht mehr.
 */
router.get("/preview-barcode", async (req, res) => {
  try {
    const pool = getPool(req);

    const w = parseFloat(String(req.query.width ?? req.query.BBreite ?? "").replace(",", "."));
    if (!Number.isFinite(w)) {
      return res.status(400).json({ error: "width_and_height_required" });
    }

    const rule = resolveBarcodeRule(w);
    if (!rule) {
      return res.status(422).json({ error: "no_series_for_size" });
    }

    // Same rule as the auto-pick on save (pickBestBarcode): a code is only
    // free when NO in_progress book carries it any more (see barcodeHolders).
    // pickFreeBarcode respects the order of rule.prefixes.
    const candidate = await pickFreeBarcode(pool, rule.prefixes);
    const availableCount = await countFreeBarcodes(pool, rule.prefixes);

    const pos = posOfBarcode(candidate) || rule.pos;

    return res.json({
      sizegroup: rule.sizeClass,
      color: rule.color,
      colorName: rule.colorName,
      positionGroup: rule.positionGroup,
      pos,
      band: posToBand(pos),
      expectedPrefix: rule.prefixes[0],
      expectedPrefixes: rule.prefixes,
      candidate,
      availableCount,
    });
  } catch (err) {
    console.error("api/barcodes/preview-barcode error", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;

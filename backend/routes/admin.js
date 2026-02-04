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
    SELECT barcode, rank_in_inventory
    FROM public.barcode_inventory
    WHERE status = 'AVAILABLE'
      AND rank_in_inventory IS NOT NULL
      AND sizegroup = $1
      AND band = $2
    ORDER BY rank_in_inventory
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

module.exports = router;
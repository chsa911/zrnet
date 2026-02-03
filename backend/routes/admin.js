// backend/routes/admin.js
const express = require("express");
const router = express.Router();
const { adminAuthRequired, adminLogin, adminLogout } = require("../middleware/adminAuth");

function cmToMm(v) {
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10);
}

async function pickSizeRule(pool, widthMm, heightMm) {
  const r = await pool.query(
    `
    SELECT id, name
    FROM public.size_rules
    WHERE $1 BETWEEN min_width AND max_width
      AND $2 >= min_height
      AND ($2 = ANY(eq_heights))
    ORDER BY (max_width - min_width) ASC, min_width ASC
    LIMIT 1
    `,
    [widthMm, heightMm]
  );
  return r.rows[0] || null;
}

async function pickBarcode(pool, sizeRuleId) {
  // Inventory uses sizegroup from the CSV; your size_rules ids are 2..21.
  // We assume sizegroup == size_rules.id.
  const r = await pool.query(
    `
    SELECT barcode, rank_in_inventory
    FROM public.barcode_inventory
    WHERE status = 'AVAILABLE'
      AND rank_in_inventory IS NOT NULL
      AND sizegroup = $1
    ORDER BY rank_in_inventory
    LIMIT 1
    `,
    [sizeRuleId]
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

  const picked = await pickBarcode(pool, sizeRule.id);
  if (!picked) {
    return res.status(400).json({
      error: "No available barcode for this sizegroup",
      size_rule_id: sizeRule.id,
      size_rule_name: sizeRule.name,
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
      size_rule: sizeRule,
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
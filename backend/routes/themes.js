// backend/routes/themes.js
const express = require("express");
const router = express.Router();

function getPool(req) {
  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  return pool;
}

/**
 * GET /api/themes
 * Returns active themes from public.themes
 */
router.get("/", async (req, res) => {
  try {
    const pool = getPool(req);

    const { rows } = await pool.query(
      `
      SELECT abbr, full_name, image_path, description, sort_order
      FROM public.themes
      WHERE is_active = true
      ORDER BY sort_order, full_name
      `
    );

    // return array (your frontend supports array or {items:...})
    res.json(rows);
  } catch (e) {
    console.error("GET /api/themes error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
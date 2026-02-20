const express = require("express");
const router = express.Router();

function getPool(req) {
  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  return pool;
}

// GET /api/themes
router.get("/", async (req, res) => {
  try {
    const pool = getPool(req);
    const { rows } = await pool.query(`
      SELECT abbr, full_name, image_path, description, sort_order
      FROM public.themes
      WHERE is_active = true
      ORDER BY sort_order, full_name
    `);
    res.json(rows);
  } catch (e) {
    console.error("GET /api/themes error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// GET /api/themes/summary
router.get("/summary", async (req, res) => {
  try {
    const pool = getPool(req);

    const { rows } = await pool.query(`
      WITH theme_books AS (
        SELECT
          lower(trim(tok)) AS abbr,
          b.title_display,
          b.registered_at,
          row_number() OVER (
            PARTITION BY lower(trim(tok))
            ORDER BY b.registered_at DESC NULLS LAST
          ) AS rn
        FROM public.books b
        CROSS JOIN LATERAL unnest(string_to_array(coalesce(b.themes, ''), ',')) AS tok
        WHERE b.themes IS NOT NULL AND b.themes <> '' AND trim(tok) <> ''
      ),
      theme_counts AS (
        SELECT abbr, count(*)::int AS book_count
        FROM theme_books
        GROUP BY abbr
      )
      SELECT
        t.abbr,
        t.full_name,
        t.image_path,
        t.description,
        t.sort_order,
        COALESCE(c.book_count, 0) AS book_count
      FROM public.themes t
      LEFT JOIN theme_counts c ON c.abbr = lower(t.abbr)
      WHERE t.is_active = true
      ORDER BY t.sort_order, t.full_name
    `);

    res.json(rows);
  } catch (e) {
    console.error("GET /api/themes/summary error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
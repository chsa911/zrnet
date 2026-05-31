// backend/routes/publicSubGenres.js
// Read-only endpoints for sub-genre pages (e.g. Frauenschicksale)
 
const express = require("express");
const router = express.Router();
 
function getPool(req) {
  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  return pool;
}
 
// GET /api/public/sub-genres
// Returns all sub-genres with genre info and book count
router.get("/", async (req, res) => {
  try {
    const pool = getPool(req);
    const { rows } = await pool.query(`
      SELECT
        sg.id,
        sg.name,
        sg.abbr,
        g.id            AS genre_id,
        g.genre_display AS genre_name,
        g.abbr          AS genre_abbr,
        COUNT(b.id)::int AS book_count
      FROM public.sub_genres sg
      JOIN public.genres g ON g.id = sg.genre_id
      LEFT JOIN public.books b ON b.sub_genre_id = sg.id
      GROUP BY sg.id, sg.name, sg.abbr, g.id, g.genre_display, g.abbr
      ORDER BY g.abbr, sg.name
    `);
    res.json(rows);
  } catch (e) {
    console.error("GET /api/public/sub-genres error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});
 
// GET /api/public/sub-genres/:id/books
// Returns all books for a specific sub-genre, with pagination
// Query params: page (default 1), limit (default 48), sort (registered_at|title|author)
router.get("/:id/books", async (req, res) => {
  try {
    const pool = getPool(req);
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ error: "invalid_id" });
    }
 
    const page  = Math.max(1, Number.parseInt(req.query.page,  10) || 1);
    const limit = Math.min(96, Math.max(1, Number.parseInt(req.query.limit, 10) || 48));
    const offset = (page - 1) * limit;
 
    const allowedSort = ["registered_at", "title_display", "author_display"];
    const sort = allowedSort.includes(req.query.sort) ? req.query.sort : "registered_at";
    const dir  = req.query.dir === "asc" ? "ASC" : "DESC";
 
    // Verify sub-genre exists and get meta
    const { rows: sgRows } = await pool.query(
      `SELECT sg.id, sg.name, sg.abbr, g.genre_display AS genre_name, g.abbr AS genre_abbr
       FROM public.sub_genres sg
       JOIN public.genres g ON g.id = sg.genre_id
       WHERE sg.id = $1`,
      [id]
    );
    if (sgRows.length === 0) {
      return res.status(404).json({ error: "not_found" });
    }
    const subGenre = sgRows[0];
 
    // Total count
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM public.books WHERE sub_genre_id = $1`,
      [id]
    );
    const total = countRows[0].total;
 
    // Books
    const { rows: books } = await pool.query(
      `SELECT
         b.id,
         b.title_display   AS title,
         b.author_display  AS author,
         b.registered_at,
         b.reading_status,
         b.top_book,
         b.genre,
         b.sub_genre,
         ('/uploads/covers/' || b.id::text || '.jpg') AS cover_url
       FROM public.books b
       WHERE b.sub_genre_id = $1
       ORDER BY ${sort} ${dir} NULLS LAST
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );
 
    res.json({
      subGenre,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      books,
    });
  } catch (e) {
    console.error("GET /api/public/sub-genres/:id/books error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});
 
module.exports = router;
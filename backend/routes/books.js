const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const {
  listBooks,
  getBook,
  autocomplete,
  registerBook,
  updateBook,
  dropBook,
} = require("../controllers/booksPgController");

// List + search
router.get("/", listBooks);
router.get("/list", listBooks);

// Autocomplete
router.get("/autocomplete", autocomplete);

// Read one
router.get("/:id", getBook);

// Create
router.post("/", registerBook);

// Public cover upload for newly created books
router.post("/:id/cover", upload.single("cover"), async (req, res) => {
  const pool = req.app.get("pgPool");
  if (!pool) return res.status(500).json({ error: "pgPool missing" });

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ error: "missing_id" });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: "invalid_id" });
  }
  if (!req.file) return res.status(400).json({ error: "missing_file" });

  const byteLen = req.file?.buffer?.length ?? 0;
  if (byteLen < 1024) {
    return res.status(400).json({ error: "empty_file", bytes: byteLen });
  }

  try {
    const uploadRoot = process.env.UPLOAD_ROOT || path.resolve(__dirname, "../../uploads");
    const dir = path.join(uploadRoot, "covers");
    await fs.mkdir(dir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const main = path.join(dir, `${id}.jpg`);
    const archive = path.join(dir, `${id}-${ts}.jpg`);

    await Promise.all([
      fs.writeFile(main, req.file.buffer),
      fs.writeFile(archive, req.file.buffer),
    ]);

    const upd = await pool.query(
      `
        UPDATE public.books
        SET raw = jsonb_set(
          coalesce(raw,'{}'::jsonb),
          '{capture,coverUploadedAt}',
          to_jsonb(now()),
          true
        )
        WHERE id = $1::uuid
        RETURNING (raw->'capture'->>'coverUploadedAt') AS coveruploadedat
      `,
      [id]
    );

    if (!upd.rowCount) {
      try { await fs.unlink(main); } catch {}
      try { await fs.unlink(archive); } catch {}
      return res.status(404).json({ error: "book_not_found_for_cover", id });
    }

    return res.json({
      ok: true,
      id,
      bytes: req.file.buffer.length,
      cover: `/media/covers/${id}.jpg`,
      coverUploadedAt: upd.rows?.[0]?.coveruploadedat || null,
    });
  } catch (e) {
    console.error("public cover upload failed", e);
    return res.status(500).json({
      error: "cover_upload_failed",
      detail: String(e?.message || e),
    });
  }
});

// Patch
router.patch("/:id", updateBook);

// Delete
router.delete("/:id", dropBook);

module.exports = router;
const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

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

const PYTHON_BIN = process.env.PYTHON_BIN || "python3";
const CROP_SCRIPT =
  process.env.COVER_CROP_SCRIPT ||
  path.resolve(__dirname, "../scripts/crop_book_cover.py");
const COVER_CROP_TIMEOUT_MS = Number(
  process.env.COVER_CROP_TIMEOUT_MS || 30000
);

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "")
  );
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function unlinkIfExists(p) {
  try {
    await fs.unlink(p);
  } catch {}
}

async function runCoverCrop(inputPath, outputPath) {
  if (!(await fileExists(CROP_SCRIPT))) {
    throw new Error(`crop_script_missing: ${CROP_SCRIPT}`);
  }

  const { stdout, stderr } = await execFileAsync(
    PYTHON_BIN,
    [CROP_SCRIPT, inputPath, outputPath],
    {
      timeout: COVER_CROP_TIMEOUT_MS,
      maxBuffer: 2 * 1024 * 1024,
    }
  );

  return { stdout, stderr };
}

router.get("/", listBooks);
router.get("/list", listBooks);
router.get("/autocomplete", autocomplete);
router.get("/:id", getBook);
router.post("/", registerBook);

router.post("/:id/cover", upload.single("cover"), async (req, res) => {
  const pool = req.app.get("pgPool");
  if (!pool) return res.status(500).json({ error: "pgPool missing" });

  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ error: "missing_id" });
  if (!isUuid(id)) return res.status(400).json({ error: "invalid_id" });
  if (!req.file) return res.status(400).json({ error: "missing_file" });

  const byteLen = req.file?.buffer?.length ?? 0;
  if (byteLen < 1024) {
    return res.status(400).json({ error: "empty_file", bytes: byteLen });
  }

  const uploadRoot =
    process.env.UPLOAD_ROOT || path.resolve(__dirname, "../../uploads");
  const dir = path.join(uploadRoot, "covers");

  const croppedMain = path.join(dir, `${id}.jpg`);
  const homeMain = path.join(dir, `${id}-home.jpg`);
  const rawMain = path.join(dir, `${id}-raw.jpg`);
  const tempInput = path.join(dir, `${id}-tmp-upload.jpg`);
  const tempCropped = path.join(dir, `${id}-tmp-cropped.jpg`);

  let autocropped = false;
  let cropDetail = null;

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(rawMain, req.file.buffer);
    await fs.writeFile(tempInput, req.file.buffer);

    try {
      await runCoverCrop(tempInput, tempCropped);
      await fs.copyFile(tempCropped, croppedMain);
      await fs.copyFile(tempCropped, homeMain);
      autocropped = true;
    } catch (cropErr) {
      cropDetail = String(cropErr?.message || cropErr);
      console.warn("cover autocrop failed, falling back to raw:", cropDetail);
      await fs.copyFile(rawMain, croppedMain);
      await fs.copyFile(rawMain, homeMain);
    }

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
      await unlinkIfExists(croppedMain);
      await unlinkIfExists(homeMain);
      await unlinkIfExists(rawMain);
      return res.status(404).json({ error: "book_not_found_for_cover", id });
    }

    return res.json({
      ok: true,
      id,
      bytes: req.file.buffer.length,
      cover: `/media/covers/${id}.jpg`,
      homeCover: `/media/covers/${id}-home.jpg`,
      rawCover: `/media/covers/${id}-raw.jpg`,
      coverUploadedAt: upd.rows?.[0]?.coveruploadedat || null,
      autocropped,
      cropFallback: !autocropped,
      cropDetail: autocropped ? null : cropDetail,
    });
  } catch (e) {
    console.error("public cover upload failed", e);
    return res.status(500).json({
      error: "cover_upload_failed",
      detail: String(e?.message || e),
    });
  } finally {
    await unlinkIfExists(tempInput);
    await unlinkIfExists(tempCropped);
  }
});

router.patch("/:id", updateBook);
router.delete("/:id", dropBook);

module.exports = router;

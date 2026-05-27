// backend/app.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const sharp = require("sharp");

const app = express();

// Helpful when running behind Cloudflare / reverse proxies
app.set("trust proxy", 1);

const UPLOAD_ROOT =
  process.env.UPLOAD_ROOT || path.resolve(__dirname, "../uploads");

const COVERS_DIR = path.join(UPLOAD_ROOT, "covers");
const COVERS_RAW_DIR = path.join(COVERS_DIR, "raw");
const COVERS_NORMALIZED_DIR = path.join(COVERS_DIR, "normalized");

fs.mkdirSync(COVERS_DIR, { recursive: true });
fs.mkdirSync(COVERS_RAW_DIR, { recursive: true });
fs.mkdirSync(COVERS_NORMALIZED_DIR, { recursive: true });

/* ---------- middleware (before routes) ---------- */
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

/**
 * CORS with credentials:
 * - Reads allowed origins from CORS_ORIGIN (comma-separated)
 * - Allows localhost / 127.0.0.1 dev origins
 * - Allows common LAN IP dev origins
 * - Allows Cloudflare quick tunnel URLs (*.trycloudflare.com)
 * IMPORTANT: when credentials:true, we must NOT send "*" for origin
 */
function makeCorsOptions() {
  const envList = (
    process.env.CORS_ORIGIN ||
    "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173"
  )
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return {
    origin(origin, cb) {
      if (!origin) return cb(null, true); // curl, server-to-server, tests

      const o = String(origin).toLowerCase();

      const isExactEnv = envList.includes(o);
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(o);
      const isLan192 = /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{2,5}$/.test(o);
      const isLan10 = /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{2,5}$/.test(o);
      const isLan172 =
        /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:\d{2,5}$/.test(o);
      const isTryCloudflare =
        /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(o);

      if (
        isExactEnv ||
        isLocalhost ||
        isLan192 ||
        isLan10 ||
        isLan172 ||
        isTryCloudflare
      ) {
        return cb(null, true);
      }

      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  };
}

const corsOptions = makeCorsOptions();
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* ---------- cover upload ---------- */
/**
 * Upload behavior:
 * - User may upload any image filename.
 * - Backend stores the original image in uploads/covers/raw/<book_id>.<original-ext>
 * - Backend creates/overwrites normalized JPG in uploads/covers/normalized/<book_id>.jpg
 * - Normalized image keeps full image visible using fit: "contain" on an 800x1200 white canvas.
 */
const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

app.post("/api/books/:bookId/cover", coverUpload.single("cover"), async (req, res) => {
  try {
    const bookId = String(req.params.bookId || "").trim();

    if (!bookId) {
      return res.status(400).json({ error: "book_id_missing" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "cover_file_missing" });
    }

    if (!String(req.file.mimetype || "").startsWith("image/")) {
      return res.status(400).json({ error: "file_is_not_image" });
    }

    const originalExt =
      path.extname(req.file.originalname || "").toLowerCase() || ".jpg";

    const rawPath = path.join(COVERS_RAW_DIR, `${bookId}${originalExt}`);
    const normalizedPath = path.join(COVERS_NORMALIZED_DIR, `${bookId}.jpg`);

    const replaced = fs.existsSync(normalizedPath);

    await fs.promises.writeFile(rawPath, req.file.buffer);

    await sharp(req.file.buffer)
      .rotate()
      .resize(800, 1200, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255 },
      })
      .jpeg({
        quality: 90,
        progressive: true,
      })
      .toFile(normalizedPath);
const pool = req.app.get("pgPool");

if (pool) {
  await pool.query(
    `
    UPDATE public.books
    SET updated_at = NOW()
    WHERE id = $1
    `,
    [bookId]
  );
}
    res.json({
      ok: true,
      replaced,
      book_id: bookId,
      raw: `/assets/coversraw/${bookId}${originalExt}`,
      normalized: `/assets/covers/${bookId}.jpg`,
    });
  } catch (err) {
    console.error("POST /api/books/:bookId/cover error", err);
    res.status(500).json({ error: "cover_upload_failed" });
  }
});

/* ---------- public endpoints (must be after CORS) ---------- */
app.get("/api/public/home-highlights", async (req, res) => {
  try {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool_missing" });

    const { rows } = await pool.query(`
      SELECT
        b.home_featured_slot AS slot,
        b.id::text AS id,
        a.name_display AS author_name_display,
        COALESCE(NULLIF(b.title_display, ''), NULLIF(b.title_keyword, '')) AS title_display,
        ('/assets/covers/' || b.id::text || '.jpg') AS cover_home,
        ('/assets/covers/' || b.id::text || '.jpg') AS cover_full,
        ('/assets/covers/' || b.id::text || '.jpg') AS cover,
        b.purchase_url AS buy
      FROM public.books b
      LEFT JOIN public.authors a ON a.id = b.author_id
      WHERE b.home_featured_slot IN ('finished','received')
    `);

    const empty = {
      id: "",
      authorNameDisplay: "",
      titleDisplay: "",
      cover_home: "",
      cover_full: "",
      cover: "",
      buy: "",
    };

    const out = {
      finished: { ...empty },
      received: { ...empty },
      updatedAt: new Date().toISOString(),
    };

    for (const r of rows) {
      const mapped = {
        id: r.id,
        authorNameDisplay: r.author_name_display || null,
        titleDisplay: r.title_display || null,
        cover_home: r.cover_home,
        cover_full: r.cover_full,
        cover: r.cover,
        buy: r.buy,
      };
      if (r.slot === "finished") out.finished = mapped;
      if (r.slot === "received") out.received = mapped;
    }

    res.setHeader("Cache-Control", "no-store");
    res.json(out);
  } catch (err) {
    console.error("GET /api/public/home-highlights error", err);
    res.status(500).json({ error: "internal_error" });
  }
});

/* ---------- health ---------- */
app.get("/health", async (req, res, next) => {
  try {
    const pool = req.app.get("pgPool");
    if (pool) await pool.query("select 1");
    res.send("ok");
  } catch (e) {
    next(e);
  }
});

// so it works behind reverse proxies that forward /api/*
app.get("/api/health", async (req, res, next) => {
  try {
    const pool = req.app.get("pgPool");
    if (pool) await pool.query("select 1");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.use("/api/themes", require("./routes/themes"));

// optional: make /api and /api/ not look broken
app.get(["/api", "/api/"], (req, res) => {
  res.json({
    ok: true,
    endpoints: [
      "/api/health",
      "/api/admin",
      "/api/books",
      "/api/bmarks",
      "/api/barcodes",
      "/api/public/books",
      "/api/public/authors",
      "/api/public/newsletter",
      "/api/public/home-highlights",
      "/api/mobile",
    ],
  });
});

/* ---------- routes ---------- */
app.use("/api/admin", require("./routes/admin"));
app.use("/api/enrich", require("./routes/enrich"));
app.use("/api/public/books", require("./routes/publicBooks"));
app.use("/api/public/authors", require("./routes/publicAuthors"));
app.use("/api/public/newsletter", require("./routes/publicNewsletter"));
app.use("/api/barcodes", require("./routes/api/barcodes/previewBarcode"));
app.use("/api/books", require("./routes/books"));
app.use("/api/bmarks", require("./routes/bmarks"));
app.use("/api/mobile", require("./routes/mobileSync"));
app.use("/api/mobile-sync", require("./routes/mobileSync"));

/* ---------- uploaded media ---------- */
app.use("/assets/covers", express.static(COVERS_DIR));

/* ---------- static frontend ---------- */
const frontendDist = path.resolve(__dirname, "../frontend/dist");
const legacyPublicDir = path.resolve(__dirname, "public");
const staticDir = fs.existsSync(path.join(frontendDist, "index.html"))
  ? frontendDist
  : legacyPublicDir;

app.use(express.static(staticDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

// SPA fallback for client-side routes (e.g. /admin/register, /admin/needs-review)
// Only serve index.html for browser navigations (Accept: text/html) and non-API/non-media paths.
app.get(/^\/(?!api\/|media\/).*/, (req, res, next) => {
  if (req.method !== "GET") return next();
  const accept = String(req.headers.accept || "");
  if (!accept.includes("text/html")) return next();
  return res.sendFile(path.join(staticDir, "index.html"));
});

/* ---------- error handler ---------- */
app.use((err, req, res, _next) => {
  console.error("UNCAUGHT ERROR:", err.message || err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

module.exports = app;

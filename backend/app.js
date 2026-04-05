const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const cookieParser = require("cookie-parser");

const app = express();

// Helpful when running behind Cloudflare / reverse proxies
app.set("trust proxy", 1);

const UPLOAD_ROOT =
  process.env.UPLOAD_ROOT || path.resolve(__dirname, "../uploads");
const COVERS_DIR = path.join(UPLOAD_ROOT, "covers");
fs.mkdirSync(COVERS_DIR, { recursive: true });

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

/* ---------- public endpoints (must be after CORS) ---------- */

function coverUrlForBook(bookId, version) {
  const base = `/media/covers/${bookId}.jpg`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}

function coverPathsForBook(bookId, version) {
  const fullAbs = path.join(COVERS_DIR, `${bookId}.jpg`);
  const hasFull = fs.existsSync(fullAbs);
  const fullRel = coverUrlForBook(bookId, version);

  return {
    cover_home: hasFull ? fullRel : "",
    cover_full: hasFull ? fullRel : "",
    cover: hasFull ? fullRel : "",
  };
}

app.get("/api/public/home-highlights", async (req, res) => {
  try {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool_missing" });

    const { rows } = await pool.query(`
      SELECT
        COALESCE(h.slot, h.presented_as) AS slot,
        h.id,
        h.author_name_display,
        h.title_display,
        h.buy,
        h.presented_at,
        h.presented_till,
        COALESCE(
          b.raw->'capture'->>'coverUploadedAt',
          b.updated_at::text,
          b.added_at::text,
          h.presented_at::text
        ) AS cover_version
      FROM public.home_highlights_current h
      LEFT JOIN public.books b
        ON b.id = h.id::uuid
      WHERE COALESCE(h.slot, h.presented_as) IN ('finished', 'received')
    `);

    const empty = {
      id: "",
      authorNameDisplay: "",
      titleDisplay: "",
      cover_home: "",
      cover_full: "",
      cover: "",
      buy: "",
      featuredSince: null,
      shownForSeconds: 0,
      shownForDays: 0,
    };

    const out = {
      finished: { ...empty },
      received: { ...empty },
      updatedAt: new Date().toISOString(),
    };

    for (const r of rows) {
      const since = r.presented_at ? new Date(r.presented_at) : null;
      const secs = since
        ? Math.max(0, Math.floor((Date.now() - since.getTime()) / 1000))
        : 0;

      const covers = coverPathsForBook(r.id, r.cover_version);

      const mapped = {
        id: r.id,
        authorNameDisplay: r.author_name_display || "",
        titleDisplay: r.title_display || "",
        ...covers,
        buy: r.buy || "",
        featuredSince: r.presented_at || null,
        shownForSeconds: secs,
        shownForDays: Math.floor(secs / 86400),
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
app.use("/media/covers", express.static(COVERS_DIR));

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
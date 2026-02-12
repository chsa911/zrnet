// backend/app.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const cookieParser = require("cookie-parser");

const app = express();

/* ---------- middleware (before routes) ---------- */
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use("/api/enrich", require("./routes/enrich"));
app.use("/api/public/books", require("./routes/publicBooks"));

/**
 * CORS with credentials:
 * - Reads allowed origins from CORS_ORIGIN (comma-separated)
 * - Also allows any http://localhost:<port> (dev convenience)
 * - IMPORTANT: when credentials:true, we must NOT send "*" for origin
 */
function makeCorsOptions() {
  const envList =
    (process.env.CORS_ORIGIN ||
      "http://localhost:5173,http://localhost:5174,http://localhost:5175")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

  return {
    origin(origin, cb) {
      if (!origin) return cb(null, true); // server-to-server, curl, tests
      const o = String(origin).toLowerCase();
      const isLocalhost = /^http:\/\/localhost:\d{2,5}$/.test(o);
      if (envList.includes(o) || isLocalhost) return cb(null, true);
      return cb(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  };
}
const corsOptions = makeCorsOptions();
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// --- home highlights (from DB) ---
app.get("/api/public/home-highlights", async (req, res) => {
  try {
    const pool = req.app.get("pgPool");
    if (!pool) return res.status(500).json({ error: "pgPool_missing" });

    const { rows } = await pool.query(`
      SELECT
        b.home_featured_slot AS slot,
        b.id::text AS id,
        COALESCE(b.author_display, b.author) AS author,
        COALESCE(b.full_title, b.title_keyword) AS title,
        ('/assets/covers/' || b.id::text || '-home.jpg') AS cover_home,
('/assets/covers/' || b.id::text || '.jpg')      AS cover_full,
('/assets/covers/' || b.id::text || '.jpg')      AS cover,
        b.purchase_url AS buy
      FROM public.books b
      WHERE b.home_featured_slot IN ('finished','received')
    `);

    const out = {
  
  finished: { id: "", author: "", title: "", cover_home: "", cover_full: "", cover: "", buy: "" },
  received: { id: "", author: "", title: "", cover_home: "", cover_full: "", cover: "", buy: "" },
   updatedAt: new Date().toISOString(),
    };

    for (const r of rows) {
      if (r.slot === "finished") out.finished = r;
      if (r.slot === "received") out.received = r;
    }

    res.setHeader("Cache-Control", "no-store");
    return res.json(out);
  } catch (err) {
    console.error("GET /api/public/home-highlights error", err);
    return res.status(500).json({ error: "internal_error" });
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

// ✅ so it works behind reverse proxies that forward /api/*
app.get("/api/health", async (req, res, next) => {
  try {
    const pool = req.app.get("pgPool");
    if (pool) await pool.query("select 1");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
app.get("/api/themes", async (req, res) => {
  res.json([
    { id: 1, name: "History", slug: "history" },
    { id: 2, name: "Adventure", slug: "adventure" },
  ]);
});
// ✅ optional: make /api and /api/ not look “broken”
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
      "/api/public/home-highlights",
      "/api/mobile",
    ],
  });
});

/* ---------- routes ---------- */
app.use("/api/admin", require("./routes/admin"));
app.use("/api/barcodes", require("./routes/api/barcodes/previewBarcode"));
app.use("/api/books", require("./routes/books"));
app.use("/api/bmarks", require("./routes/bmarks"));
app.use("/api/mobile", require("./routes/mobileSync"));
app.use("/api/mobile-sync", require("./routes/mobileSync"));
app.use("/api/public/books", require("./routes/publicBooks"));

/* ---------- static public website ---------- */
const publicDir = path.resolve(__dirname, "public");
app.use(express.static(publicDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ✅ SPA fallback for client-side routes (e.g. /admin/register, /admin/needs-review)
// Only serve index.html for browser navigations (Accept: text/html) and non-API paths.
app.get(/^\/(?!api\/).*/, (req, res, next) => {
  if (req.method !== "GET") return next();
  const accept = String(req.headers.accept || "");
  if (!accept.includes("text/html")) return next();
  return res.sendFile(path.join(publicDir, "index.html"));
});

/* ---------- error handler ---------- */
app.use((err, req, res, _next) => {
  console.error("UNCAUGHT ERROR:", err.message || err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

module.exports = app;
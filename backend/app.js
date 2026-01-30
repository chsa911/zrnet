// backend/app.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const app = express();

/* ---------- middleware (before routes) ---------- */
app.use(morgan("dev"));
app.use(express.json());
app.use("/api/mobile", require("./routes/mobileSync"));
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
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
  };
}
const corsOptions = makeCorsOptions();

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* ---------- health ---------- */
app.get("/health", async (req, res, next) => {
  try {
    // Optional: verify PG connectivity on health endpoint
    const pool = req.app.get("pgPool");
    if (pool) {
      await pool.query("select 1");
    }
    res.send("ok");
  } catch (e) {
    next(e);
  }
});
// ✅ Add this (so it works behind Caddy's /api/* proxy)
app.get("/api/health", async (req, res, next) => {
  try {
    const pool = req.app.get("pgPool");
    if (pool) await pool.query("select 1");
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
/* ---------- routes ---------- */
// NOTE: routes must be migrated to use req.app.get("pgPool") (or a shared db module)
app.use("/api/barcodes", require("./routes/api/barcodes/previewBarcode"));
app.use("/api/books", require("./routes/books"));
app.use("/api/bmarks", require("./routes/bmarks"));
app.use("/api/mobile", require("./routes/mobileSync"));
// Public, read-only books endpoints for your static/public site
app.use("/api/public/books", require("./routes/publicBooks"));
  
/* ---------- static public website ---------- */
/**
 *  Serve the static website from backend/public (this is what you showed in your folder tree).
 * This enables:
 *   GET /            -> backend/public/index.html
  *   GET /ausruestung.html, /autoren.html, /books/... etc.
 */
const publicDir = path.resolve(__dirname, "public");
app.use(express.static(publicDir));

// If someone hits "/", send index.html explicitly (nice + clear)
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

/* ---------- error handler ---------- */
app.use((err, req, res, _next) => {
  console.error("UNCAUGHT ERROR:", err.message || err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

module.exports = app;
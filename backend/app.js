// backend/app.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const app = express();

/* ---------- middleware (before routes) ---------- */
app.use(morgan("dev"));
app.use(express.json());

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

// ✅ optional: make /api and /api/ not look “broken”
app.get(["/api", "/api/"], (req, res) => {
  res.json({
    ok: true,
    endpoints: [
      "/api/health",
      "/api/books",
      "/api/bmarks",
      "/api/barcodes",
      "/api/public/books",
      "/api/mobile",
    ],
  });
});

/* ---------- routes ---------- */
app.use("/api/barcodes", require("./routes/api/barcodes/previewBarcode"));
app.use("/api/books", require("./routes/books"));
app.use("/api/bmarks", require("./routes/bmarks"));
app.use("/api/mobile", require("./routes/mobileSync"));
app.use("/api/public/books", require("./routes/publicBooks"));

/* ---------- static public website ---------- */
const publicDir = path.resolve(__dirname, "public");
app.use(express.static(publicDir));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

/* ---------- error handler ---------- */
app.use((err, req, res, _next) => {
  console.error("UNCAUGHT ERROR:", err.message || err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

module.exports = app;
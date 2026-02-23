// backend/server.js
const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  debug: true,
  override: true,
});

const { Pool } = require("pg");
const app = require("./app");

// ✅ Read from env, provide defaults
const PORT = Number(process.env.PORT || 4000);
const DATABASE_URL = process.env.DATABASE_URL;
const u = new URL(DATABASE_URL);
console.log("[env] DB user:", u.username, "| host:", u.host, "| db:", u.pathname.slice(1));
if (!DATABASE_URL) {
  console.error("❌ Missing DATABASE_URL in environment (.env)");
  process.exit(1);
}

// Neon / hosted Postgres typically requires SSL.
// If your DATABASE_URL contains sslmode=require, enable SSL for node-postgres.
const needsSSL =
  /sslmode=require/i.test(DATABASE_URL) ||
  String(process.env.PGSSLMODE || "").toLowerCase() === "require" ||
  /neon\.tech/i.test(DATABASE_URL);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ...(needsSSL ? { ssl: { rejectUnauthorized: false } } : {}),
});

console.log("[env] DATABASE_URL set =", Boolean(process.env.DATABASE_URL));

let startReleaseJob = null;
try {
  // keep this optional; job might not exist or might still be Mongo-based
  ({ start: startReleaseJob } = require("./jobs/releaseMarks"));
} catch {
  /* ignore if missing */
}

let server = null;
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n👋 Shutting down (${signal})...`);
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  } catch {}

  try {
    await pool.end();
  } catch {}

  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

(async () => {
  try {
    // ✅ Test Postgres connection
    await pool.query("select 1 as ok");
    console.log("✅ Postgres connected");

    // Optional: show DB name/user
    const info = await pool.query(
      "select current_database() as db, current_user as usr"
    );
    console.log("DB name:", info.rows[0]?.db, "| user:", info.rows[0]?.usr);

    // Make pool accessible if other modules want it via app.get("pgPool")
    app.set("pgPool", pool);

    // If the job supports PG, pass pool; otherwise it may throw (caught below if you wrap inside)
    if (typeof startReleaseJob === "function") {
      try {
        startReleaseJob({ pool });
      } catch (e) {
        console.warn("⚠️ releaseMarks job failed to start (ignored):", e?.message || e);
      }
    }

  server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 API listening on http://0.0.0.0:${PORT}`);
});
  } catch (err) {
    console.error("❌ Postgres connection error:", err);
    try {
      await pool.end();
    } catch {}
    process.exit(1);
  }
})();
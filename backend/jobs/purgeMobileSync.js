// backend/jobs/purgeMobileSync.js
// Purges mobile_sync receipts/issues older than N days.

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETENTION_DAYS = 28;

async function purgeOnce(pool, retentionDays = DEFAULT_RETENTION_DAYS) {
  const days = Number(retentionDays) || DEFAULT_RETENTION_DAYS;

  // If tables don't exist yet, these will fail. Create schema so the deletes
  // can at least run once the first sync creates the tables.
  await pool.query(`CREATE SCHEMA IF NOT EXISTS mobile_sync`);

  // Best effort deletes (ignore if tables not created yet)
  try {
    await pool.query(
      `DELETE FROM mobile_sync.receipts WHERE received_at < now() - ($1::text || ' days')::interval`,
      [String(days)]
    );
  } catch {
    /* ignore */
  }

  try {
    await pool.query(
      `DELETE FROM mobile_sync.issues WHERE created_at < now() - ($1::text || ' days')::interval`,
      [String(days)]
    );
  } catch {
    /* ignore */
  }
}

function start({ pool }) {
  const retentionDays = process.env.MOBILE_SYNC_RETENTION_DAYS || DEFAULT_RETENTION_DAYS;

  // run at startup
  purgeOnce(pool, retentionDays).catch((e) => {
    console.warn("⚠️ purgeMobileSync initial run failed (ignored):", e?.message || e);
  });

  // run daily
  const timer = setInterval(() => {
    purgeOnce(pool, retentionDays).catch((e) => {
      console.warn("⚠️ purgeMobileSync run failed (ignored):", e?.message || e);
    });
  }, DAY_MS);

  // don't keep process alive solely because of timer
  if (typeof timer.unref === "function") timer.unref();

  return () => clearInterval(timer);
}

module.exports = { start, purgeOnce };

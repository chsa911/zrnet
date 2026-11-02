// backend/jobs/warmPublicCache.js
//
// Fills the in-memory caches for the public book pages in one go, so that
// crawlers and visitors are served from memory and the Neon database can
// sleep (it is billed per hour awake and wakes on every query).
//
//   - shortly after the API starts (the caches are empty after a deploy)
//   - every night at 04:30 Europe/Berlin
//
// For every book it builds the SEO page (/book/<id>, which also fills the
// public book JSON in English) and then the author, theme and sub-genre pages
// linked from the book pages. One run takes a few minutes; the database is
// awake during that time anyway.

const cron = require("node-cron");
const publicCache = require("../utils/publicCache");
const seo = require("../routes/seo");

const START_DELAY_MS = 30 * 1000;
const CONCURRENCY = 4;
// Anything not refreshed for this long is dropped at the start of a run
// (e.g. book pages in other languages, deleted books).
const STALE_MS = 20 * 60 * 60 * 1000;

let running = false;

async function runPool(items, worker) {
  let i = 0;
  let failed = 0;
  const next = async () => {
    while (i < items.length) {
      const item = items[i++];
      try {
        await worker(item);
      } catch {
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, next));
  return failed;
}

async function warmOnce(pool) {
  if (running) return null;
  running = true;
  const t0 = Date.now();
  try {
    const droppedJson = publicCache.dropOlderThan(STALE_MS);
    const droppedSeo = seo.dropOlderThan(STALE_MS);

    const { rows } = await pool.query(`
      SELECT b.id::text AS id
      FROM public.books b
      WHERE COALESCE(NULLIF(b.title_display, ''), NULLIF(b.title_keyword, '')) IS NOT NULL
      ORDER BY b.registered_at DESC NULLS LAST
    `);
    const bookIds = rows.map((r) => r.id);

    // Book pages; collect the author / sub-genre links they point to.
    const linked = new Set();
    const failedBooks = await runPool(bookIds, async (id) => {
      publicCache.invalidateBook(id); // fetch fresh data, not the cached answer
      const page = await seo.warmPage(pool, `/book/${id}`);
      for (const l of page?.links || []) {
        if (/^\/(author|sub-genre)\/[^/]+$/.test(l.href || "")) linked.add(l.href);
      }
    });

    // Theme pages
    try {
      const { rows: themes } = await pool.query(
        `SELECT trim(abbr) AS abbr FROM public.themes WHERE is_active = true AND trim(coalesce(abbr, '')) <> ''`
      );
      for (const t of themes) linked.add(`/bookthemes/${encodeURIComponent(t.abbr)}`);
    } catch (e) {
      console.warn("[warmPublicCache] themes skipped:", e?.message || e);
    }

    const otherPaths = [...linked];
    const failedOther = await runPool(otherPaths, (path) => seo.warmPage(pool, path));

    const secs = Math.round((Date.now() - t0) / 1000);
    console.log(
      `[warmPublicCache] ${bookIds.length} books, ${otherPaths.length} other pages in ${secs}s` +
        ` (failed: ${failedBooks + failedOther}, dropped stale: ${droppedJson + droppedSeo},` +
        ` cached: ${publicCache.stats().entries} json / ${seo.cacheSize()} pages)`
    );
    return { books: bookIds.length, other: otherPaths.length, failed: failedBooks + failedOther, secs };
  } finally {
    running = false;
  }
}

function start({ pool }) {
  const run = () =>
    warmOnce(pool).catch((e) => console.error("[warmPublicCache] run failed:", e?.message || e));

  const timer = setTimeout(run, START_DELAY_MS);
  if (typeof timer.unref === "function") timer.unref();

  const task = cron.schedule("30 4 * * *", run, { timezone: "Europe/Berlin" });
  console.log("🗂️  warmPublicCache: on start + daily 04:30 Europe/Berlin");
  return { task, runOnce: () => warmOnce(pool) };
}

module.exports = { start, warmOnce };

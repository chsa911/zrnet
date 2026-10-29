require("dotenv").config({ path: process.argv[2] });
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const q = async (s) => { try { console.log(JSON.stringify((await pool.query(s)).rows)); } catch (e) { console.log("ERR", e.message); } };
  await q(`SELECT reading_status, count(*)::int n, count(added_at)::int added, count(registered_at)::int reg, count(reading_status_updated_at)::int rsu, count(imported_at)::int imp,
           min(added_at)::date min_added, max(added_at)::date max_added, min(reading_status_updated_at)::date min_rsu, max(reading_status_updated_at)::date max_rsu
           FROM public.books GROUP BY 1 ORDER BY 1`);
  await q(`SELECT date_trunc('month', added_at)::date m, count(*)::int FROM public.books WHERE reading_status <> 'wishlist' GROUP BY 1 ORDER BY 1`);
  await q(`SELECT date_trunc('month', reading_status_updated_at)::date m, count(*)::int FROM public.books WHERE reading_status IN ('finished','abandoned') GROUP BY 1 ORDER BY 1`);
  await q(`SELECT count(*)::int FROM public.books WHERE reading_status IN ('finished','abandoned') AND reading_status_updated_at < added_at`);
  await pool.end();
})();

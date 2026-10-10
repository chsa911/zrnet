require("dotenv").config({ path: "../.env" });
const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const q = "%konsalik%";
  try {
    const r = await pool.query(`SELECT COUNT(*)::int n FROM public.books b
      LEFT JOIN public.authors a ON a.id=b.author_id LEFT JOIN public.publishers p ON p.id=b.publisher_id
      WHERE (COALESCE(p.name, b.publisher) ILIKE $1 OR b.title_keyword2 ILIKE $1 OR b.title_keyword3 ILIKE $1 OR b.isbn10 ILIKE $1 OR b.isbn13 ILIKE $1 OR a.abbreviation ILIKE $1)`, [q]);
    console.log("ok", r.rows);
  } catch (e) { console.log("ERR", e.message); }
  await pool.end();
})();

// backend/routes/enrich.js
const express = require("express");
const router = express.Router();

function getPool(req) {
  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  return pool;
}

/* --- ISBN helpers --- */
function stripIsbn(raw) {
  return String(raw || "").trim().toUpperCase().replace(/[^0-9X]/g, "");
}
function isValidIsbn10(s) {
  if (!/^[0-9]{9}[0-9X]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const v = s[i] === "X" ? 10 : Number(s[i]);
    sum += v * (10 - i);
  }
  return sum % 11 === 0;
}
function isValidIsbn13(s) {
  if (!/^[0-9]{13}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(s[i]) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return check === Number(s[12]);
}
function isbn10to13(isbn10) {
  if (!isValidIsbn10(isbn10)) return null;
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return core + String(check);
}
function isbn13to10(isbn13) {
  if (!isValidIsbn13(isbn13)) return null;
  if (!isbn13.startsWith("978")) return null;
  const core9 = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(core9[i]) * (10 - i);
  const r = 11 - (sum % 11);
  const check = r === 10 ? "X" : r === 11 ? "0" : String(r);
  return core9 + check;
}
function normalizeIsbn(raw) {
  const s = stripIsbn(raw);
  if (s.length === 13 && isValidIsbn13(s)) return { isbn13: s, isbn10: isbn13to10(s) };
  if (s.length === 10 && isValidIsbn10(s)) return { isbn10: s, isbn13: isbn10to13(s) };
  return null;
}

/* --- purchase link templates from purchase_providers --- */
function applyTemplate(tpl, { isbn13, isbn10 }) {
  let url = String(tpl || "");
  url = url.replaceAll("{isbn13}", isbn13 || "");
  url = url.replaceAll("{isbn10}", isbn10 || "");
  url = url.replaceAll("{isbn}", isbn13 || isbn10 || "");
  return url;
}
async function buildPurchase(pool, { isbn13, isbn10 }) {
  const { rows } = await pool.query(`
    SELECT id, code, name, url_template, priority
    FROM public.purchase_providers
    WHERE is_active=true AND kind='buy'
    ORDER BY priority ASC, id ASC
  `);

  const candidates = rows
    .map((p) => ({
      provider_id: p.id,
      provider_code: p.code,
      provider_name: p.name,
      priority: p.priority,
      url: applyTemplate(p.url_template, { isbn13, isbn10 }),
    }))
    .filter((c) => c.url && !c.url.includes("{isbn"));

  return { best: candidates[0] || null, candidates };
}

/* --- DB-only meta (because you said ISBN must exist in DB) --- */
async function metaFromDb(pool, { isbn13, isbn10 }) {
  const { rows } = await pool.query(
    `
    SELECT id, full_title, author_display, author, publisher, isbn13, isbn10
    FROM public.books
    WHERE ($1 IS NOT NULL AND isbn13 = $1)
       OR ($2 IS NOT NULL AND isbn10 = $2)
       OR ($1 IS NOT NULL AND isbn13_raw = $1)
    ORDER BY registered_at DESC
    LIMIT 1
    `,
    [isbn13 || null, isbn10 || null]
  );

  const b = rows[0];
  if (!b) return null;

  return {
    source: "db",
    book_id: b.id,
    title: b.full_title || null,
    author_display: b.author_display || b.author || null,
    publisher: b.publisher || null,
  };
}

router.get("/isbn", async (req, res, next) => {
  try {
    const raw = String(req.query.isbn || "").trim();
    if (!raw) return res.status(400).json({ error: "missing_isbn" });

    const n = normalizeIsbn(raw);
    if (!n) return res.status(400).json({ error: "invalid_isbn" });

    const pool = getPool(req);

    // Require ISBN to exist in DB (your rule)
    const meta = await metaFromDb(pool, n);
    if (!meta) return res.status(404).json({ error: "isbn_not_in_db" });

    const purchase = await buildPurchase(pool, n);

    res.json({
      isbn13: n.isbn13 || null,
      isbn10: n.isbn10 || null,
      meta,
      purchase,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
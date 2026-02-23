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
    title: b.title_display || null,
    author_display: b.author_display || b.author || null,
    publisher: b.publisher || null,
  };
}

/* --- external sources (Google Books + OpenLibrary) --- */
async function fetchJson(url, ms = 3500) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fromGoogle(n) {
  const q = n.isbn13 || n.isbn10;
  if (!q) return null;
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(q)}`;
  const j = await fetchJson(url, 3500);
  const it = j?.items?.[0]?.volumeInfo;
  if (!it) return null;
  return {
    source: "google",
    title: it.title || null,
    authors: Array.isArray(it.authors) ? it.authors : [],
    publisher: it.publisher || null,
    pages: Number.isFinite(it.pageCount) ? it.pageCount : null,
    language: it.language || null,
  };
}

async function fromOpenLibrary(n) {
  const q = n.isbn13 || n.isbn10;
  if (!q) return null;
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(q)}&format=json&jscmd=data`;
  const j = await fetchJson(url, 3500);
  const k = j?.[`ISBN:${q}`];
  if (!k) return null;
  const authors = Array.isArray(k.authors) ? k.authors.map((a) => a?.name).filter(Boolean) : [];
  const publishers = Array.isArray(k.publishers) ? k.publishers.map((p) => p?.name).filter(Boolean) : [];
  return {
    source: "openlibrary",
    title: k.title || null,
    authors,
    publisher: publishers[0] || null,
    pages: Number.isFinite(k.number_of_pages) ? k.number_of_pages : null,
    language: null,
  };
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

// Preferred endpoint used by the frontend: GET /api/enrich/lookup?isbn=...
router.get("/lookup", async (req, res, next) => {
  try {
    const raw = String(req.query.isbn || "").trim();
    if (!raw) return res.status(400).json({ error: "missing_isbn" });

    const n = normalizeIsbn(raw);
    if (!n) return res.status(400).json({ error: "invalid_isbn" });

    const pool = getPool(req);

    const [g, ol, purchase, meta] = await Promise.all([
      fromGoogle(n),
      fromOpenLibrary(n),
      buildPurchase(pool, n),
      metaFromDb(pool, n).catch(() => null),
    ]);

    const title = pickFirst(g?.title, ol?.title, meta?.title);
    const authorName = pickFirst(g?.authors?.[0], ol?.authors?.[0], meta?.author_display);
    const publisher = pickFirst(g?.publisher, ol?.publisher, meta?.publisher);
    const pages = g?.pages ?? ol?.pages ?? null;
    const lang = pickFirst(g?.language, ol?.language);

    // Return the shape BookForm.jsx expects.
    const suggested = {
      isbn13: n.isbn13 || null,
      isbn10: n.isbn10 || null,
      title_display: title,
      BVerlag: publisher,
      BSeiten: pages != null ? String(pages) : null,
      purchase_url: purchase?.best?.url || null,
      original_language: lang,
      name_display: authorName,
      author_name: authorName,
      // keyword hint (frontend can derive better)
      BKw: title,
      BKP: "0",
    };

    res.json({
      suggested,
      sources: { google: g, openlibrary: ol, db: meta },
      purchase,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/isbn", async (req, res, next) => {
  try {
    const raw = String(req.query.isbn || "").trim();
    if (!raw) return res.status(400).json({ error: "missing_isbn" });

    const n = normalizeIsbn(raw);
    if (!n) return res.status(400).json({ error: "invalid_isbn" });

    // Delegate to /lookup implementation
    req.url = `/lookup?isbn=${encodeURIComponent(raw)}`;
    return router.handle(req, res, next);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
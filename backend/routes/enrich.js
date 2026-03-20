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

/* --- DB meta: canonical author/publisher values win --- */
async function metaFromDb(pool, { isbn13, isbn10 }) {
  const { rows } = await pool.query(
    `
    SELECT
      b.id,
      b.title_display,
      b.subtitle_display,
      b.title_keyword,
      b.pages,
      b.original_language,
      b.purchase_url,
      b.isbn13,
      b.isbn10,
      a.first_name AS author_first_name,
      a.last_name AS author_last_name,
      a.name_display AS author_name_display,
      a.abbreviation AS author_abbreviation,
      p.name AS publisher_name,
      p.name_display AS publisher_name_display,
      p.abbr AS publisher_abbr
    FROM public.books b
    LEFT JOIN public.authors a ON a.id = b.author_id
    LEFT JOIN public.publishers p ON p.id = b.publisher_id
    WHERE ($1 IS NOT NULL AND b.isbn13 = $1)
       OR ($2 IS NOT NULL AND b.isbn10 = $2)
       OR ($1 IS NOT NULL AND b.isbn13_raw = $1)
    ORDER BY b.registered_at DESC NULLS LAST, b.added_at DESC NULLS LAST
    LIMIT 1
    `,
    [isbn13 || null, isbn10 || null]
  );

  const b = rows[0];
  if (!b) return null;

  return {
    source: "db",
    book_id: b.id,
    title: b.title_display || b.title_keyword || null,
    subtitle_display: b.subtitle_display || null,
    pages: b.pages ?? null,
    original_language: b.original_language || null,
    purchase_url: b.purchase_url || null,
    author_first_name: b.author_first_name || null,
    author_last_name: b.author_last_name || null,
    author_name_display: b.author_name_display || null,
    author_abbreviation: b.author_abbreviation || null,
    publisher_name_display: b.publisher_name_display || b.publisher_name || null,
    publisher_abbr: b.publisher_abbr || null,
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
function normText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/gi, " ")
    .trim();
}

function scoreText(hay, needle) {
  const h = normText(hay);
  const n = normText(needle);
  if (!h || !n) return 0;
  if (h === n) return 8;
  if (h.includes(n) || n.includes(h)) return 5;

  let hits = 0;
  for (const token of n.split(/\s+/)) {
    if (token.length >= 3 && h.includes(token)) hits += 1;
  }
  return Math.min(hits, 4);
}

async function searchGoogleByText({ q, title, author, publisher }) {
  const terms = [
    title ? `intitle:${title}` : "",
    author ? `inauthor:${author}` : "",
    publisher ? `inpublisher:${publisher}` : "",
  ].filter(Boolean);

  const query = terms.join(" ") || q;
  if (!query) return [];

  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", "5");

  if (process.env.GOOGLE_BOOKS_API_KEY) {
    url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  }

  const j = await fetchJson(url.toString(), 3500);
  const items = Array.isArray(j?.items) ? j.items : [];

  return items.map((it) => {
    const v = it?.volumeInfo || {};
    return {
      source: "google-search",
      title: v.title || null,
      authors: Array.isArray(v.authors) ? v.authors : [],
      publisher: v.publisher || null,
      pages: Number.isFinite(v.pageCount) ? v.pageCount : null,
      language: v.language || null,
    };
  });
}

async function searchOpenLibraryByText({ q, title, author }) {
  const url = new URL("https://openlibrary.org/search.json");

  if (title) url.searchParams.set("title", title);
  if (author) url.searchParams.set("author", author);
  if (!title && !author && q) url.searchParams.set("q", q);

  url.searchParams.set("limit", "5");
  url.searchParams.set(
    "fields",
    "title,title_suggest,author_name,publisher,number_of_pages_median,language"
  );

  const j = await fetchJson(url.toString(), 3500);
  const docs = Array.isArray(j?.docs) ? j.docs : [];

  return docs.map((d) => ({
    source: "openlibrary-search",
    title: d.title || d.title_suggest || null,
    authors: Array.isArray(d.author_name) ? d.author_name : [],
    publisher: Array.isArray(d.publisher) ? d.publisher[0] || null : null,
    pages: Number.isFinite(d.number_of_pages_median) ? d.number_of_pages_median : null,
    language: Array.isArray(d.language) ? d.language[0] || null : null,
  }));
}

function chooseBestHit(hits, { q, title, author }) {
  return [...hits].sort((a, b) => {
    const sa =
      scoreText(a.title, title) +
      scoreText(a.authors?.[0], author) +
      scoreText(`${a.title || ""} ${a.authors?.join(" ") || ""}`, q);

    const sb =
      scoreText(b.title, title) +
      scoreText(b.authors?.[0], author) +
      scoreText(`${b.title || ""} ${b.authors?.join(" ") || ""}`, q);

    return sb - sa;
  })[0] || null;
}

router.get("/search", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const title = String(req.query.title || "").trim();
    const author = String(req.query.author || "").trim();
    const publisher = String(req.query.publisher || "").trim();

    if (!q && !title && !author) {
      return res.status(400).json({ error: "missing_query" });
    }

    const [googleHits, openHits] = await Promise.all([
      searchGoogleByText({ q, title, author, publisher }).catch(() => []),
      searchOpenLibraryByText({ q, title, author }).catch(() => []),
    ]);

    const hits = [...googleHits, ...openHits];
    const best = chooseBestHit(hits, { q, title, author });

    const bestAuthor = best?.authors?.[0] || author || null;

    const suggested = {
      title_display: best?.title || title || null,
      BVerlag: best?.publisher || publisher || null,
      BSeiten: best?.pages != null ? String(best.pages) : null,
      original_language: best?.language || null,
      name_display: bestAuthor,
      author_name: bestAuthor,
      BKw: best?.title || title || null,
      BKP: best?.title || title ? "0" : null,
    };

    res.json({
      suggested,
      hits: hits.slice(0, 5),
    });
  } catch (e) {
    next(e);
  }
});

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

    const title = pickFirst(meta?.title, g?.title, ol?.title);
    const subtitle = meta?.subtitle_display || null;
    const authorDisplay = pickFirst(meta?.author_name_display, g?.authors?.[0], ol?.authors?.[0]);
    const publisherDisplay = pickFirst(meta?.publisher_name_display, g?.publisher, ol?.publisher);
    const pages = meta?.pages ?? g?.pages ?? ol?.pages ?? null;
    const lang = pickFirst(meta?.original_language, g?.language, ol?.language);

    const suggested = {
      isbn13: n.isbn13 || null,
      isbn10: n.isbn10 || null,
      title_display: title,
      subtitle_display: subtitle,
      author_firstname: meta?.author_first_name || null,
      author_lastname: meta?.author_last_name || null,
      name_display: authorDisplay || null,
      author_name_display: authorDisplay || null,
      author_name: authorDisplay || null,
      author_abbreviation: meta?.author_abbreviation || null,
      publisher_name_display: publisherDisplay || null,
      publisher_abbr: meta?.publisher_abbr || null,
      BVerlag: publisherDisplay || null,
      BSeiten: pages != null ? String(pages) : null,
      pages,
      purchase_url: meta?.purchase_url || purchase?.best?.url || null,
      original_language: lang,
      BKw: title,
      BKP: title ? "0" : null,
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

    req.url = `/lookup?isbn=${encodeURIComponent(raw)}`;
    return router.handle(req, res, next);
  } catch (e) {
    next(e);
  }
});

module.exports = router;

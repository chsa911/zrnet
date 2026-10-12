// backend/routes/seo.js
//
// GET /api/public/seo/head   → <title>, meta, canonical, Open Graph, JSON-LD
// GET /api/public/seo/body   → plain HTML summary (h1, text, links) for crawlers
//
// The frontend is a client-rendered SPA. nginx includes these two fragments
// into index.html via SSI (see frontend/nginx.conf and frontend/index.html), so
// search engines, AI crawlers and link previews get real content without
// running JavaScript. React replaces the body fragment when it mounts and
// useSeo() keeps updating the head tags during client-side navigation.
//
// The page path comes from the X-Original-URI header that nginx sets on the
// SSI subrequest; ?path=/book/123 works too (handy for testing).
const express = require("express");
const router = express.Router();

const STATIC_PAGES = require("../seo/static-pages.json");

const SITE = (process.env.PUBLIC_SITE_URL || "https://pagesinline.com").replace(/\/+$/, "");
const SITE_NAME = "Christophers Pages";
const DEFAULT_TITLE = `${SITE_NAME} – Turn waiting time into reading time`;
const DEFAULT_DESCRIPTION =
  "PagesInLine: split paperbacks into pocket sections and turn every waiting minute into reading time. My books, authors, themes and recommendations.";
const DEFAULT_IMAGE = `${SITE}/assets/images/allgemein/hosentasche_link.jpeg`;
const SAME_AS = ["https://www.youtube.com/@pagesinline", "https://www.tiktok.com/@christopherspages"];
const API_SELF = `http://127.0.0.1:${Number(process.env.PORT || 4000)}`;

const CACHE_MS = 10 * 60 * 1000;
const CACHE_MAX = 3000;
const cache = new Map(); // path -> { at, page }

/* ---------- helpers ---------- */

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clip(text, max = 160) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function abs(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  return `${SITE}${u.startsWith("/") ? "" : "/"}${u}`;
}

function jsonLd(obj) {
  // "<" escaped so a title can never close the <script> element
  return `<script type="application/ld+json" data-seo-ssr>${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function fullTitle(title) {
  return title ? `${clip(title, 70)} | ${SITE_NAME}` : DEFAULT_TITLE;
}

function breadcrumb(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}

const PERSON = {
  "@type": "Person",
  name: "Christopher",
  url: `${SITE}/`,
  sameAs: SAME_AS,
};

/** Normalised path without query/hash and without trailing slash (except "/"). */
function cleanPath(raw) {
  let p = String(raw || "/").split("#")[0].split("?")[0] || "/";
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

/* ---------- page builders ---------- */
// Each returns { title, description, canonical, image, type, noindex, jsonld[], h1, paragraphs[], links[] }

function staticPage(path) {
  const s = STATIC_PAGES[path];
  if (!s) return null;
  const page = {
    title: s.title,
    description: s.description || DEFAULT_DESCRIPTION,
    canonical: path,
    image: DEFAULT_IMAGE,
    h1: s.h1 || s.title,
    paragraphs: [...(s.paragraphs || [])],
    links: [],
    jsonld: [],
  };
  if (s.steps?.length) page.list = s.steps;
  if (path === "/") {
    page.jsonld.push(
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        alternateName: "PagesInLine",
        url: `${SITE}/`,
        inLanguage: "en",
        author: PERSON,
      },
      { "@context": "https://schema.org", ...PERSON }
    );
  } else {
    page.jsonld.push(breadcrumb([{ name: "Home", path: "/" }, { name: s.h1 || s.title, path }]));
  }
  if (s.faq?.length) {
    page.faq = s.faq;
    page.jsonld.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: s.faq.map((x) => ({
        "@type": "Question",
        name: x.q,
        acceptedAnswer: { "@type": "Answer", text: x.a },
      })),
    });
  }
  if (path === "/info/impressum" || path === "/info/datenschutz") page.noindex = true;
  return page;
}

async function bookPage(pool, id) {
  // Reuse the public API so English titles, covers etc. match what the page shows.
  const r = await fetch(`${API_SELF}/api/public/books/${encodeURIComponent(id)}?lang=en`, {
    signal: AbortSignal.timeout(2500),
  });
  if (r.status === 404 || r.status === 400) return notFound(`/book/${id}`);
  if (!r.ok) throw new Error(`book_api_${r.status}`);
  const b = await r.json();

  const title = b.title || b.titleOriginal || "Untitled";
  const author = b.author || "";
  const path = `/book/${encodeURIComponent(b.id || id)}`;
  const authorPath = author ? `/author/${encodeURIComponent(author)}` : null;
  const comment = String(b.comment || "").trim();
  const description = comment
    ? `${author ? `${title} – ${author}` : title}: ${comment}`
    : `${title}${author ? ` by ${author}` : ""} – cover, details and where to buy, from Christopher's paper-book collection.`;

  const book = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: title,
    url: abs(path),
  };
  if (author) book.author = { "@type": "Person", name: author, url: abs(authorPath) };
  if (b.cover_url) book.image = abs(b.cover_url);
  if (b.isbn13 || b.isbn10) book.isbn = b.isbn13 || b.isbn10;
  if (Number(b.pages) > 0) book.numberOfPages = Number(b.pages);
  if (b.publisher) book.publisher = { "@type": "Organization", name: String(b.publisher) };
  if (b.originalTitle && b.originalTitle !== title) book.alternateName = b.originalTitle;
  if (b.sub_genre_name) book.genre = b.sub_genre_name;
  if (comment) {
    book.review = {
      "@type": "Review",
      author: { "@type": "Person", name: "Christopher" },
      reviewBody: comment,
    };
  }

  const crumbs = [{ name: "Home", path: "/" }];
  if (authorPath) crumbs.push({ name: author, path: authorPath });
  crumbs.push({ name: title, path });

  const facts = [];
  if (author) facts.push(`Author: ${author}`);
  if (b.publisher) facts.push(`Publisher: ${b.publisher}`);
  if (Number(b.pages) > 0) facts.push(`Pages: ${b.pages}`);
  if (b.isbn13) facts.push(`ISBN: ${b.isbn13}`);

  const links = [];
  if (authorPath) links.push({ href: authorPath, text: `More books by ${author}` });
  if (b.sub_genre_id && b.sub_genre_name)
    links.push({ href: `/sub-genre/${encodeURIComponent(b.sub_genre_id)}`, text: `Similar books: ${b.sub_genre_name}` });

  return {
    title: author ? `${title} by ${author}` : title,
    description,
    canonical: path,
    image: b.cover_url ? abs(b.cover_url) : DEFAULT_IMAGE,
    imageAlt: author ? `Cover of ${title} by ${author}` : `Cover of ${title}`,
    type: "book",
    h1: title,
    paragraphs: [...(comment ? [comment] : []), facts.join(" · ")].filter(Boolean),
    links,
    jsonld: [book, breadcrumb(crumbs)],
  };
}

const TITLE_SQL = "COALESCE(NULLIF(b.title_display,''), NULLIF(b.title_keyword,''))";

async function authorPage(pool, rawSegment) {
  const key = safeDecode(rawSegment).trim();
  if (!key) return notFound(`/author/${rawSegment}`);
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);

  const { rows } = await pool.query(
    `
    SELECT id::text AS id, name_display, birth_date, death_date, author_nationality
    FROM public.authors
    WHERE ${isUuid ? "id = $1::uuid" : "lower(trim(name_display)) = lower($1) OR lower(trim(abbr)) = lower($1)"}
    ORDER BY (lower(trim(name_display)) = lower($1)) DESC
    LIMIT 1
    `,
    [key]
  );
  const a = rows[0];
  if (!a || !a.name_display) return notFound(`/author/${rawSegment}`);

  const { rows: books } = await pool.query(
    `
    SELECT b.id::text AS id, ${TITLE_SQL} AS title
    FROM public.books b
    WHERE b.author_id = $1::uuid AND ${TITLE_SQL} IS NOT NULL
    ORDER BY b.registered_at DESC NULLS LAST
    LIMIT 40
    `,
    [a.id]
  );

  const name = a.name_display.trim();
  // Same canonical the SPA uses (the path as requested)
  const path = `/author/${rawSegment}`;
  const person = { "@context": "https://schema.org", "@type": "Person", name, url: abs(path) };
  if (a.birth_date) person.birthDate = new Date(a.birth_date).toISOString().slice(0, 10);
  if (a.death_date) person.deathDate = new Date(a.death_date).toISOString().slice(0, 10);
  if (a.author_nationality) person.nationality = String(a.author_nationality);

  const seen = new Set();
  const uniqueBooks = books.filter((b) => {
    const k = b.title.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    title: `${name} – books in my collection`,
    description: `All books by ${name} in Christopher's paper-book collection: finished, currently reading, in stock and top picks.`,
    canonical: path,
    image: DEFAULT_IMAGE,
    type: "profile",
    h1: name,
    paragraphs: [`Books by ${name} in Christopher's paper-book collection.`],
    links: uniqueBooks.map((b) => ({ href: `/book/${encodeURIComponent(b.id)}`, text: b.title })),
    jsonld: [
      person,
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Authors", path: "/authors" },
        { name, path },
      ]),
    ],
  };
}

async function themePage(pool, rawAbbr) {
  const abbr = safeDecode(rawAbbr).trim();
  const { rows } = await pool.query(
    `
    SELECT abbr, full_name, description, image_path
    FROM public.themes
    WHERE is_active = true AND lower(trim(abbr)) = lower($1)
    LIMIT 1
    `,
    [abbr]
  );
  const t = rows[0];
  if (!t) return notFound(`/bookthemes/${rawAbbr}`);

  const { rows: books } = await pool.query(
    `
    SELECT b.id::text AS id, ${TITLE_SQL} AS title, NULLIF(TRIM(a.name_display), '') AS author
    FROM public.books b
    LEFT JOIN public.authors a ON a.id = b.author_id
    WHERE ${TITLE_SQL} IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM unnest(string_to_array(coalesce(b.themes, ''), ',')) AS tok
        WHERE lower(trim(tok)) = lower($1)
      )
    ORDER BY b.registered_at DESC NULLS LAST
    LIMIT 40
    `,
    [t.abbr.trim()]
  );

  const name = t.full_name || t.abbr;
  const path = `/bookthemes/${encodeURIComponent(t.abbr.trim())}`;
  return {
    title: `${name} – books on this theme`,
    description: t.description || `Books on the theme ${name} from Christopher's paper-book collection.`,
    canonical: path,
    image: t.image_path ? abs(t.image_path) : DEFAULT_IMAGE,
    h1: name,
    paragraphs: t.description ? [t.description] : [],
    links: books.map((b) => ({
      href: `/book/${encodeURIComponent(b.id)}`,
      text: b.author ? `${b.title} – ${b.author}` : b.title,
    })),
    jsonld: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name,
        url: abs(path),
        description: t.description || undefined,
      },
      breadcrumb([
        { name: "Home", path: "/" },
        { name: "Book themes", path: "/bookthemes" },
        { name, path },
      ]),
    ],
  };
}

async function subGenrePage(pool, rawId) {
  const id = safeDecode(rawId).trim();
  const { rows } = await pool.query(
    `SELECT id::text AS id, name FROM public.sub_genres WHERE id::text = $1 LIMIT 1`,
    [id]
  );
  const sg = rows[0];
  if (!sg) return notFound(`/sub-genre/${rawId}`);

  const { rows: books } = await pool.query(
    `
    SELECT b.id::text AS id, ${TITLE_SQL} AS title, NULLIF(TRIM(a.name_display), '') AS author
    FROM public.books b
    LEFT JOIN public.authors a ON a.id = b.author_id
    WHERE b.sub_genre_id::text = $1 AND ${TITLE_SQL} IS NOT NULL
    ORDER BY b.registered_at DESC NULLS LAST
    LIMIT 40
    `,
    [sg.id]
  );
  const path = `/sub-genre/${encodeURIComponent(sg.id)}`;
  return {
    title: `${sg.name} – similar books`,
    description: `Books in the sub-genre ${sg.name} from Christopher's paper-book collection.`,
    canonical: path,
    image: DEFAULT_IMAGE,
    h1: sg.name,
    paragraphs: [],
    links: books.map((b) => ({
      href: `/book/${encodeURIComponent(b.id)}`,
      text: b.author ? `${b.title} – ${b.author}` : b.title,
    })),
    jsonld: [breadcrumb([{ name: "Home", path: "/" }, { name: sg.name, path }])],
  };
}

function notFound(path) {
  return {
    title: "Page not found",
    description: DEFAULT_DESCRIPTION,
    canonical: "",
    image: DEFAULT_IMAGE,
    noindex: true,
    h1: "Page not found",
    paragraphs: [],
    links: [],
    jsonld: [],
    _path: path,
  };
}

function defaultPage(path, { noindex = false } = {}) {
  return {
    title: "",
    description: DEFAULT_DESCRIPTION,
    canonical: noindex ? "" : path,
    image: DEFAULT_IMAGE,
    noindex,
    h1: "",
    paragraphs: [],
    links: [],
    jsonld: [],
  };
}

async function buildPage(pool, path) {
  const segs = path.split("/").filter(Boolean);
  if (STATIC_PAGES[path]) return staticPage(path);
  // Social entry points render the home page; canonical is "/"
  if (path === "/youtube" || path === "/tiktok") return staticPage("/");
  if (segs[0] === "admin" || segs[0] === "analytics" || segs[0] === "stats" || segs[0] === "login")
    return defaultPage(path, { noindex: true });
  if (segs.length === 2 && segs[0] === "book") return bookPage(pool, segs[1]);
  if (segs.length === 2 && segs[0] === "author") return authorPage(pool, segs[1]);
  if (segs.length === 2 && segs[0] === "bookthemes") return themePage(pool, segs[1]);
  if (segs.length === 2 && segs[0] === "sub-genre") return subGenrePage(pool, segs[1]);
  return defaultPage(path);
}

/* ---------- renderers ---------- */

function renderHead(p) {
  const title = fullTitle(p.title);
  const desc = clip(p.description || DEFAULT_DESCRIPTION);
  const canonical = p.canonical ? abs(p.canonical) : "";
  const out = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
  ];
  if (p.noindex) out.push(`<meta name="robots" content="noindex, follow" />`);
  if (canonical) out.push(`<link rel="canonical" href="${esc(canonical)}" />`);
  out.push(
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:type" content="${esc(p.type || "website")}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:image" content="${esc(p.image || DEFAULT_IMAGE)}" />`
  );
  if (p.imageAlt) out.push(`<meta property="og:image:alt" content="${esc(p.imageAlt)}" />`);
  if (canonical) out.push(`<meta property="og:url" content="${esc(canonical)}" />`);
  out.push(
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    `<meta name="twitter:image" content="${esc(p.image || DEFAULT_IMAGE)}" />`
  );
  for (const obj of p.jsonld || []) out.push(jsonLd(obj));
  return out.join("\n    ") + "\n";
}

const NAV = [
  { href: "/", text: "Home" },
  { href: "/info/how-it-works", text: "How it works" },
  { href: "/collection", text: "Collection" },
  { href: "/titles", text: "Recent highlights" },
  { href: "/authors", text: "Authors" },
  { href: "/bookthemes", text: "Book themes" },
  { href: "/info/faq", text: "FAQ" },
];

function renderBody(p) {
  const out = [`<div class="ssr-content">`];
  out.push(`<nav>${NAV.map((l) => `<a href="${esc(l.href)}">${esc(l.text)}</a>`).join(" · ")}</nav>`);
  out.push(`<main>`);
  if (p.h1) out.push(`<h1>${esc(p.h1)}</h1>`);
  for (const para of p.paragraphs || []) out.push(`<p>${esc(para)}</p>`);
  if (p.list?.length) out.push(`<ol>${p.list.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`);
  for (const x of p.faq || []) out.push(`<h2>${esc(x.q)}</h2><p>${esc(x.a)}</p>`);
  if (p.links?.length)
    out.push(`<ul>${p.links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.text)}</a></li>`).join("")}</ul>`);
  out.push(`</main></div>`);
  return out.join("\n") + "\n";
}

/* ---------- route ---------- */

async function getPage(req) {
  const raw = req.query.path || req.get("x-original-uri") || "/";
  const path = cleanPath(raw);
  const hit = cache.get(path);
  const now = Date.now();
  if (hit && now - hit.at < CACHE_MS) return hit.page;

  const pool = req.app.get("pgPool");
  if (!pool) throw new Error("pgPool missing on app");
  const page = await buildPage(pool, path);

  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(path, { at: now, page });
  return page;
}

router.get("/:part(head|body)", async (req, res) => {
  try {
    const page = await getPage(req);
    const html = req.params.part === "head" ? renderHead(page) : renderBody(page);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "no-store");
    return res.send(html);
  } catch (e) {
    console.error("GET /api/public/seo error:", e?.message || e);
    // Empty 500 → nginx falls back to the default tags in index.html (SSI stub)
    return res.status(500).send("");
  }
});

module.exports = router;
module.exports._internal = { buildPage, renderHead, renderBody, cleanPath, cache };

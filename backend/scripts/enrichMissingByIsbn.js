// backend/scripts/enrichMissingByIsbn.js
//
// Ergänzt Titel, Untertitel, Autor und Verlag für Bücher, die eine ISBN haben,
// bei denen diese Felder aber leer sind (v. a. reading_status = in_stock aus der
// Staging-Seite, wenn Google Books / Open Library bei der Erfassung nichts fanden).
// Fragt pro ISBN die DNB, Google Books und Open Library ab. Die DNB hat Vorrang,
// weil sie deutsche Ausgaben am vollständigsten kennt.
//
// 1) Vorschläge erzeugen (liest nur aus der DB):
//      node backend/scripts/enrichMissingByIsbn.js --suggest [--status in_stock] [--limit 30] [--out isbn_vorschlaege.csv]
//    Abgebrochene Läufe setzen dank Cache (backend/scripts/.cache/isbn_lookup.json) fort.
//
// 2) CSV in Excel prüfen. Spalte "uebernehmen" = ja/nein. titel_neu, untertitel_neu,
//    autor_neu ("Vorname Nachname", mehrere mit ";") und verlag_neu dürfen angepasst werden.
//    Speichern als "CSV UTF-8".
//
// 3) Testlauf (ändert nichts, Transaktion wird zurückgerollt):
//      node backend/scripts/enrichMissingByIsbn.js --apply isbn_vorschlaege.csv
//    Wirklich speichern:
//      node backend/scripts/enrichMissingByIsbn.js --apply isbn_vorschlaege.csv --commit
//
// Beim Speichern werden NUR leere Felder gefüllt (title_display, subtitle_display,
// author_id, publisher_id, isbn13). Was schon eingetragen ist, bleibt unverändert.
// Autor/Verlag: vorhandener Eintrag wird verwendet (gleicher Name bzw. Alias),
// sonst wird ein neuer angelegt. "Letzte Aktion" (updated_at) bleibt unverändert.
// Zeilen mit status "kein_treffer" sind die Kandidaten für die Cover-Erkennung.

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env"), quiet: true });
const { norm, splitTitle, parseCsv, csvCell } = require("./enrichStubTitles");

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true) : def;
};

/* ------------------------------------------------------------------ */
/* ISBN                                                                */
/* ------------------------------------------------------------------ */
const stripIsbn = (raw) => String(raw || "").trim().toUpperCase().replace(/[^0-9X]/g, "");
function isValidIsbn10(s) {
  if (!/^[0-9]{9}[0-9X]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += (s[i] === "X" ? 10 : Number(s[i])) * (10 - i);
  return sum % 11 === 0;
}
function isValidIsbn13(s) {
  if (!/^[0-9]{13}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(s[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === Number(s[12]);
}
function isbn10to13(s) {
  const core = "978" + s.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3);
  return core + String((10 - (sum % 10)) % 10);
}
function normalizeIsbn(...raws) {
  for (const raw of raws) {
    const s = stripIsbn(raw);
    if (s.length === 13 && isValidIsbn13(s)) return s;
    if (s.length === 10 && isValidIsbn10(s)) return isbn10to13(s);
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Lookups (mit Cache)                                                 */
/* ------------------------------------------------------------------ */
const CACHE_FILE = path.resolve(__dirname, ".cache/isbn_lookup.json");
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch { /* neuer Cache */ }
let cacheDirty = 0;
function saveCache(force) {
  if (!force && cacheDirty < 20) return;
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  cacheDirty = 0;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIMEOUT_MS = Number(arg("--timeout", 8)) * 1000;
let googleOff = false;

async function getCached(url, kind) {
  if (cache[url] !== undefined) return cache[url];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "zrnet-isbn-enrichment/1.0" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (url.includes("googleapis.com") && (res.status === 429 || res.status === 403)) {
        if (!googleOff) console.log(`  Google Books lehnt ab (HTTP ${res.status}) – wird für diesen Lauf übersprungen. Tipp: GOOGLE_BOOKS_API_KEY in .env`);
        googleOff = true;
        return null;
      }
      if (res.status === 429 || res.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
      const body = res.ok ? (kind === "json" ? await res.json() : await res.text()) : null;
      cache[url] = body; cacheDirty++; saveCache();
      return body;
    } catch {
      await sleep(500);
    }
  }
  return null; // nicht gecacht -> nächster Lauf versucht es erneut
}

const xmlAll = (xml, tag) =>
  [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g"))].map((m) =>
    m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim()
  );

// "Strayed, Cheryl [Verfasser]" -> "Cheryl Strayed"; Übersetzer/Herausgeber/Illustratoren raus
const NON_AUTHOR_ROLE = /(übers|uebers|hrsg|herausgeber|illustr|bearb|nachw|vorw|mitwirk|sprecher|translator|editor)/i;
function cleanPerson(raw) {
  const s = String(raw || "").trim();
  const role = (s.match(/\[([^\]]*)\]/) || [])[1] || "";
  if (role && NON_AUTHOR_ROLE.test(role)) return null;
  const name = s.replace(/\s*\[[^\]]*\]/g, "").replace(/\s*\(\d{4}-?\d{0,4}\)\s*/g, "").trim();
  if (!name) return null;
  if (name.includes(",")) {
    const [last, ...rest] = name.split(",");
    const first = rest.join(",").trim();
    return first ? `${first} ${last.trim()}` : last.trim();
  }
  return name;
}
const uniq = (arr) => arr.filter((x, i) => x && arr.findIndex((y) => norm(y) === norm(x)) === i);

// "München : Goldmann" -> "Goldmann"; "München ; Zürich : Piper" -> "Piper"
// "Berlin : Ullstein ; München : Econ" -> "Ullstein"
function cleanPublisher(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const i = s.indexOf(" : ");
  const rest = i >= 0 ? s.slice(i + 3) : s;
  return rest.split(/\s+;\s+|\s+:\s+/)[0].replace(/^\[|\]$/g, "").trim() || null;
}

// DNB liefert oft mehrere dc:publisher, davon manche nur mit Ort ("München", "Freiburg, Br.").
// Nur Einträge der Form "Ort : Verlag" enthalten einen Verlag.
function pickDnbPublisher(entries) {
  const withName = entries.find((e) => / : /.test(e));
  return withName ? cleanPublisher(withName) : null;
}

async function fromDNB(isbn) {
  const url = `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=oai_dc&maximumRecords=5&query=${encodeURIComponent(`num=${isbn}`)}`;
  const xml = await getCached(url, "text");
  if (!xml) return null;
  const rec = xml.split("<record>").slice(1)[0];
  if (!rec) return null;
  const { title, subtitle } = splitTitle(xmlAll(rec, "dc:title")[0] || "", []);
  if (!title) return null;
  return {
    source: "DNB",
    title, subtitle,
    authors: uniq(xmlAll(rec, "dc:creator").map(cleanPerson)),
    publisher: pickDnbPublisher(xmlAll(rec, "dc:publisher")),
    pages: Number((xmlAll(rec, "dc:format").join(" ").match(/(\d+)\s*S(eiten|\.)/) || [])[1]) || null,
    year: Number((xmlAll(rec, "dc:date").join(" ").match(/\b(1[5-9]\d\d|20\d\d)\b/) || [])[1]) || null,
    lang: xmlAll(rec, "dc:language")[0] || "",
  };
}

async function fromGoogle(isbn) {
  if (googleOff) return null;
  const key = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}` : "";
  const j = await getCached(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${key}`, "json");
  const v = j?.items?.[0]?.volumeInfo;
  if (!v?.title) return null;
  return {
    source: "Google",
    title: v.title, subtitle: v.subtitle || "",
    authors: uniq((v.authors || []).map(cleanPerson)),
    publisher: cleanPublisher(v.publisher),
    pages: v.pageCount || null,
    year: Number(String(v.publishedDate || "").slice(0, 4)) || null,
    lang: v.language || "",
  };
}

async function fromOpenLibrary(isbn) {
  const j = await getCached(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`, "json");
  const k = j?.[`ISBN:${isbn}`];
  if (!k?.title) return null;
  return {
    source: "OpenLibrary",
    title: k.title, subtitle: k.subtitle || "",
    authors: uniq((k.authors || []).map((a) => cleanPerson(a?.name))),
    publisher: cleanPublisher((k.publishers || [])[0]?.name),
    pages: k.number_of_pages || null,
    year: Number((String(k.publish_date || "").match(/\d{4}/) || [])[0]) || null,
    lang: "",
  };
}

/* ------------------------------------------------------------------ */
/* Abgleich mit vorhandenen Autoren / Verlagen                         */
/* ------------------------------------------------------------------ */
function splitName(display) {
  const parts = String(display || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { first: null, last: parts[0] || null };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

function findAuthor(authors, display) {
  const d = norm(display);
  if (!d) return null;
  const { first, last } = splitName(display);
  return (
    authors.find((a) => norm(a.name_display) === d) ||
    authors.find((a) => first && last && norm(a.first_name) === norm(first) && norm(a.last_name) === norm(last)) ||
    authors.find((a) => norm(a.name) === d) ||
    null
  );
}

// Verlagsnamen vergleichbar machen: "Diana-Verl." = "Diana", "Marebuchverl." = "mare",
// "Dt. Verl.-Anst." = "DVA", "Deutscher Taschenbuch Verl." = "dtv".
const PUB_NOISE = new Set(["verlag", "verl", "verlage", "verlagsgruppe", "verlagshaus", "verlagsanstalt", "verlagsges", "ges",
  "gmbh", "co", "kg", "ag", "mbh", "inc", "ltd", "taschenbuch", "taschenbuecher", "taschenbuchverl", "taschenbuchverlag",
  "tb", "edition", "ed", "publishing", "publ", "publishers", "books", "buchverlag", "buchverl", "vertrieb", "und", "the"]);
const PUB_SPECIAL = [
  [/^(dt|deutsche) verl(ags)? (anst|anstalt)$/, "dva"],
  [/^deutsche verlags anstalt$/, "dva"],
  [/^(dt|deutscher) taschenbuch( verl(ag)?)?$/, "dtv"],
  [/^(dt|deutscher) taschenbuch verl$/, "dtv"],
];
function pnorm(s) {
  let n = norm(s);
  for (const [re, v] of PUB_SPECIAL) if (re.test(n)) return v;
  return n.split(" ")
    .map((w) => w.replace(/(buch)?verl(ag)?$/, "") || w) // "marebuchverl" -> "mare"
    .filter((w) => w && !PUB_NOISE.has(w))
    .join(" ");
}
// Einträge, die nur Abkürzungen wie "m." / "br." sind, taugen nicht für den Namensvergleich
const usable = (q) => q.split(" ").some((w) => w.length >= 4) || /^(dtv|dva|btb|blv|rororo)$/.test(q);

function findPublisher(pubs, aliases, display, exclude = new Set()) {
  const p = pnorm(display);
  if (!p) return null;
  // bei mehreren gleichwertigen Einträgen den mit Kürzel (abbr) bevorzugen – das ist der in der App gepflegte
  const pool = pubs.filter((x) => !exclude.has(x.id)).sort((a, b) => (b.abbr ? 1 : 0) - (a.abbr ? 1 : 0));
  const exact = pool.find((x) => (pnorm(x.name_display) === p || pnorm(x.name) === p));
  if (exact) return { row: exact, how: "gleich" };
  const alias = aliases.find((a) => pnorm(a.full_name) === p);
  if (alias) {
    const viaAlias = pool.find((x) => norm(x.abbr) && norm(x.abbr) === norm(alias.abbr_norm));
    if (viaAlias) return { row: viaAlias, how: "Alias" };
  }
  // "Droemersche Knaur" <-> "Droemer Knaur", "Ravensburger Buchverl." <-> "Ravensburger":
  // jedes längere Wort der einen Seite muss als Wortanfang in der anderen vorkommen; nur eindeutig.
  if (!usable(p)) return null;
  const pw = p.split(" ").filter((w) => w.length >= 4);
  const covers = (a, b) => a.every((w) => b.some((x) => x.length >= 4 && (x.startsWith(w) || w.startsWith(x))));
  const cand = pool.filter((x) => {
    const q = pnorm(x.name_display || x.name);
    if (!q || !usable(q)) return false;
    const qw = q.split(" ").filter((w) => w.length >= 4);
    // alle Wörter des gesuchten Namens stecken im vorhandenen, oder umgekehrt bei mindestens gleich vielen Wörtern
    return qw.length && (covers(pw, qw) || (qw.length >= pw.length && covers(qw, pw)));
  });
  const ids = [...new Set(cand.map((x) => x.id))];
  if (ids.length === 1) return { row: cand[0], how: "ähnlich" };
  return null;
}

async function loadLookups(db) {
  // nacheinander: dieselbe Verbindung darf nur eine Abfrage gleichzeitig ausführen
  const a = await db.query(`SELECT id, name, name_display, first_name, last_name FROM public.authors`);
  const p = await db.query(`SELECT id, name, name_display, abbr FROM public.publishers`);
  const al = await db.query(`SELECT abbr_norm, full_name FROM public.publisher_aliases`).catch(() => ({ rows: [] }));
  return { authors: a.rows, pubs: p.rows, aliases: al.rows };
}

/* ------------------------------------------------------------------ */
/* Auswahl des besten Treffers                                         */
/* ------------------------------------------------------------------ */
const sameTitle = (a, b) => { const x = norm(a), y = norm(b); return x && y && (x === y || x.startsWith(y) || y.startsWith(x)); };

function combine(cands, b) {
  const found = cands.filter(Boolean);
  if (!found.length) return null;
  const best = found[0]; // Reihenfolge: DNB, Google, Open Library
  const agree = found.filter((c) => sameTitle(c.title, best.title)).map((c) => c.source);
  const authors = best.authors.length ? best.authors : (found.find((c) => c.authors.length)?.authors || []);
  const publisher = best.publisher || found.find((c) => c.publisher)?.publisher || null;
  const pages = best.pages || found.find((c) => c.pages)?.pages || null;
  const why = [`${best.source}${agree.length > 1 ? ` (+${agree.slice(1).join(", ")})` : ""}`];
  let ok = best.source === "DNB" || agree.length >= 2;
  if (b.pages && pages) {
    const d = Math.abs(pages - b.pages) / b.pages;
    if (d <= 0.05) why.push("Seiten passen");
    else if (d <= 0.15) why.push("Seiten ~");
    else { why.push(`Seiten weichen ab (${pages} statt ${b.pages}) – ISBN falsch?`); ok = false; }
  }
  const lang = String(best.lang || "").toLowerCase();
  const bookLang = String(b.language || "de").toLowerCase();
  const isDe = /^(de|ger|deu)$/.test(lang);
  if (lang && bookLang === "de" && !isDe) { why.push(`Sprache ${lang}`); ok = false; }
  if (!authors.length) { why.push("kein Autor gefunden"); ok = false; }
  if (!publisher) why.push("kein Verlag gefunden");
  const subtitle = isGenreLabel(best.subtitle) ? "" : best.subtitle;
  return { ...best, subtitle, authors, publisher, pages, status: ok ? "auto" : "pruefen", why: why.join(", ") };
}

// DNB führt die Gattung als Untertitel ("Roman", "Thriller", "Roman zum Film") – das ist kein Untertitel.
const GENRE_RE = /^((der|ein) )?((historischer|psycho|kriminal|liebes|abenteuer|fantasy|science[- ]fiction|jugend|kinder|frauen|familien|gesellschafts|entwicklungs|schelmen)[- ]?)?(roman|thriller|krimi|kriminalroman|erzählung|erzählungen|novelle|novellen|geschichten|kurzgeschichten|gedichte|märchen|satire)( zum (großen )?(film|fernsehfilm|kinofilm))?$/i;
const isGenreLabel = (s) => GENRE_RE.test(String(s || "").trim());

/* ------------------------------------------------------------------ */
/* Modi                                                                */
/* ------------------------------------------------------------------ */
function makePool() {
  const { Pool } = require("pg");
  return new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

const MISSING_SQL = `
  (btrim(COALESCE(b.main_title_display, b.title_display, '')) = '' OR b.author_id IS NULL OR b.publisher_id IS NULL)`;

async function suggest() {
  const pool = makePool();
  const limit = Number(arg("--limit", 0)) || 0;
  const status = arg("--status", null);
  const out = path.resolve(process.cwd(), arg("--out", "isbn_vorschlaege.csv"));
  const params = [];
  let statusSql = "";
  if (status && status !== true) { params.push(status); statusSql = `AND b.reading_status = $1`; }
  const { rows } = await pool.query(`
    SELECT b.id, b.reading_status, b.isbn13, b.isbn10, b.isbn13_raw, b.pages, b.language,
           COALESCE(b.main_title_display, b.title_display) AS titel, b.subtitle_display,
           b.author_id, a.name_display AS autor, b.publisher_id, COALESCE(p.name_display, p.name) AS verlag
    FROM public.books b
    LEFT JOIN public.authors a ON a.id = b.author_id
    LEFT JOIN public.publishers p ON p.id = b.publisher_id
    WHERE ${MISSING_SQL} ${statusSql}
    ORDER BY b.added_at DESC NULLS LAST`, params);
  const lk = await loadLookups(pool);
  await pool.end();

  let books = rows;
  if (limit) books = books.slice(0, limit);
  console.log(`${rows.length} Bücher mit Lücken${status ? ` (Status ${status})` : ""}, bearbeite ${books.length} …`);

  const header = ["uebernehmen", "status", "begruendung", "reading_status", "isbn", "seiten_db", "seiten_gefunden",
    "titel_db", "titel_neu", "untertitel_neu", "autor_db", "autor_neu", "autor_abgleich",
    "verlag_db", "verlag_neu", "verlag_abgleich", "jahr_ausgabe", "quelle", "id"];
  const stats = { auto: 0, pruefen: 0, kein_treffer: 0, ohne_isbn: 0 };
  const results = new Array(books.length);
  const parallel = Math.max(1, Number(arg("--parallel", 4)) || 4);
  const t0 = Date.now();
  let done = 0;

  const writeOut = () => {
    const lines = [header.join(";"), ...results.filter(Boolean)];
    fs.writeFileSync(out, "﻿" + lines.join("\r\n") + "\r\n");
  };

  const work = async (i) => {
    const b = books[i];
    const isbn = normalizeIsbn(b.isbn13, b.isbn10, b.isbn13_raw);
    let r = null, st;
    if (!isbn) st = "ohne_isbn";
    else {
      const [dnb, g, ol] = await Promise.all([fromDNB(isbn), fromGoogle(isbn), fromOpenLibrary(isbn)]);
      r = combine([dnb, g, ol], b);
      st = r ? r.status : "kein_treffer";
    }
    stats[st]++;

    const needTitle = !String(b.titel || "").trim();
    const autorNeu = !b.author_id && r ? r.authors.join("; ") : "";
    const verlagNeu = !b.publisher_id && r ? (r.publisher || "") : "";
    const a1 = autorNeu ? findAuthor(lk.authors, r.authors[0]) : null;
    const p1 = verlagNeu ? findPublisher(lk.pubs, lk.aliases, verlagNeu) : null;

    results[i] = [
      st === "auto" ? "ja" : "nein", st, r?.why || (st === "ohne_isbn" ? "ISBN fehlt/ungültig – Cover nötig" : "nirgends gefunden – Cover nötig"),
      b.reading_status, isbn || b.isbn13_raw || b.isbn13 || b.isbn10 || "", b.pages ?? "", r?.pages ?? "",
      b.titel || "", needTitle && r ? r.title : "", needTitle && r && !b.subtitle_display ? (r.subtitle || "") : "",
      b.autor || "", autorNeu, autorNeu ? (a1 ? `vorhanden: ${a1.name_display || a1.name}` : "neu") : "",
      b.verlag || "", verlagNeu, verlagNeu ? (p1 ? `vorhanden (${p1.how}): ${p1.row.name_display || p1.row.name}` : "neu") : "",
      r?.year ?? "", r?.source || "", b.id,
    ].map(csvCell).join(";");

    if (++done % 25 === 0 || done === books.length) {
      const sec = (Date.now() - t0) / 1000;
      console.log(`  ${done}/${books.length}  noch ca. ${Math.round((sec / done) * (books.length - done) / 60)} min  ${JSON.stringify(stats)}`);
      writeOut();
    }
  };

  let next = 0;
  await Promise.all(Array.from({ length: parallel }, async () => {
    while (next < books.length) { const i = next++; await work(i); }
  }));
  writeOut();
  saveCache(true);
  console.log(`Fertig: ${JSON.stringify(stats)}\nPrüfliste: ${out}`);
}

async function resolveAuthor(c, lk, display) {
  const hit = findAuthor(lk.authors, display);
  if (hit) return { id: hit.id, created: false };
  const { first, last } = splitName(display);
  const key = display.toLowerCase().replace(/\s+/g, " ").trim();
  const { rows } = await c.query(
    `INSERT INTO public.authors (name, name_display, first_name, last_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, name_display, first_name, last_name`,
    [key, display, first, last]
  );
  lk.authors.push(rows[0]);
  return { id: rows[0].id, created: true };
}

async function resolvePublisher(c, lk, display) {
  const hit = findPublisher(lk.pubs, lk.aliases, display);
  if (hit) return { id: hit.row.id, created: false };
  const key = display.toLowerCase().replace(/\s+/g, " ").trim();
  const { rows } = await c.query(
    `INSERT INTO public.publishers (name, name_display)
     VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name, name_display, abbr`,
    [key, display]
  );
  lk.pubs.push(rows[0]);
  return { id: rows[0].id, created: true };
}

async function apply() {
  const file = arg("--apply");
  const commit = args.includes("--commit");
  const rows = parseCsv(fs.readFileSync(path.resolve(process.cwd(), file), "utf8"))
    .filter((r) => /^(ja|j|x|1|yes|y)$/i.test(r.uebernehmen) && r.id);
  if (!rows.length) { console.log("Keine Zeilen mit uebernehmen = ja gefunden."); return; }
  const all = rows.map((r) => [r.titel_neu, r.untertitel_neu, r.autor_neu, r.verlag_neu].join(" ")).join(" ");
  if (/Ã[\u0080-¿]|Â/.test(all)) throw new Error("Umlaute kaputt (Ã¤ statt ä) – CSV in Excel bitte als 'CSV UTF-8' speichern.");

  const pool = makePool();
  const c = await pool.connect();
  const n = { buecher: 0, titel: 0, untertitel: 0, autor: 0, verlag: 0, isbn: 0, neue_autoren: [], neue_verlage: [] };
  const skipped = [];
  try {
    await c.query("BEGIN");
    await c.query("ALTER TABLE public.books DISABLE TRIGGER trg_books_set_updated_at");
    const lk = await loadLookups(c);
    for (const r of rows) {
      const cur = (await c.query(
        `SELECT id, title_display, main_title_display, subtitle_display, author_id, publisher_id, isbn13
           FROM public.books WHERE id = $1::uuid FOR UPDATE`, [r.id])).rows[0];
      if (!cur) { skipped.push(`${r.id} (nicht gefunden)`); continue; }

      const set = {};
      const titleEmpty = !String(cur.main_title_display || cur.title_display || "").trim();
      if (titleEmpty && r.titel_neu?.trim()) { set.title_display = r.titel_neu.trim(); n.titel++; }
      if (!String(cur.subtitle_display || "").trim() && r.untertitel_neu?.trim()) { set.subtitle_display = r.untertitel_neu.trim(); n.untertitel++; }

      const authorNames = String(r.autor_neu || "").split(";").map((s) => s.trim()).filter(Boolean);
      if (!cur.author_id && authorNames.length) {
        const ids = [];
        for (const name of authorNames) {
          const a = await resolveAuthor(c, lk, name);
          if (a.created) n.neue_autoren.push(name);
          ids.push(a.id);
        }
        set.author_id = ids[0];
        if (ids.length > 1) set.authors_number = ids.length;
        n.autor++;
        for (let i = 0; i < ids.length; i++) {
          await c.query(
            `INSERT INTO public.book_authors (book_id, author_id, sort_order) VALUES ($1, $2, $3)
             ON CONFLICT (book_id, author_id) DO NOTHING`, [cur.id, ids[i], i + 1]);
        }
      }
      if (!cur.publisher_id && r.verlag_neu?.trim()) {
        const p = await resolvePublisher(c, lk, r.verlag_neu.trim());
        if (p.created) n.neue_verlage.push(r.verlag_neu.trim());
        set.publisher_id = p.id;
        n.verlag++;
      }
      const isbn = normalizeIsbn(r.isbn);
      if (!cur.isbn13 && isbn) { set.isbn13 = isbn; n.isbn++; }

      const keys = Object.keys(set);
      if (!keys.length) { skipped.push(`${r.titel_neu || r.id} (nichts mehr leer)`); continue; }
      await c.query(
        `UPDATE public.books SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(", ")} WHERE id = $1::uuid`,
        [cur.id, ...keys.map((k) => set[k])]
      );
      n.buecher++;
    }
    await c.query("ALTER TABLE public.books ENABLE TRIGGER trg_books_set_updated_at");
    await c.query(commit ? "COMMIT" : "ROLLBACK");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release(); await pool.end();
  }
  console.log(`${commit ? "GESPEICHERT" : "TESTLAUF (nichts gespeichert)"}: ${n.buecher} von ${rows.length} Büchern geändert.`);
  console.log(`  Titel ${n.titel}, Untertitel ${n.untertitel}, Autor ${n.autor}, Verlag ${n.verlag}, ISBN13 ${n.isbn}`);
  if (n.neue_autoren.length) console.log(`  Neue Autoren (${n.neue_autoren.length}): ${[...new Set(n.neue_autoren)].join(", ")}`);
  if (n.neue_verlage.length) console.log(`  Neue Verlage (${n.neue_verlage.length}): ${[...new Set(n.neue_verlage)].join(", ")}`);
  if (skipped.length) console.log(`Übersprungen:\n  ${skipped.join("\n  ")}`);
  if (!commit) console.log("Zum Speichern denselben Befehl mit --commit ausführen.");
}

/* ------------------------------------------------------------------ */
/* Reparatur nach dem ersten --apply (Verlag = Ort, "Roman" als Untertitel) */
/* ------------------------------------------------------------------ */
// node backend/scripts/enrichMissingByIsbn.js --repair isbn_vorschlaege.csv [--commit]
// Liest die DNB-Antworten aus dem Cache neu aus (keine neuen Abfragen nötig), setzt bei den
// damals ergänzten Büchern den richtigen Verlag, entfernt Gattungs-Untertitel ("Roman") und
// löscht die damals neu angelegten Verlage, die danach von keinem Buch mehr benutzt werden.
// Ein Buch wird nur angefasst, wenn sein Verlag/Untertitel noch genau der damals gesetzte ist.
const pubKey = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

async function repair() {
  const file = arg("--repair");
  const commit = args.includes("--commit");
  const rows = parseCsv(fs.readFileSync(path.resolve(process.cwd(), file), "utf8"))
    .filter((r) => /^(ja|j|x|1|yes|y)$/i.test(r.uebernehmen) && r.id);
  const oldNewKeys = new Set(rows.filter((r) => r.verlag_neu && r.verlag_abgleich === "neu").map((r) => pubKey(r.verlag_neu)));

  const pool = makePool();
  const c = await pool.connect();
  const changes = [], skipped = [];
  let subCleared = 0, deleted = [];
  try {
    await c.query("BEGIN");
    await c.query("ALTER TABLE public.books DISABLE TRIGGER trg_books_set_updated_at");
    const lk = await loadLookups(c);
    const createdIds = new Set(lk.pubs.filter((p) => oldNewKeys.has(pubKey(p.name))).map((p) => p.id));
    const pubName = (id) => { const p = lk.pubs.find((x) => x.id === id); return p ? (p.name_display || p.name) : "(leer)"; };

    for (const r of rows) {
      const cur = (await c.query(
        `SELECT id, publisher_id, subtitle_display FROM public.books WHERE id = $1::uuid FOR UPDATE`, [r.id])).rows[0];
      if (!cur) continue;
      const set = {};

      if (r.verlag_neu) {
        // welcher Verlag wurde damals gesetzt?
        let oldIds;
        if (r.verlag_abgleich === "neu") oldIds = lk.pubs.filter((p) => pubKey(p.name) === pubKey(r.verlag_neu)).map((p) => p.id);
        else {
          const nm = r.verlag_abgleich.replace(/^vorhanden( \([^)]*\))?:\s*/, "");
          oldIds = lk.pubs.filter((p) => (p.name_display || p.name) === nm).map((p) => p.id);
        }
        if (!oldIds.includes(cur.publisher_id)) {
          skipped.push(`${r.titel_neu || r.id}: Verlag inzwischen geändert – nicht angefasst`);
        } else {
          const isbn = normalizeIsbn(r.isbn);
          const best = isbn ? combine(await Promise.all([fromDNB(isbn), fromGoogle(isbn), fromOpenLibrary(isbn)]), { pages: null, language: "de" }) : null;
          const name = best?.publisher || null;
          let newId = null;
          const curPub = lk.pubs.find((x) => x.id === cur.publisher_id);
          const curFits = name && curPub && !createdIds.has(curPub.id) &&
            (pnorm(curPub.name_display) === pnorm(name) || pnorm(curPub.name) === pnorm(name));
          if (curFits) newId = cur.publisher_id; // vorhandener, passender Verlag bleibt – nicht auf eine Dublette umhängen
          else if (name) {
            const hit = findPublisher(lk.pubs, lk.aliases, name, createdIds) || findPublisher(lk.pubs, lk.aliases, name);
            newId = hit ? hit.row.id : (await resolvePublisher(c, lk, name)).id;
          }
          if (newId !== cur.publisher_id) {
            set.publisher_id = newId;
            changes.push(`${(r.titel_neu || r.titel_db || r.id).slice(0, 45)}: ${pubName(cur.publisher_id)} -> ${newId ? pubName(newId) : "(leer, Verlag unbekannt)"}`);
          }
        }
      }

      if (cur.subtitle_display && cur.subtitle_display === r.untertitel_neu && isGenreLabel(cur.subtitle_display)) {
        set.subtitle_display = null;
        subCleared++;
      }

      const keys = Object.keys(set);
      if (keys.length) {
        await c.query(`UPDATE public.books SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(", ")} WHERE id = $1::uuid`,
          [cur.id, ...keys.map((k) => set[k])]);
      }
    }

    if (createdIds.size) {
      const del = await c.query(
        `DELETE FROM public.publishers p
          WHERE p.id = ANY($1::uuid[])
            AND NOT EXISTS (SELECT 1 FROM public.books b WHERE b.publisher_id = p.id)
          RETURNING COALESCE(name_display, name) AS n`, [[...createdIds]]);
      deleted = del.rows.map((x) => x.n);
    }
    await c.query("ALTER TABLE public.books ENABLE TRIGGER trg_books_set_updated_at");
    await c.query(commit ? "COMMIT" : "ROLLBACK");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release(); await pool.end();
    saveCache(true);
  }
  console.log(`${commit ? "GESPEICHERT" : "TESTLAUF (nichts gespeichert)"}:`);
  console.log(`  Verlag korrigiert: ${changes.length}\n    ${changes.join("\n    ")}`);
  console.log(`  Gattungs-Untertitel entfernt ("Roman" u. ä.): ${subCleared}`);
  console.log(`  Überflüssige Verlage gelöscht (${deleted.length}): ${deleted.join(", ")}`);
  if (skipped.length) console.log(`Übersprungen:\n  ${skipped.join("\n  ")}`);
  if (!commit) console.log("Zum Speichern denselben Befehl mit --commit ausführen.");
}

module.exports = { normalizeIsbn, cleanPerson, cleanPublisher, pickDnbPublisher, findAuthor, findPublisher, combine, isGenreLabel, pnorm };

process.on("SIGINT", () => { saveCache(true); console.log("\nAbgebrochen – Zwischenstand gespeichert, nächster Lauf macht weiter."); process.exit(130); });

if (require.main === module) {
  const run = args.includes("--suggest") ? suggest : args.includes("--apply") ? apply : args.includes("--repair") ? repair : null;
  if (!run) {
    console.log("Aufruf:\n  node backend/scripts/enrichMissingByIsbn.js --suggest [--status in_stock] [--limit 30] [--out datei.csv]\n  node backend/scripts/enrichMissingByIsbn.js --apply datei.csv [--commit]\n  node backend/scripts/enrichMissingByIsbn.js --repair datei.csv [--commit]");
    process.exit(1);
  }
  run().catch((e) => { saveCache(true); console.error(e.message || e); process.exit(1); });
}

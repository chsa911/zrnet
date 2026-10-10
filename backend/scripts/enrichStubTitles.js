// backend/scripts/enrichStubTitles.js
//
// Findet Bücher, deren title_display nur aus Stichwörtern besteht (Altlasten aus
// dem Import, z. B. "Tod Tiber", "Sohn Schamanen"), sucht den vollständigen Titel
// bei DNB, Google Books und Open Library und schreibt eine Prüfliste (CSV).
// Erst ein zweiter, ausdrücklicher Schritt schreibt freigegebene Zeilen zurück.
//
// 1) Vorschläge erzeugen (liest nur aus der DB):
//      node backend/scripts/enrichStubTitles.js --suggest [--limit 50] [--parallel 6] [--timeout 8] [--out titel_vorschlaege.csv]
//    Optional: GOOGLE_BOOKS_API_KEY in .env (höheres Kontingent).
//    Abgebrochene Läufe setzen dank Cache (backend/scripts/.cache/stub_titles.json) fort.
//
// 2) CSV in Excel prüfen. Spalte "uebernehmen" = ja/nein, "neuer_titel" darf
//    angepasst werden. Speichern als "CSV UTF-8".
//
// 3) Testlauf (ändert nichts, Transaktion wird zurückgerollt):
//      node backend/scripts/enrichStubTitles.js --apply titel_vorschlaege.csv
//    Wirklich speichern:
//      node backend/scripts/enrichStubTitles.js --apply titel_vorschlaege.csv --commit
//
// Beim Speichern wird nur title_display gesetzt (und isbn13, falls bisher leer),
// und nur, wenn der Titel in der DB noch genau dem exportierten entspricht.
// "Letzte Aktion" (updated_at) bleibt unverändert.

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true) : def;
};

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */
const FUNCTION_WORDS = new Set(
  ("der die das des dem den ein eine einer eines einem einen und oder im am vom zum zur von mit " +
    "für fuer auf aus in an zu bei nach über ueber unter vor hinter wie wenn als ist sind war " +
    "the a an of and to in on for with from is").split(" ")
);

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
const words = (s) => norm(s).split(" ").filter(Boolean);

function stubReasons(b) {
  const w = words(b.title_display);
  const r = [];
  const kws = [b.title_keyword, b.title_keyword2, b.title_keyword3].filter(Boolean).flatMap(words);
  if (kws.length && w.length && w.every((x) => kws.includes(x))) r.push("nur_keywords");
  // Positionen der Keywords im echten Titel: Lücken oder Position > Wortzahl => Wörter fehlen
  // Steht jedes Keyword im aktuellen Titel an seiner gespeicherten Position? Wenn nicht, fehlen Wörter.
  const kp = kwPositions(b);
  const at = (k) => w[k.pos - 1] && (w[k.pos - 1] === k.word || (k.word.length >= 5 && w[k.pos - 1].startsWith(k.word.slice(0, -1))));
  if (kp.length && kp.some((k) => !at(k))) r.push("luecken_laut_position");
  if (kp.length && kp.every(at)) r.push("positionen_ok");
  if (w.length === 1) r.push("ein_wort");
  else if (w.length <= 4 && !w.some((x) => FUNCTION_WORDS.has(x))) r.push("ohne_artikel");
  if (b.is_legacy) r.push("altbestand");
  return r;
}
function kwPositions(b) {
  return [[b.title_keyword, b.title_keyword_position], [b.title_keyword2, b.title_keyword2_position], [b.title_keyword3, b.title_keyword3_position]]
    .filter(([k, p]) => k && Number(p) > 0)
    .map(([k, p]) => ({ word: words(k)[0], pos: Number(p) }))
    .filter((k) => k.word)
    .sort((a, c) => a.pos - c.pos);
}
function isStub(b) {
  // Regel: Jedes Buch hat Keywords. Ein vollständiger Titel besteht aber nicht NUR aus seinen
  // Keywords. Besteht title_display ausschließlich aus Keyword-Wörtern, ist es ein Stichwort-Titel.
  // (Positionen der Keywords fließen nur in die Bewertung der Treffer ein.)
  return stubReasons(b).includes("nur_keywords");
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */
const CACHE_FILE = path.resolve(__dirname, ".cache/stub_titles.json");
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch { /* new cache */ }
let cacheDirty = 0;
function saveCache(force) {
  if (!force && cacheDirty < 20) return;
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  cacheDirty = 0;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TIMEOUT_MS = Number(arg("--timeout", 8)) * 1000;
async function getCached(url, kind) {
  if (cache[url] !== undefined) return cache[url];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "zrnet-title-enrichment/1.0" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status === 429 || res.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
      const body = kind === "json" ? (res.ok ? await res.json() : null) : (res.ok ? await res.text() : null);
      cache[url] = body; cacheDirty++; saveCache();
      return body;
    } catch {
      await sleep(500);
    }
  }
  return null; // not cached -> retried next run
}

function splitTitle(t, stubWords) {
  // "Titel : Untertitel / Verfasser"  ->  {title, subtitle}
  let s = String(t || "").split(" / ")[0].replace(/\s+/g, " ").trim();
  // "[Originaltitel] ; Deutscher Titel" -> Teil mit den meisten Stichwörtern; eckige Klammern entfernen
  const parts = s.split(/\s+;\s+/).map((x) => x.replace(/\[[^\]]*\]/g, "").trim()).filter(Boolean);
  if (parts.length > 1 && stubWords && stubWords.length) {
    const sc = (x) => stubWords.filter((w) => norm(x).includes(w)).length;
    parts.sort((a, b) => sc(b) - sc(a));
  }
  s = (parts[0] || s).replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
  const m = s.match(/^(.*?)\s+:\s+(.*)$/);
  const clean = (x) => x.replace(/^\[|\]$/g, "").trim();
  return m ? { title: m[1].trim(), subtitle: clean(m[2]) } : { title: s, subtitle: "" };
}
const xmlAll = (xml, tag) =>
  [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g"))].map((m) =>
    m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim()
  );

async function searchDNB(q, isbn) {
  const cql = isbn ? `num=${isbn}` : [...q.words.map((w) => `tit=${w}`), ...(q.author ? [`per=${q.author}`] : [])].join(" and ");
  const url = `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=oai_dc&maximumRecords=10&query=${encodeURIComponent(cql)}`;
  const xml = await getCached(url, "text");
  if (!xml) return [];
  return xml.split("<record>").slice(1).map((rec) => {
    const { title, subtitle } = splitTitle(xmlAll(rec, "dc:title")[0], q.words);
    const isbn13 = (xmlAll(rec, "dc:identifier").join(" ").match(/97[89][0-9-]{10,14}/) || [""])[0].replace(/-/g, "");
    const pages = Number((xmlAll(rec, "dc:format").join(" ").match(/(\d+)\s*S\./) || [])[1]) || null;
    return { source: "DNB", title, subtitle, authors: xmlAll(rec, "dc:creator"), pages, isbn13, lang: xmlAll(rec, "dc:language")[0] || "" };
  }).filter((c) => c.title);
}

async function searchGoogle(q, isbn) {
  const key = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}` : "";
  const qq = isbn ? `isbn:${isbn}` : [...q.words.map((w) => `intitle:${w}`), ...(q.author ? [`inauthor:${q.author}`] : [])].join("+");
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(qq).replace(/%2B/g, "+")}&maxResults=10&printType=books${key}`;
  const j = await getCached(url, "json");
  return (j?.items || []).map((it) => {
    const v = it.volumeInfo || {};
    const isbn13 = (v.industryIdentifiers || []).find((x) => x.type === "ISBN_13")?.identifier || "";
    return { source: "Google", title: v.title || "", subtitle: v.subtitle || "", authors: v.authors || [], pages: v.pageCount || null, isbn13, lang: v.language || "" };
  }).filter((c) => c.title);
}

async function searchOpenLibrary(q, isbn) {
  const qs = isbn ? `isbn=${isbn}` : `title=${encodeURIComponent(q.words.join(" "))}${q.author ? `&author=${encodeURIComponent(q.author)}` : ""}`;
  const url = `https://openlibrary.org/search.json?${qs}&limit=10&fields=title,subtitle,author_name,number_of_pages_median,isbn,language`;
  const j = await getCached(url, "json");
  return (j?.docs || []).map((d) => ({
    source: "OpenLibrary", title: d.title || "", subtitle: d.subtitle || "", authors: d.author_name || [],
    pages: d.number_of_pages_median || null, isbn13: (d.isbn || []).find((x) => /^97[89]\d{10}$/.test(x)) || "", lang: (d.language || [])[0] || "",
  })).filter((c) => c.title);
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */
function scoreCandidate(c, b, byIsbn) {
  const stub = words(b.title_display);
  const full = norm(`${c.title} ${c.subtitle}`);
  const fullWords = full.split(" ");
  const hit = (w) => fullWords.some((fw) => fw === w || (w.length >= 5 && fw.startsWith(w.slice(0, -1))));
  const hits = stub.filter(hit).length;
  if (!byIsbn && hits < stub.length) return { score: 0, why: "Stichwörter fehlen" };
  // ISBN-Treffer können Original-/Fremdsprachausgaben sein -> Stichwörter müssen trotzdem überwiegend passen
  if (byIsbn && hits < Math.max(1, Math.ceil(stub.length * 0.6))) return { score: 0, why: "ISBN, aber anderer Titel (Original?)" };
  let score = byIsbn ? 70 : 40;
  const why = [byIsbn ? "ISBN" : "Stichwörter"];
  // order of keywords in title
  const idx = stub.map((w) => fullWords.findIndex((fw) => fw === w || fw.startsWith(w.slice(0, -1))));
  if (!byIsbn && idx.every((v, i) => i === 0 || v >= idx[i - 1])) { score += 10; why.push("Reihenfolge"); }
  // Keyword-Positionen aus der DB: steht das Wort an der erwarteten Stelle im gefundenen Titel?
  const kp = kwPositions(b);
  if (kp.length) {
    const titleWords = norm(c.title).split(" ");
    const ok = kp.filter((k) => titleWords[k.pos - 1] && (titleWords[k.pos - 1] === k.word || titleWords[k.pos - 1].startsWith(k.word.slice(0, -1)))).length;
    if (ok === kp.length) { score += 15; why.push("Positionen passen"); }
  }
  // author
  const PARTICLES = new Set(["de", "da", "del", "von", "van", "der", "den", "le", "la", "di", "du", "y"]);
  const lastParts = norm(b.author_last).split(" ").filter((x) => x.length > 1 && !PARTICLES.has(x));
  if (lastParts.length) {
    const ok = c.authors.some((a) => { const aw = norm(a).split(" "); return lastParts.every((p) => aw.includes(p)); });
    if (ok) { score += 30; why.push("Autor"); }
    else { score -= 25; why.push("anderer Autor"); }
  }
  // Fremdsprachige Ausgaben (z. B. ungarisch) abwerten; de/en bleiben neutral
  if (c.lang && !/^(de|ger|deu|en|eng|)$/i.test(c.lang.trim())) { score -= 25; why.push(`Sprache ${c.lang}`); }
  // pages
  if (b.pages && c.pages) {
    const d = Math.abs(c.pages - b.pages) / b.pages;
    if (d <= 0.05) { score += 20; why.push("Seiten"); c._pagesOk = true; }
    else if (d <= 0.15) { score += 10; why.push("Seiten ~"); }
    else if (d > 0.35) { score -= 10; why.push("Seiten weit weg"); }
  }
  if (fullWords.length > stub.length * 6 + 6) score -= 5;
  return { score, why: why.join(", ") };
}

function pickBest(cands, b, byIsbn) {
  const scored = cands.map((c) => ({ ...c, ...scoreCandidate(c, b, byIsbn) })).filter((c) => c.score > 0);
  // agreement between sources
  const count = {};
  for (const c of scored) { const k = norm(c.title); count[k] = (count[k] || new Set()).add(c.source); }
  for (const c of scored) if (count[norm(c.title)].size >= 2) { c.score += 15; c.why += ", mehrere Quellen"; }
  scored.sort((a, b2) => b2.score - a.score);
  const best = scored[0];
  if (best && best.title === best.title.toLowerCase()) {
    const alt = cands.find((c) => norm(c.title) === norm(best.title) && c.title !== c.title.toLowerCase());
    if (alt) best.title = alt.title;
  }
  return best || null;
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */
const csvCell = (v) => { const s = v == null ? "" : String(v); return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function parseCsv(text) {
  text = text.replace(/^﻿/, "");
  const delim = (text.split("\n")[0].match(/;/g) || []).length >= (text.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  const [head, ...rest] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  return rest.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

/* ------------------------------------------------------------------ */
/* Modes                                                               */
/* ------------------------------------------------------------------ */
function makePool() {
  const { Pool } = require("pg");
  return new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

async function suggest() {
  const pool = makePool();
  const limit = Number(arg("--limit", 0)) || 0;
  const out = path.resolve(process.cwd(), arg("--out", "titel_vorschlaege.csv"));
  const { rows } = await pool.query(`
    SELECT b.id, b.title_display, b.pages, b.isbn13, b.isbn10, b.reading_status,
           b.title_keyword, b.title_keyword2, b.title_keyword3,
           b.title_keyword_position, b.title_keyword2_position, b.title_keyword3_position,
           COALESCE(NULLIF(a.last_name,''), NULLIF(a.name_display,''), NULLIF(b.author,'')) AS author_last,
           COALESCE(a.name_display, b.author) AS author_full,
           (b.mongo_id IS NOT NULL OR date_trunc('day', b.registered_at AT TIME ZONE 'Europe/Berlin') = date '2025-12-27') AS is_legacy,
           (SELECT string_agg(DISTINCT v, ' | ') FROM jsonb_each_text(COALESCE(b.raw,'{}'::jsonb)) AS e(k,v)
             WHERE e.k ~* 'tit' AND length(v) BETWEEN 3 AND 300 AND lower(v) <> lower(b.title_display)) AS raw_title
    FROM public.books b
    LEFT JOIN public.authors a ON a.id = b.author_id
    WHERE btrim(COALESCE(b.title_display,'')) <> ''
    ORDER BY b.title_display`);
  await pool.end();

  let books = rows.filter(isStub);
  const cnt = {};
  for (const b of books) for (const x of stubReasons(b)) cnt[x] = (cnt[x] || 0) + 1;
  console.log(`${rows.length} Bücher geprüft, ${books.length} sehen nach Stichwort-Titel aus. Gründe: ${JSON.stringify(cnt)}`);
  // one lookup per (title, author); copies share the result
  const groups = new Map();
  for (const b of books) {
    const k = `${norm(b.title_display)}|${norm(b.author_last)}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(b);
  }
  let keys = [...groups.keys()];
  if (limit) keys = keys.slice(0, limit);
  console.log(`Suche für ${keys.length} verschiedene Titel …`);

  const header = ["uebernehmen", "status", "score", "aktueller_titel", "neuer_titel", "untertitel_gefunden", "autor",
    "gefunden_autor", "seiten", "gefunden_seiten", "isbn13", "neue_isbn13", "quelle", "begruendung", "stub_grund", "raw_titel", "id"];
  const parallel = Math.max(1, Number(arg("--parallel", 6)) || 6);
  const stats = { auto: 0, pruefen: 0, kein_treffer: 0, unveraendert: 0 };
  const results = new Map();
  const t0 = Date.now();
  let n = 0;
  const writeOut = () => {
    const lines = [header.join(";")];
    for (const k of keys) if (results.has(k)) lines.push(...results.get(k));
    fs.writeFileSync(out, "\uFEFF" + lines.join("\r\n") + "\r\n");
  };
  const work = async (k) => {
    const grp = groups.get(k);
    const b = grp[0];
    const isbn = (b.isbn13 || b.isbn10 || "").replace(/[^0-9X]/gi, "") || null;
    const last = String(b.author_last || "").split(/[\s,;]+/).filter((x) => x.length > 2).pop() || "";
    const q = { words: words(b.title_display).filter((w) => !FUNCTION_WORDS.has(w)).slice(0, 5), author: last };
    let best = null;
    if (isbn) {
      const c = (await Promise.all([searchDNB(q, isbn), searchGoogle(q, isbn), searchOpenLibrary(q, isbn)])).flat();
      best = pickBest(c, b, true);
    }
    if (!best || best.score < 80) {
      const c = (await Promise.all([searchDNB(q), searchGoogle(q), searchOpenLibrary(q)])).flat();
      const b2 = pickBest(c, b, false);
      if (b2 && (!best || b2.score > best.score)) best = b2;
    }
    let status, newTitle = "";
    if (!best) status = "kein_treffer";
    else {
      newTitle = best.title;
      if (norm(newTitle) === norm(b.title_display)) status = "unveraendert";
      else status = best.score >= 85 ? "auto" : best.score >= 55 ? "pruefen" : "kein_treffer";
      const oneWord = words(b.title_display).length === 1;
      if (status === "auto" && oneWord && !/Seiten(,|$)/.test(best.why) && !best.why.startsWith("ISBN")) status = "pruefen";
      if (status === "kein_treffer") newTitle = "";
    }
    stats[status]++;
    results.set(k, grp.map((bk) => [
      status === "auto" ? "ja" : "nein", status, best?.score ?? "", bk.title_display, newTitle, best?.subtitle || "",
      bk.author_full || "", (best?.authors || []).map((a) => a.replace(/\s*\[[^\]]*\]/g, "").trim()).filter((a, i, arr) => a && arr.indexOf(a) === i).join("; "), bk.pages || "", best?.pages || "", bk.isbn13 || "",
      bk.isbn13 ? "" : (best?.isbn13 || ""), best?.source || "", best?.why || "", stubReasons(bk).join(","), bk.raw_title || "", bk.id,
    ].map(csvCell).join(";")));
    if (++n % 25 === 0 || n === keys.length) {
      const sec = (Date.now() - t0) / 1000;
      const rest = Math.round((sec / n) * (keys.length - n) / 60);
      console.log(`  ${n}/${keys.length}  noch ca. ${rest} min  ${JSON.stringify(stats)}`);
      writeOut();
    }
  };
  let next = 0;
  await Promise.all(Array.from({ length: parallel }, async () => {
    while (next < keys.length) { const k = keys[next++]; await work(k); }
  }));
  writeOut();
  saveCache(true);
  console.log(`Fertig: ${JSON.stringify(stats)}\nPrüfliste: ${out}`);
}

async function apply() {
  const file = arg("--apply");
  const commit = args.includes("--commit");
  const rows = parseCsv(fs.readFileSync(path.resolve(process.cwd(), file), "utf8"))
    .filter((r) => /^(ja|j|x|1|yes|y)$/i.test(r.uebernehmen) && r.neuer_titel && r.id);
  if (!rows.length) { console.log("Keine Zeilen mit uebernehmen = ja und neuer_titel gefunden."); return; }
  if (rows.some((r) => /Ã|Â/.test(r.neuer_titel + r.aktueller_titel)))
    throw new Error("Umlaute kaputt (Ã¤ statt ä) – CSV in Excel bitte als 'CSV UTF-8' speichern.");

  const pool = makePool();
  const c = await pool.connect();
  let changed = 0, skipped = [];
  try {
    await c.query("BEGIN");
    await c.query("ALTER TABLE public.books DISABLE TRIGGER trg_books_set_updated_at");
    for (const r of rows) {
      const isbn = /^97[89]\d{10}$/.test(r.neue_isbn13) ? r.neue_isbn13 : null;
      const res = await c.query(
        `UPDATE public.books
            SET title_display = $2, isbn13 = COALESCE(NULLIF(isbn13,''), $4)
          WHERE id = $1::uuid AND title_display = $3`,
        [r.id, r.neuer_titel.trim(), r.aktueller_titel, isbn]
      );
      if (res.rowCount) changed++; else skipped.push(`${r.aktueller_titel} (${r.id})`);
    }
    await c.query("ALTER TABLE public.books ENABLE TRIGGER trg_books_set_updated_at");
    await c.query(commit ? "COMMIT" : "ROLLBACK");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release(); await pool.end();
  }
  console.log(`${commit ? "GESPEICHERT" : "TESTLAUF (nichts gespeichert)"}: ${changed} von ${rows.length} Büchern geändert.`);
  if (skipped.length) console.log(`Übersprungen (Titel in der DB inzwischen anders):\n  ${skipped.join("\n  ")}`);
  if (!commit) console.log("Zum Speichern denselben Befehl mit --commit ausführen.");
}

module.exports = { kwPositions, norm, words, stubReasons, isStub, scoreCandidate, pickBest, splitTitle, parseCsv, csvCell };

process.on("SIGINT", () => { saveCache(true); console.log("\nAbgebrochen – Zwischenstand gespeichert, nächster Lauf macht weiter."); process.exit(130); });

if (require.main === module) {
  const run = args.includes("--suggest") ? suggest : args.includes("--apply") ? apply : null;
  if (!run) {
    console.log("Aufruf:\n  node backend/scripts/enrichStubTitles.js --suggest [--limit 50] [--out datei.csv]\n  node backend/scripts/enrichStubTitles.js --apply datei.csv [--commit]");
    process.exit(1);
  }
  run().catch((e) => { saveCache(true); console.error(e.message || e); process.exit(1); });
}

// backend/services/isbnSources.js
//
// Gemeinsame Bausteine für die ISBN-Suche beim Scannen (routes/enrich.js):
//   - Deutsche Nationalbibliothek (DNB, SRU-Schnittstelle, oai_dc)
//   - Bereinigen von Personen- und Verlagsnamen
//   - Abgleich eines gefundenen Verlagsnamens mit der Verlagstabelle
//     (inkl. Kürzel über publisher_aliases), damit z.B. "Fischer-Taschenbuch-Verl."
//     auf den vorhandenen Verlag "Fischer" (f.) zeigt statt einen neuen anzulegen.
//   - Verlag aus der ISBN-Verlagsnummer ableiten, wenn keine Quelle einen liefert.
//
// Die Logik entspricht scripts/enrichMissingByIsbn.js (dort für die Nachbearbeitung).

/* ------------------------------------------------------------------ */
/* Text-Helfer                                                         */
/* ------------------------------------------------------------------ */
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const xmlAll = (xml, tag) =>
  [...String(xml || "").matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "g"))].map((m) =>
    m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim()
  );

// "Titel : Untertitel / Verfasser" -> { title, subtitle, responsibility }
function splitTitle(raw) {
  const full = String(raw || "").replace(/\s+/g, " ").trim();
  const [head, ...resp] = full.split(" / ");
  let s = head.split(/\s+;\s+/)[0].replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
  const m = s.match(/^(.*?)\s+:\s+(.*)$/);
  const clean = (x) => x.replace(/^\[|\]$/g, "").trim();
  return {
    title: m ? m[1].trim() : s,
    subtitle: m ? clean(m[2]) : "",
    responsibility: resp.join(" / ").trim(),
  };
}

// DNB führt die Gattung oft als Untertitel ("Roman", "Thriller") – das ist kein Untertitel.
const GENRE_RE = /^((der|ein) )?((historischer|psycho|kriminal|liebes|abenteuer|fantasy|science[- ]fiction|jugend|kinder|frauen|familien|gesellschafts|entwicklungs|schelmen)[- ]?)?(roman|thriller|krimi|kriminalroman|erzählung|erzählungen|novelle|novellen|geschichten|kurzgeschichten|gedichte|märchen|satire)( zum (großen )?(film|fernsehfilm|kinofilm))?$/i;
const isGenreLabel = (s) => GENRE_RE.test(String(s || "").trim());

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

// Verfasserangabe aus dem Titel ("… / Peter Huber. Aus dem Engl. von …") -> ["Peter Huber"]
function authorsFromResponsibility(resp) {
  const first = String(resp || "").split(/\s*[;.]\s+(?=[A-ZÄÖÜa-zäöü])/)[0] || "";
  if (!first || NON_AUTHOR_ROLE.test(first) || /^(hrsg|von der|bearb|zsgest|ausgew)/i.test(first)) return [];
  return first
    .replace(/^(von|by|de)\s+/i, "")
    .split(/\s+(?:und|u\.|&|and)\s+|,\s+/)
    .map((x) => x.trim())
    .filter((x) => x && /\s/.test(x) && x.length <= 60 && !/\d/.test(x));
}

const uniq = (arr) => arr.filter((x, i) => x && arr.findIndex((y) => norm(y) === norm(x)) === i);

// "München : Goldmann" -> "Goldmann"; "Berlin : Ullstein ; München : Econ" -> "Ullstein"
function cleanPublisher(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const i = s.indexOf(" : ");
  const rest = i >= 0 ? s.slice(i + 3) : s;
  return rest.split(/\s+;\s+|\s+:\s+/)[0].replace(/^\[|\]$/g, "").trim() || null;
}

// DNB liefert oft mehrere dc:publisher, manche nur mit Ort ("München").
function pickDnbPublisher(entries) {
  const withName = entries.find((e) => / : /.test(e));
  return withName ? cleanPublisher(withName) : null;
}

/* ------------------------------------------------------------------ */
/* DNB                                                                 */
/* ------------------------------------------------------------------ */
async function fetchText(url, ms = 4000) {
  const r = await fetch(url, {
    headers: { "User-Agent": "zrnet-isbn-lookup/1.0" },
    signal: AbortSignal.timeout(ms),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} from ${new URL(url).host}`);
  return r.text();
}

function parseDnbRecord(xml) {
  const rec = String(xml || "").split("<record>").slice(1)[0];
  if (!rec) return null;
  const { title, subtitle, responsibility } = splitTitle(xmlAll(rec, "dc:title")[0] || "");
  if (!title) return null;
  let authors = uniq(xmlAll(rec, "dc:creator").map(cleanPerson));
  if (!authors.length) authors = uniq(authorsFromResponsibility(responsibility));
  return {
    source: "dnb",
    title,
    subtitle: isGenreLabel(subtitle) ? "" : subtitle,
    authors,
    publisher: pickDnbPublisher(xmlAll(rec, "dc:publisher")),
    pages: Number((xmlAll(rec, "dc:format").join(" ").match(/(\d+)\s*S(eiten|\.)/) || [])[1]) || null,
    language: xmlAll(rec, "dc:language")[0] || null,
  };
}

async function fromDNB(n, ms = 4000) {
  const q = n.isbn13 || n.isbn10;
  if (!q) return null;
  const url = `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=oai_dc&maximumRecords=1&query=${encodeURIComponent(`num=${q}`)}`;
  return parseDnbRecord(await fetchText(url, ms));
}

/* ------------------------------------------------------------------ */
/* Verlagsabgleich                                                     */
/* ------------------------------------------------------------------ */
const PUB_NOISE = new Set(["verlag", "verl", "vlg", "verlage", "verlagsgruppe", "verlagshaus", "verlagsanstalt", "verlagsges", "ges",
  "gmbh", "co", "kg", "ag", "mbh", "inc", "ltd", "taschenbuch", "taschenbuecher", "taschenbuchverl", "taschenbuchverlag",
  "tb", "edition", "ed", "publishing", "publ", "publishers", "books", "buchverlag", "buchverl", "vertrieb", "und", "the"]);
const PUB_SPECIAL = [
  [/^(dt|deutsche) verl(ags)? (anst|anstalt)$/, "dva"],
  [/^deutsche verlags anstalt$/, "dva"],
  [/^(dt|deutscher) taschenbuch( verl(ag)?)?$/, "dtv"],
  [/^(dt|deutscher) taschenbuch verl$/, "dtv"],
];
function pnorm(s) {
  const n = norm(s);
  for (const [re, v] of PUB_SPECIAL) if (re.test(n)) return v;
  return n.split(" ")
    .map((w) => w.replace(/(buch)?verl(ag)?$/, "") || w)
    .filter((w) => w && !PUB_NOISE.has(w))
    .join(" ");
}
const usable = (q) => q.split(" ").some((w) => w.length >= 4) || /^(dtv|dva|btb|cbt|cbj|blv|rororo)$/.test(q);

function findPublisher(pubs, aliases, display) {
  const p = pnorm(display);
  if (!p) return null;
  // bei gleichwertigen Einträgen den mit Kürzel bevorzugen
  const pool = [...pubs].sort((a, b) => (b.abbr ? 1 : 0) - (a.abbr ? 1 : 0));
  const exact = pool.find((x) => pnorm(x.name_display) === p || pnorm(x.name) === p);
  if (exact) return { row: exact, how: "gleich" };
  const alias = aliases.find((a) => pnorm(a.full_name) === p);
  if (alias) {
    const viaAlias = pool.find((x) => norm(x.abbr) && norm(x.abbr) === norm(alias.abbr_norm));
    if (viaAlias) return { row: viaAlias, how: "Alias" };
  }
  if (!usable(p)) return null;
  const pw = p.split(" ").filter((w) => w.length >= 4);
  const covers = (a, b) => a.every((w) => b.some((x) => x.length >= 4 && (x.startsWith(w) || w.startsWith(x))));
  const cand = pool.filter((x) => {
    const q = pnorm(x.name_display || x.name);
    if (!q || !usable(q)) return false;
    const qw = q.split(" ").filter((w) => w.length >= 4);
    return qw.length && (covers(pw, qw) || (qw.length >= pw.length && covers(qw, pw)));
  });
  const ids = [...new Set(cand.map((x) => x.id))];
  if (ids.length === 1) return { row: cand[0], how: "ähnlich" };
  return null;
}

// Verlagstabelle für den Abgleich (5 Minuten zwischengespeichert)
let pubCache = { at: 0, pubs: [], aliases: [] };
async function loadPublishers(pool) {
  if (Date.now() - pubCache.at < 5 * 60 * 1000 && pubCache.pubs.length) return pubCache;
  const p = await pool.query(`SELECT id, name, name_display, abbr FROM public.publishers`);
  const a = await pool.query(`SELECT abbr_norm, full_name FROM public.publisher_aliases`).catch(() => ({ rows: [] }));
  pubCache = { at: Date.now(), pubs: p.rows, aliases: a.rows };
  return pubCache;
}

async function resolvePublisher(pool, display) {
  if (!display) return null;
  const { pubs, aliases } = await loadPublishers(pool);
  const hit = findPublisher(pubs, aliases, display);
  return hit ? hit.row : null;
}

/* ------------------------------------------------------------------ */
/* Verlag aus der ISBN-Verlagsnummer                                   */
/* ------------------------------------------------------------------ */
// Länge der Verlagsnummer in den Gruppen 0, 1 (englisch) und 3 (deutsch)
const RANGES = [[2, 0, 19], [3, 200, 699], [4, 7000, 8499], [5, 85000, 89999], [6, 900000, 949999], [7, 9500000, 9999999]];
function isbnPublisherPrefix(isbn13) {
  const s = String(isbn13 || "");
  if (!/^97[89]\d{10}$/.test(s)) return null;
  const group = s[3];
  if (!"013".includes(group)) return null;
  const rest = s.slice(4);
  for (const [len, lo, hi] of RANGES) {
    const v = Number(rest.slice(0, len));
    if (v >= lo && v <= hi) return s.slice(0, 4 + len); // z.B. "9783596" für Fischer
  }
  return null;
}

// Mehrheit der Bücher mit derselben Verlagsnummer (mind. 2 Bücher und 60 %)
async function guessPublisherByPrefix(pool, isbn13) {
  const prefix = isbnPublisherPrefix(isbn13);
  if (!prefix) return null;
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.name_display, p.abbr, count(*)::int AS n,
            sum(count(*)) OVER ()::int AS total
       FROM public.books b
       JOIN public.publishers p ON p.id = b.publisher_id
      WHERE b.isbn13 LIKE $1
        AND p.name NOT IN ('Unknown', 'unbekannt')
        AND p.name NOT LIKE '\\_\\_LEGACY\\_\\_%'
      GROUP BY p.id, p.name, p.name_display, p.abbr
      ORDER BY n DESC
      LIMIT 1`,
    [`${prefix}%`]
  );
  const r = rows[0];
  if (!r || r.n < 2 || r.n / r.total < 0.6) return null;
  return { ...r, prefix };
}

/* ------------------------------------------------------------------ */
/* ISBN-Schreibweisen für den Datenbank-Abgleich                       */
/* ------------------------------------------------------------------ */
// Liefert alle normalisierten Schreibweisen (nur Ziffern/X, ISBN-10 und
// ISBN-13) der übergebenen Werte – passend zu
// regexp_replace(upper(isbn), '[^0-9X]', '', 'g') in SQL.
// Wird von routes/admin.js (/drafts/find) und booksPgController.js genutzt.
function isbnVariants(...inputs) {
  const out = new Set();
  const clean = (v) => String(v ?? "").toUpperCase().replace(/[^0-9X]/g, "");
  const to13 = (d10) => {
    const core = "978" + d10.slice(0, 9);
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 ? 3 : 1);
    return core + ((10 - (sum % 10)) % 10);
  };
  const to10 = (d13) => {
    const core = d13.slice(3, 12);
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(core[i]) * (10 - i);
    const c = (11 - (sum % 11)) % 11;
    return core + (c === 10 ? "X" : String(c));
  };
  for (const raw of inputs.flat()) {
    const d = clean(raw);
    if (/^\d{9}[\dX]$/.test(d)) {
      out.add(d);
      out.add(to13(d));
    } else if (/^\d{13}$/.test(d)) {
      out.add(d);
      if (d.startsWith("978")) out.add(to10(d));
    }
  }
  return [...out];
}

module.exports = {
  isbnVariants,
  norm, splitTitle, cleanPerson, authorsFromResponsibility, cleanPublisher, pickDnbPublisher,
  parseDnbRecord, fromDNB, pnorm, findPublisher, resolvePublisher, isbnPublisherPrefix, guessPublisherByPrefix,
};

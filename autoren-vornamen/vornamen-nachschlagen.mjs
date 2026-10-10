// Schlägt fehlende Vornamen von Autoren nach (Open Library + Google Books).
// Aufruf:  node vornamen-nachschlagen.mjs
// Eingabe: autoren_ohne_vorname.csv (gleicher Ordner)
// Ausgabe: vornamen_vorschlaege.csv (wird laufend geschrieben, Abbruch + Neustart setzt fort)
// Schreibt NICHTS in die Datenbank.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const IN = path.join(DIR, 'autoren_ohne_vorname.csv');
const OUT = path.join(DIR, 'vornamen_vorschlaege.csv');
const CACHE = path.join(DIR, '.vornamen_cache.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- CSV ----------
function parseCSV(text) {
  const rows = []; let row = []; let f = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { f += '"'; i++; }
      else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [h, ...rest] = rows;
  return rest.filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
}
const esc = (v) => { v = String(v ?? ''); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };

// ---------- Hilfen ----------
const norm = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/ß/g, 'ss').replace(/[^a-z0-9' -]/g, '').trim();
// "Keneally" passt zu "Thomas Keneally", "Keneally, Thomas", "Thomas Michael Keneally"
function firstNameFrom(full, last) {
  let n = String(full || '').trim();
  if (n.includes(',')) { const [l, f] = n.split(',', 2).map((x) => x.trim()); n = `${f} ${l}`; }
  const L = norm(last);
  const nn = norm(n);
  if (!L || !nn.endsWith(L)) return null;
  const words = n.split(/\s+/); const lw = last.trim().split(/\s+/).length;
  const first = words.slice(0, Math.max(0, words.length - lw)).join(' ').trim();
  if (!first || first.length < 2 || !/^\p{Lu}/u.test(first)) return null;
  return { first, full: `${first} ${last.trim()}` };
}

let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch {}
const saveCache = () => fs.writeFileSync(CACHE, JSON.stringify(cache));

async function getJSON(url, tries = 3) {
  if (cache[url] !== undefined) return cache[url];
  for (let t = 0; t < tries; t++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'zrnet-author-cleanup/1.0' } });
      if (r.status === 429 || r.status >= 500) { await sleep(3000 * (t + 1)); continue; }
      const j = r.ok ? await r.json() : null;
      cache[url] = j; return j;
    } catch { await sleep(2000 * (t + 1)); }
  }
  return null;
}

// ---------- Quellen ----------
async function openLibraryIsbns(isbns) { // Batch
  const out = {};
  for (let i = 0; i < isbns.length; i += 50) {
    const chunk = isbns.slice(i, i + 50);
    const j = await getJSON(`https://openlibrary.org/api/books?bibkeys=${chunk.map((x) => 'ISBN:' + x).join(',')}&format=json&jscmd=data`);
    for (const [k, v] of Object.entries(j || {})) out[k.slice(5)] = (v.authors || []).map((a) => a.name);
    await sleep(400);
  }
  return out;
}
async function googleIsbn(isbn) {
  const j = await getJSON(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=3`);
  return (j?.items || []).flatMap((it) => it.volumeInfo?.authors || []);
}
async function openLibraryTitle(title, last) {
  const j = await getJSON(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(last)}&fields=author_name&limit=5`);
  return (j?.docs || []).flatMap((d) => d.author_name || []);
}
async function googleTitle(title, last) {
  const j = await getJSON(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`intitle:"${title}" inauthor:${last}`)}&maxResults=5`);
  return (j?.items || []).flatMap((it) => it.volumeInfo?.authors || []);
}

// ---------- Ablauf ----------
const authors = parseCSV(fs.readFileSync(IN, 'utf8'));
const done = new Set();
if (fs.existsSync(OUT)) for (const r of parseCSV(fs.readFileSync(OUT, 'utf8'))) done.add(r.id);
else fs.writeFileSync(OUT, ['id', 'last_name', 'vorschlag_vorname', 'vorschlag_voller_name', 'sicherheit', 'quelle', 'treffer', 'alternativen', 'titel'].join(',') + '\n');

const SKIP = new Set(['unknown', 'anonym', 'anonymous', 'unbekannt', 'u', 'u.', 'diverse', 'various']);
console.log('Lade ISBN-Daten (Open Library, gebündelt) …');
const allIsbns = [...new Set(authors.flatMap((a) => a.isbns ? a.isbns.split('|') : []))];
const ol = await openLibraryIsbns(allIsbns); saveCache();

let n = 0;
for (const a of authors) {
  n++;
  if (done.has(a.id)) continue;
  const last = a.last_name.trim();
  const votes = new Map(); // full -> {first, isbn:0, title:0, src:Set}
  const add = (names, kind, src) => {
    for (const nm of names || []) {
      const r = firstNameFrom(nm, last); if (!r) continue;
      const k = r.full; const v = votes.get(k) || { ...r, isbn: 0, title: 0, src: new Set() };
      v[kind]++; v.src.add(src); votes.set(k, v);
    }
  };
  if (!SKIP.has(norm(last)) && last.length >= 2 && !/[぀-鿿]/.test(last)) {
    const isbns = a.isbns ? a.isbns.split('|') : [];
    for (const i of isbns) add(ol[i], 'isbn', 'OpenLibrary-ISBN');
    if (!votes.size) for (const i of isbns.slice(0, 3)) { add(await googleIsbn(i), 'isbn', 'GoogleBooks-ISBN'); await sleep(300); }
    if (!votes.size) {
      for (const t of (a.titles ? a.titles.split('|') : []).slice(0, 3)) {
        if (t.trim().length < 3) continue;
        add(await openLibraryTitle(t, last), 'title', 'OpenLibrary-Titel'); await sleep(300);
        if (!votes.size) { add(await googleTitle(t, last), 'title', 'GoogleBooks-Titel'); await sleep(300); }
      }
    }
  }
  // gleiche Vornamen zusammenfassen (z. B. "T. Keneally" vs "Thomas Keneally": längster gewinnt nur bei gleicher Initiale)
  const list = [...votes.values()].sort((x, y) => (y.isbn * 3 + y.title) - (x.isbn * 3 + x.title) || y.first.length - x.first.length);
  const best = list.find((v) => !/^\p{Lu}\.?$/u.test(v.first) && !/^(\p{Lu}\.\s*)+$/u.test(v.first)) || list[0];
  const others = list.filter((v) => v !== best && norm(v.first)[0] !== norm(best?.first)[0]);
  let sicherheit = 'keine';
  if (best) {
    if (best.isbn >= 1 && !others.length) sicherheit = 'hoch';
    else if (best.isbn >= 1 || (best.title >= 2 && !others.length)) sicherheit = 'mittel';
    else sicherheit = 'niedrig';
  }
  if (SKIP.has(norm(last))) sicherheit = 'platzhalter';
  if (/[぀-鿿]/.test(last)) sicherheit = 'manuell (Schrift)';
  fs.appendFileSync(OUT, [a.id, last, best?.first, best?.full, sicherheit, best ? [...best.src].join('+') : '',
    best ? best.isbn + best.title : 0, list.filter((v) => v !== best).slice(0, 3).map((v) => v.full).join(' | '),
    a.titles.split('|').slice(0, 3).join(' | ')].map(esc).join(',') + '\n');
  if (n % 25 === 0) { saveCache(); console.log(`${n}/${authors.length}`); }
}
saveCache();
console.log(`Fertig. Ergebnis: ${OUT}`);

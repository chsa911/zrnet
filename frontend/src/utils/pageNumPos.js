// Position der Seitenzahl + eindeutige Buch-Nummer (books.phys_code)
//
// Nummer: feste Blöcke   BBB HHH SSSS PP KKK WW   z. B. 125 210 0950 or 024 st
//   BBB  Breite in mm      HHH  Höhe in mm
//   SSSS Seiten = letzte Seite, die mit einer Seitenzahl bedruckt ist (0000 = keine Seitenzahl)
//   PP   Position der Seitenzahl auf dieser Seite: ol om or (oben), ml mr (mitte links/rechts), ul um ur (unten), 00 keine
//   KKK  Kapitel (000 = keine / unbekannt)
//   WW   erste 2 Buchstaben des allerletzten Wortes im ganzen Buch (ä->a; 1 Buchstabe -> "i0"; 00 = kein Text)
// Die DB leitet die Nummer per Trigger ab, leert sie nie, stellt verlorene Werte
// daraus wieder her und erzwingt Eindeutigkeit. Diese Datei = Vorschau im Formular.

export const PAGE_NUM_POSITIONS = [
  { value: "ol", label: "oben links" },
  { value: "om", label: "oben mitte" },
  { value: "or", label: "oben rechts" },
  { value: "ml", label: "mitte links" },
  { value: "mr", label: "mitte rechts" },
  { value: "ul", label: "unten links" },
  { value: "um", label: "unten mitte" },
  { value: "ur", label: "unten rechts" },
  { value: "00", label: "keine Seitenzahl" },
];

export const PAGE_NUM_POS_HELP =
  "Position der Seitenzahl: ol om or = oben links/mitte/rechts, ml mr = mitte links/rechts, ul um ur = unten links/mitte/rechts, 00 = keine";

export function isValidPageNumPos(v) {
  return PAGE_NUM_POSITIONS.some((p) => p.value === String(v ?? "").trim().toLowerCase());
}

export function pageNumPosLabel(v) {
  return PAGE_NUM_POSITIONS.find((p) => p.value === String(v ?? "").trim().toLowerCase())?.label || "";
}

function pad(n, len) {
  const s = String(n);
  return s.length >= len ? s : s.padStart(len, "0");
}

function intOrZero(x) {
  const n = parseInt(String(x ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Letztes Wort -> 2 Zeichen wie in der DB (phys_code_word); gespeichert wird das ganze Wort ("Ärger" -> "ar", "I" -> "i0", "00" bleibt)
export function normalizeLastWord(v) {
  const raw = String(v ?? "").trim().toLowerCase();
  if (raw === "00") return "00";
  const letters = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/ø/g, "o")
    .replace(/[^a-z]/g, "");
  if (!letters) return "";
  return letters.length === 1 ? `${letters}0` : letters.slice(0, 2);
}

// Formularwerte -> Nummer (ohne Leerzeichen) oder "" wenn unvollständig
export function buildPhysCode(v) {
  const w = Number(String(v?.width_cm ?? "").replace(",", "."));
  const h = Number(String(v?.height_cm ?? "").replace(",", "."));
  const pos = String(v?.page_num_pos ?? "").trim().toLowerCase();
  const word = normalizeLastWord(v?.last_word);
  if (!(w > 0) || !(h > 0) || !isValidPageNumPos(pos) || !word) return "";
  const wMm = Math.round(w * 10); // wie Backend cmToMm
  const hMm = Math.round(h * 10);
  const code = `${pad(wMm, 3)}${pad(hMm, 3)}${pad(intOrZero(v?.pages), 4)}${pos}${pad(intOrZero(v?.chapters), 3)}${word}`;
  return PHYS_CODE_RE.test(code) ? code : "";
}

export const PHYS_CODE_RE = /^[0-9]{10}(ol|om|or|ml|mr|ul|um|ur|00)[0-9]{3}([a-z][a-z0]|00)$/;

export function normalizePhysCode(s) {
  const c = String(s ?? "").replace(/\s+/g, "").toLowerCase();
  return PHYS_CODE_RE.test(c) ? c : "";
}

// 1252100950or024st -> "125 210 0950 or 024 st"
export function formatPhysCode(code) {
  const c = String(code ?? "").replace(/\s+/g, "");
  if (c.length !== 17) return c;
  return `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6, 10)} ${c.slice(10, 12)} ${c.slice(12, 15)} ${c.slice(15)}`;
}

// Nummer -> Einzelwerte
export function decodePhysCode(code) {
  const c = normalizePhysCode(code);
  if (!c) return null;
  return {
    width_mm: Number(c.slice(0, 3)),
    height_mm: Number(c.slice(3, 6)),
    pages: Number(c.slice(6, 10)),
    page_num_pos: c.slice(10, 12),
    chapters: Number(c.slice(12, 15)),
    last_word: c.slice(15, 17),
  };
}

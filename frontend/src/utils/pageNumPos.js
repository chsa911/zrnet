// Position der Seitenzahl + eindeutige Buch-Nummer (books.phys_code)
//
// Nummer: 14 Ziffern, feste Blöcke   BBB HHH SSSS P KKK   z. B. 125 210 0950 9 024
//   BBB  Breite in mm      HHH  Höhe in mm
//   SSSS Seiten (0000 = keine Seitenzahl)
//   P    Position der Seitenzahl wie auf dem Ziffernblock (7 8 9 oben, 1 2 3 unten, 0 keine)
//   KKK  Kapitel (000 = keine / unbekannt)
// Die DB leitet die Nummer per Trigger ab, leert sie nie, stellt verlorene Werte
// daraus wieder her und erzwingt Eindeutigkeit. Diese Datei = Vorschau im Formular.

// Reihenfolge wie auf dem Ziffernblock
export const PAGE_NUM_POSITIONS = [
  { value: "7", label: "oben links" },
  { value: "8", label: "oben mitte" },
  { value: "9", label: "oben rechts" },
  { value: "1", label: "unten links" },
  { value: "2", label: "unten mitte" },
  { value: "3", label: "unten rechts" },
  { value: "0", label: "keine Seitenzahl" },
];

export const PAGE_NUM_POS_HELP =
  "Position der Seitenzahl wie auf dem Ziffernblock: 7 8 9 = oben links/mitte/rechts, 1 2 3 = unten links/mitte/rechts, 0 = keine";

export function isValidPageNumPos(v) {
  return PAGE_NUM_POSITIONS.some((p) => p.value === String(v ?? "").trim());
}

export function pageNumPosLabel(v) {
  return PAGE_NUM_POSITIONS.find((p) => p.value === String(v ?? "").trim())?.label || "";
}

function pad(n, len) {
  const s = String(n);
  return s.length >= len ? s : s.padStart(len, "0");
}

function intOrZero(x) {
  const n = parseInt(String(x ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Formularwerte -> Nummer (ohne Leerzeichen) oder "" wenn unvollständig
export function buildPhysCode(v) {
  const w = Number(String(v?.width_cm ?? "").replace(",", "."));
  const h = Number(String(v?.height_cm ?? "").replace(",", "."));
  const pos = String(v?.page_num_pos ?? "").trim();
  if (!(w > 0) || !(h > 0) || !isValidPageNumPos(pos)) return "";
  const wMm = Math.round(w * 10); // wie Backend cmToMm
  const hMm = Math.round(h * 10);
  const code = `${pad(wMm, 3)}${pad(hMm, 3)}${pad(intOrZero(v?.pages), 4)}${pos}${pad(intOrZero(v?.chapters), 3)}`;
  return PHYS_CODE_RE.test(code) ? code : "";
}

export const PHYS_CODE_RE = /^[0-9]{10}[0123789][0-9]{3}$/;

export function normalizePhysCode(s) {
  const c = String(s ?? "").replace(/\s+/g, "");
  return PHYS_CODE_RE.test(c) ? c : "";
}

// 12521009509024 -> "125 210 0950 9 024"
export function formatPhysCode(code) {
  const c = String(code ?? "").replace(/\s+/g, "");
  if (c.length !== 14) return c;
  return `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6, 10)} ${c.slice(10, 11)} ${c.slice(11)}`;
}

// Nummer -> Einzelwerte
export function decodePhysCode(code) {
  const c = normalizePhysCode(code);
  if (!c) return null;
  return {
    width_mm: Number(c.slice(0, 3)),
    height_mm: Number(c.slice(3, 6)),
    pages: Number(c.slice(6, 10)),
    page_num_pos: c.slice(10, 11),
    chapters: Number(c.slice(11, 14)),
  };
}

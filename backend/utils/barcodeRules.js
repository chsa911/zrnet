// backend/utils/barcodeRules.js
//
// SINGLE SOURCE OF TRUTH für die Barcode-Vergabe NEUER Bücher (ab 23.11.2026).
//
// Ein Barcode-Präfix ist <Position><Farbe>, z. B. "d" + "b" -> "db012".
//
//   Farbe:    nur noch über die BREITE (9 Breitenklassen, je genau eine Farbe).
//             Die alten Kombi-Kürzel (gk, ik, pk, nk, tk ...) werden nicht
//             mehr vergeben.
//   Position: für ALLE Breiten gleich (seit 26.11.2026 nur noch Gruppe 1):
//             unten -> oben -> links -> rechts. Die Höhe spielt keine Rolle.
//             Erst wenn eine Position "voll" ist (kein freier Code mehr),
//             wird die nächste Position der Reihenfolge genommen.
//
//   d = unten, o = oben, l = links, r = rechts
//
// Bereits vergebene (alte) Barcodes bleiben unverändert.

const POSITION_ORDER = Object.freeze({
  // Gruppe 1 (einzige Gruppe): standardmäßig unten, wenn voll oben,
  // dann links, dann rechts
  1: Object.freeze(["d", "o", "l", "r"]),
});

// Breiten in mm (Eingabe in cm wird auf ganze mm gerundet, dadurch gibt es
// zwischen den Klassen keine Lücken: 10,95 cm -> 110 mm -> Klasse 2).
const WIDTH_CLASSES = Object.freeze([
  { sizeClass: 1, minMm: 0,   maxMm: 109,  color: "i", colorName: "lila",           positionGroup: 1 },
  { sizeClass: 2, minMm: 110, maxMm: 114,  color: "b", colorName: "blau",           positionGroup: 1 },
  { sizeClass: 3, minMm: 115, maxMm: 119,  color: "s", colorName: "schwarz",        positionGroup: 1 },
  { sizeClass: 4, minMm: 120, maxMm: 124,  color: "g", colorName: "grün",           positionGroup: 1 },
  { sizeClass: 5, minMm: 125, maxMm: 129,  color: "p", colorName: "pink",           positionGroup: 1 },
  { sizeClass: 6, minMm: 130, maxMm: 134,  color: "n", colorName: "orange",         positionGroup: 1 },
  { sizeClass: 7, minMm: 135, maxMm: 139,  color: "k", colorName: "Kugelschreiber", positionGroup: 1 },
  { sizeClass: 8, minMm: 140, maxMm: 149,  color: "t", colorName: "rot",            positionGroup: 1 },
  { sizeClass: 9, minMm: 150, maxMm: 1000, color: "u", colorName: "grau",           positionGroup: 1 },
]);

function cmToMm(cm) {
  const n = Number(String(cm ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 10) : NaN;
}

function posToBand(pos) {
  if (pos === "l") return "special";
  if (pos === "d" || pos === "r") return "low";
  return "high";
}

/**
 * Regel für eine Breite (cm). Die Höhe wird bewusst nicht gebraucht.
 * Liefert null, wenn die Breite ungültig ist oder in keine Klasse fällt.
 *
 * {
 *   sizeClass, color, colorName, positionGroup,
 *   positions: ["d","o","l","r"],        // Suchreihenfolge
 *   prefixes:  ["db","ob","lb","rb"],    // gleiche Reihenfolge
 *   pos:       "d",                      // Standardposition (erste)
 *   sizeRuleId: null                     // alte size_rules werden nicht mehr benutzt
 * }
 */
function resolveBarcodeRule(widthCm) {
  const wMm = cmToMm(widthCm);
  if (!Number.isFinite(wMm) || wMm <= 0) return null;

  const c = WIDTH_CLASSES.find((x) => wMm >= x.minMm && wMm <= x.maxMm);
  if (!c) return null;

  const positions = [...POSITION_ORDER[c.positionGroup]];
  return {
    sizeClass: c.sizeClass,
    color: c.color,
    colorName: c.colorName,
    positionGroup: c.positionGroup,
    positions,
    prefixes: positions.map((p) => `${p}${c.color}`),
    pos: positions[0],
    sizeRuleId: null,
  };
}

/** Position eines Barcodes aus seinem ersten Buchstaben (d/o/l/r), sonst null. */
function posOfBarcode(barcode) {
  const p = String(barcode || "").trim().toLowerCase()[0];
  return ["d", "o", "l", "r"].includes(p) ? p : null;
}

module.exports = {
  WIDTH_CLASSES,
  POSITION_ORDER,
  resolveBarcodeRule,
  posOfBarcode,
  posToBand,
  cmToMm,
};

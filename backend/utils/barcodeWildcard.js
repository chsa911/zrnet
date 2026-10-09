// backend/utils/barcodeWildcard.js
//
// Platzhalter-Suche für Barcodes.
//
//   ob0x  / ob0*   -> alle Barcodes, die mit "ob0" anfangen (ob01, ob010, ob0123 …)
//   ob01?          -> genau ein beliebiges Zeichen (ob010 … ob019)
//   *010           -> alle Barcodes, die auf "010" enden
//
// "x" zählt nur als Platzhalter, wenn es direkt nach einer Ziffer steht
// (Barcodes sind Buchstaben + Ziffern, ein "x" nach einer Ziffer kann also
// kein echtes Barcode-Zeichen sein). "*" und "?" gehen überall.
//
// Liefert ein ILIKE-Muster (z. B. "ob0%") oder null, wenn die Eingabe
// keinen Platzhalter enthält -> dann bleibt die normale Suche aktiv.

function barcodeWildcardPattern(input) {
  const s = String(input ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!s || !/^[a-z0-9*?]+$/.test(s)) return null;

  const pattern = s
    .replace(/([0-9])x/g, "$1*")
    .replace(/\*+/g, "%")
    .replace(/\?/g, "_");

  if (!/[%_]/.test(pattern)) return null; // kein Platzhalter
  if (!/[a-z0-9]/.test(pattern)) return null; // nur "*" -> nicht alles listen
  return pattern;
}

module.exports = { barcodeWildcardPattern };

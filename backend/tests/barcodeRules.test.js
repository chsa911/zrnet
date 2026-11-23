// backend/tests/barcodeRules.test.js
// Neues Barcode-System: Farbe nur über die Breite, Position nur über die
// Positionsgruppe. Reiner Logik-Test, keine Datenbank nötig.

const { resolveBarcodeRule, posOfBarcode } = require("../utils/barcodeRules");

describe("Breitenklassen -> Farbe", () => {
  test.each([
    [9.0, "i"], [10.9, "i"],
    [11.0, "b"], [11.4, "b"],
    [11.5, "s"], [11.9, "s"],
    [12.0, "g"], [12.4, "g"],
    [12.5, "p"], [12.9, "p"],
    [13.0, "n"], [13.4, "n"],
    [13.5, "k"], [13.9, "k"],
    [14.0, "t"], [14.9, "t"],
    [15.0, "u"], [24.6, "u"], [100, "u"],
    ["12,5", "p"], // Komma wie im Formular
  ])("%s cm -> %s", (w, color) => {
    expect(resolveBarcodeRule(w).color).toBe(color);
  });

  test("Zwischenwerte fallen durch mm-Rundung in die nächste Klasse, keine Lücke", () => {
    expect(resolveBarcodeRule(10.94).color).toBe("i");
    expect(resolveBarcodeRule(10.95).color).toBe("b");
    expect(resolveBarcodeRule(12.96).color).toBe("n");
  });

  test("ungültig oder zu breit -> null", () => {
    expect(resolveBarcodeRule(0)).toBeNull();
    expect(resolveBarcodeRule("abc")).toBeNull();
    expect(resolveBarcodeRule(100.1)).toBeNull();
  });

  test("keine Kombi-Kürzel mehr (gk, ik, nk ...)", () => {
    for (let mm = 1; mm <= 1000; mm++) {
      expect(resolveBarcodeRule(mm / 10).color).toMatch(/^[ibsgpnktu]$/);
    }
  });
});

describe("Positionsgruppen -> Suchreihenfolge", () => {
  test("Gruppe 1: unten, oben, links, rechts", () => {
    const r = resolveBarcodeRule(11.2); // blau
    expect(r.positionGroup).toBe(1);
    expect(r.prefixes).toEqual(["db", "ob", "lb", "rb"]);
    expect(r.pos).toBe("d");
  });

  test("Gruppe 2: rechts, links, unten, oben", () => {
    const r = resolveBarcodeRule(13.7); // Kugelschreiber
    expect(r.positionGroup).toBe(2);
    expect(r.prefixes).toEqual(["rk", "lk", "dk", "ok"]);
    expect(r.pos).toBe("r");
  });

  test("Gruppen je Farbe wie in der Tabelle", () => {
    const g = (w) => resolveBarcodeRule(w).positionGroup;
    expect([10, 11.2, 11.7, 12.2, 12.7].map(g)).toEqual([1, 1, 1, 1, 1]);
    expect([13.2, 13.7, 14.5, 16].map(g)).toEqual([2, 2, 2, 2]);
  });

  test("Höhe spielt keine Rolle (wird gar nicht übergeben)", () => {
    expect(resolveBarcodeRule.length).toBe(1);
  });

  test("posOfBarcode", () => {
    expect(posOfBarcode("rk012")).toBe("r");
    expect(posOfBarcode("DB001")).toBe("d");
    expect(posOfBarcode(null)).toBeNull();
  });
});

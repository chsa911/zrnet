// Länderkürzel für books.action_country und authors.author_nationality.
// Grundlage: internationale Kfz-Kennzeichen. Ein Kürzel ist zusammen mit der
// Region eindeutig, z. B.:
//   C + Asien (0)        = China
//   C + Nordamerika (2)  = Kuba
//
// Regionen wie books.action_continent:
//   0 Asien  1 Afrika  2 Nordamerika  3 Südamerika  4 Mitteleuropa
//   5 Ostaustralien  6 Weltweit  7 Westaustralien  8 Nordeuropa  9 Südeuropa  10 Fiktiv
// region null = Land passt in keine einzelne Region (z. B. Russland, Türkei,
// Australien Ost/West) -> die Region wird dann nicht automatisch gesetzt.
//
// Freie Eingabe bleibt immer möglich: unbekannte Länder werden so gespeichert,
// wie sie eingetippt wurden. Ein ausgeschriebener Name aus dieser Liste
// (z. B. "Pakistan") wird beim Verlassen des Feldes zum Kürzel.

const AS = 0, AF = 1, NA = 2, SA = 3, ME = 4, NE = 8, SE = 9, X = null;

export const COUNTRY_CODES = [
  // Mitteleuropa
  ["D", "Deutschland", ME], ["A", "Österreich", ME], ["CH", "Schweiz", ME], ["FL", "Liechtenstein", ME],
  ["NL", "Niederlande", ME], ["B", "Belgien", ME], ["L", "Luxemburg", ME],
  ["PL", "Polen", ME], ["CZ", "Tschechien", ME], ["SK", "Slowakei", ME], ["H", "Ungarn", ME], ["SLO", "Slowenien", ME],
  ["F", "Frankreich", X],
  // Nordeuropa
  ["GB", "Großbritannien", NE], ["IRL", "Irland", NE], ["IS", "Island", NE],
  ["DK", "Dänemark", NE], ["N", "Norwegen", NE], ["S", "Schweden", NE], ["FIN", "Finnland", NE],
  ["EST", "Estland", NE], ["LV", "Lettland", NE], ["LT", "Litauen", NE],
  // Südeuropa
  ["I", "Italien", SE], ["E", "Spanien", SE], ["P", "Portugal", SE], ["AND", "Andorra", SE],
  ["MC", "Monaco", SE], ["V", "Vatikan", SE], ["RSM", "San Marino", SE], ["M", "Malta", SE],
  ["HR", "Kroatien", SE], ["BIH", "Bosnien und Herzegowina", SE], ["SRB", "Serbien", SE],
  ["MNE", "Montenegro", SE], ["NMK", "Nordmazedonien", SE], ["AL", "Albanien", SE], ["RKS", "Kosovo", SE],
  ["GR", "Griechenland", SE], ["CY", "Zypern", SE], ["BG", "Bulgarien", SE],
  // Osteuropa / zwischen den Regionen
  ["RO", "Rumänien", X], ["MD", "Moldau", X], ["UA", "Ukraine", X], ["BY", "Belarus", X],
  ["RUS", "Russland", X], ["TR", "Türkei", X],
  // Asien
  ["C", "China", AS], ["RC", "Taiwan", AS], ["J", "Japan", AS], ["ROK", "Südkorea", AS], ["MGL", "Mongolei", AS],
  ["IND", "Indien", AS], ["PK", "Pakistan", AS], ["NEP", "Nepal", AS], ["BHT", "Bhutan", AS], ["BD", "Bangladesch", AS],
  ["CL", "Sri Lanka", AS], ["MV", "Malediven", AS], ["AFG", "Afghanistan", AS], ["IR", "Iran", AS], ["IRQ", "Irak", AS],
  ["SYR", "Syrien", AS], ["RL", "Libanon", AS], ["IL", "Israel", AS], ["HKJ", "Jordanien", AS], ["SA", "Saudi-Arabien", AS],
  ["YAR", "Jemen", AS], ["OM", "Oman", AS], ["UAE", "Vereinigte Arabische Emirate", AS], ["Q", "Katar", AS],
  ["KWT", "Kuwait", AS], ["BRN", "Bahrain", AS], ["GE", "Georgien", AS], ["ARM", "Armenien", AS], ["AZ", "Aserbaidschan", AS],
  ["KZ", "Kasachstan", AS], ["UZ", "Usbekistan", AS], ["TM", "Turkmenistan", AS], ["TJ", "Tadschikistan", AS],
  ["KS", "Kirgisistan", AS], ["T", "Thailand", AS], ["VN", "Vietnam", AS], ["K", "Kambodscha", AS], ["LAO", "Laos", AS],
  ["MYA", "Myanmar", AS], ["MAL", "Malaysia", AS], ["SGP", "Singapur", AS], ["RI", "Indonesien", AS], ["RP", "Philippinen", AS],
  // Afrika
  ["MA", "Marokko", AF], ["DZ", "Algerien", AF], ["TN", "Tunesien", AF], ["LAR", "Libyen", AF], ["ET", "Ägypten", AF],
  ["SUD", "Sudan", AF], ["ETH", "Äthiopien", AF], ["EAK", "Kenia", AF], ["EAT", "Tansania", AF], ["EAU", "Uganda", AF],
  ["RWA", "Ruanda", AF], ["ZA", "Südafrika", AF], ["NAM", "Namibia", AF], ["RB", "Botswana", AF], ["ZW", "Simbabwe", AF],
  ["Z", "Sambia", AF], ["MOC", "Mosambik", AF], ["RM", "Madagaskar", AF], ["SN", "Senegal", AF], ["RIM", "Mauretanien", AF],
  ["RMM", "Mali", AF], ["GH", "Ghana", AF], ["WAN", "Nigeria", AF], ["CAM", "Kamerun", AF], ["RCB", "Kongo", AF],
  ["CGO", "Demokratische Republik Kongo", AF],
  // Nordamerika (mit Mittelamerika und Karibik)
  ["USA", "USA", NA], ["CDN", "Kanada", NA], ["MEX", "Mexiko", NA], ["GCA", "Guatemala", NA], ["BH", "Belize", NA],
  ["HN", "Honduras", NA], ["ES", "El Salvador", NA], ["NIC", "Nicaragua", NA], ["CR", "Costa Rica", NA], ["PA", "Panama", NA],
  ["C", "Kuba", NA], ["JA", "Jamaika", NA], ["RH", "Haiti", NA], ["DOM", "Dominikanische Republik", NA], ["BS", "Bahamas", NA],
  // Südamerika
  ["CO", "Kolumbien", SA], ["YV", "Venezuela", SA], ["EC", "Ecuador", SA], ["PE", "Peru", SA], ["BOL", "Bolivien", SA],
  ["BR", "Brasilien", SA], ["PY", "Paraguay", SA], ["ROU", "Uruguay", SA], ["RA", "Argentinien", SA], ["RCH", "Chile", SA],
  ["GUY", "Guyana", SA], ["SME", "Suriname", SA],
  // Ozeanien (keine eigene Region; Australien ist Ost/West geteilt)
  ["AUS", "Australien", X], ["NZ", "Neuseeland", X], ["PNG", "Papua-Neuguinea", X], ["FJI", "Fidschi", X],
];

const REGION_NAMES = ["Asien", "Afrika", "Nordamerika", "Südamerika", "Mitteleuropa",
  "Ostaustralien", "Weltweit", "Westaustralien", "Nordeuropa", "Südeuropa", "Fiktiv"];

const up = (s) => String(s ?? "").trim().toUpperCase();
const regionKey = (r) => (r === "" || r == null ? null : Number(r));

// Name -> Eintrag ("Kuba" -> C/Nordamerika)
const BY_NAME = new Map(COUNTRY_CODES.map(([code, name, region]) => [name.toLowerCase(), { code, name, region }]));
// Kürzel -> alle Einträge (C -> China, Kuba)
const BY_CODE = new Map();
for (const [code, name, region] of COUNTRY_CODES) {
  const k = up(code);
  if (!BY_CODE.has(k)) BY_CODE.set(k, []);
  BY_CODE.get(k).push({ code, name, region });
}

// Eintrag für Kürzel (+ Region, falls das Kürzel mehrdeutig ist). null = unbekannt/mehrdeutig.
export function countryEntry(code, region) {
  const list = BY_CODE.get(up(code)) || [];
  if (!list.length) return null;
  const r = regionKey(region);
  if (r != null) {
    const hit = list.find((x) => x.region === r);
    if (hit) return hit;
  }
  return list.length === 1 ? list[0] : null;
}

// "C" + Asien -> "China"; "C" ohne Region -> "China / Kuba"; unbekannt -> ""
export function countryName(code, region) {
  const e = countryEntry(code, region);
  if (e) return e.name;
  const list = BY_CODE.get(up(code)) || [];
  return list.map((x) => x.name).join(" / ");
}

// Eingabe normalisieren. Liefert { value, region }:
//   "Pakistan" -> { value: "PK", region: 0 }
//   "Kuba"     -> { value: "C",  region: 2 }
//   "pk"       -> { value: "PK", region: 0 }
//   "C"        -> { value: "C",  region: null }   (mehrdeutig ohne Region)
//   "Atlantis" -> { value: "Atlantis", region: null }   (freie Eingabe bleibt)
export function normalizeCountryInput(text) {
  const t = String(text || "").trim();
  if (!t) return { value: "", region: null };
  const byName = BY_NAME.get(t.toLowerCase());
  if (byName) return { value: byName.code, region: byName.region };
  const list = BY_CODE.get(up(t));
  if (list) return { value: list[0].code, region: list.length === 1 ? list[0].region : null };
  return { value: t, region: null };
}

// Vorschlagsliste: bekannte Kürzel + alle in der Datenbank schon verwendeten Werte.
export function countryOptions(dbValues = []) {
  const seen = new Set();
  const out = [];
  for (const [code, name, region] of COUNTRY_CODES) {
    seen.add(up(code));
    const where = region != null && (BY_CODE.get(up(code)) || []).length > 1 ? ` (${REGION_NAMES[region]})` : "";
    out.push({ key: `${code}|${name}`, value: code, label: `${code} – ${name}${where}` });
  }
  for (const v of dbValues) {
    const s = String(v || "").trim();
    if (!s || seen.has(up(s))) continue;
    seen.add(up(s));
    out.push({ key: s, value: s, label: `${s} (bereits verwendet)` });
  }
  return out;
}

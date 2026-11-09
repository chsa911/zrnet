// Grundliste großer Städte: Stadt -> Region / Land / Bundesland.
// Wird nur benutzt, solange die Stadt noch bei keinem Buch steht. Sobald sie
// in der Datenbank vorkommt, gilt die dort häufigste Kombination
// (GET /api/public/places/cities).
//
// Regionen wie books.action_continent:
//   0 Asien  1 Afrika  2 Nordamerika  3 Südamerika  4 Mitteleuropa
//   5 Ostaustralien  6 Weltweit  7 Westaustralien  8 Nordeuropa  9 Südeuropa  10 Fiktiv
// Länder als Kürzel wie in countryCodes.js (C = China in Asien, Kuba in Nordamerika).
// region null = Land ohne feste Region (Frankreich, Russland, Türkei ...).

const AS = 0, AF = 1, NA = 2, SA = 3, ME = 4, OA = 5, WA = 7, NE = 8, SE = 9, X = null;

export const CITY_DEFAULTS = [
  // China
  ["Peking", AS, "C"], ["Beijing", AS, "C"], ["Shanghai", AS, "C"], ["Hongkong", AS, "C"], ["Hong Kong", AS, "C"],
  ["Kanton", AS, "C"], ["Guangzhou", AS, "C"], ["Nanking", AS, "C"], ["Nanjing", AS, "C"], ["Xi'an", AS, "C"],
  ["Lhasa", AS, "C"], ["Macau", AS, "C"], ["Chongqing", AS, "C"], ["Wuhan", AS, "C"], ["Harbin", AS, "C"],
  // übriges Asien
  ["Taipeh", AS, "RC"], ["Tokio", AS, "J"], ["Kyoto", AS, "J"], ["Osaka", AS, "J"], ["Hiroshima", AS, "J"],
  ["Seoul", AS, "ROK"], ["Ulan Bator", AS, "MGL"], ["Delhi", AS, "IND"], ["Neu-Delhi", AS, "IND"],
  ["Mumbai", AS, "IND"], ["Bombay", AS, "IND"], ["Kalkutta", AS, "IND"], ["Varanasi", AS, "IND"],
  ["Kathmandu", AS, "NEP"], ["Karatschi", AS, "PK"], ["Lahore", AS, "PK"], ["Islamabad", AS, "PK"],
  ["Kabul", AS, "AFG"], ["Teheran", AS, "IR"], ["Bagdad", AS, "IRQ"], ["Damaskus", AS, "SYR"],
  ["Beirut", AS, "RL"], ["Jerusalem", AS, "IL"], ["Tel Aviv", AS, "IL"], ["Mekka", AS, "SA"],
  ["Dubai", AS, "UAE"], ["Bangkok", AS, "T"], ["Hanoi", AS, "VN"], ["Saigon", AS, "VN"],
  ["Ho-Chi-Minh-Stadt", AS, "VN"], ["Phnom Penh", AS, "K"], ["Singapur", AS, "SGP"],
  ["Jakarta", AS, "RI"], ["Bali", AS, "RI"], ["Manila", AS, "RP"], ["Colombo", AS, "CL"],
  // Mitteleuropa
  ["Berlin", ME, "D", "Berlin"], ["Hamburg", ME, "D", "Hamburg"], ["Bremen", ME, "D", "Bremen"],
  ["München", ME, "D", "Bayern"], ["Nürnberg", ME, "D", "Bayern"], ["Augsburg", ME, "D", "Bayern"],
  ["Regensburg", ME, "D", "Bayern"], ["Würzburg", ME, "D", "Bayern"], ["Garmisch-Partenkirchen", ME, "D", "Bayern"],
  ["Köln", ME, "D", "Nordrhein-Westfalen"], ["Düsseldorf", ME, "D", "Nordrhein-Westfalen"],
  ["Dortmund", ME, "D", "Nordrhein-Westfalen"], ["Essen", ME, "D", "Nordrhein-Westfalen"],
  ["Münster", ME, "D", "Nordrhein-Westfalen"], ["Aachen", ME, "D", "Nordrhein-Westfalen"],
  ["Frankfurt am Main", ME, "D", "Hessen"], ["Frankfurt", ME, "D", "Hessen"], ["Wiesbaden", ME, "D", "Hessen"],
  ["Stuttgart", ME, "D", "Baden-Württemberg"], ["Heidelberg", ME, "D", "Baden-Württemberg"],
  ["Freiburg", ME, "D", "Baden-Württemberg"], ["Mannheim", ME, "D", "Baden-Württemberg"],
  ["Dresden", ME, "D", "Sachsen"], ["Leipzig", ME, "D", "Sachsen"], ["Weimar", ME, "D", "Thüringen"],
  ["Erfurt", ME, "D", "Thüringen"], ["Hannover", ME, "D", "Niedersachsen"], ["Göttingen", ME, "D", "Niedersachsen"],
  ["Kiel", ME, "D", "Schleswig-Holstein"], ["Lübeck", ME, "D", "Schleswig-Holstein"],
  ["Rostock", ME, "D", "Mecklenburg-Vorpommern"], ["Potsdam", ME, "D", "Brandenburg"],
  ["Magdeburg", ME, "D", "Sachsen-Anhalt"], ["Mainz", ME, "D", "Rheinland-Pfalz"], ["Saarbrücken", ME, "D", "Saarland"],
  ["Wien", ME, "A", "Wien"], ["Salzburg", ME, "A", "Salzburg"], ["Innsbruck", ME, "A", "Tirol"], ["Graz", ME, "A", "Steiermark"],
  ["Zürich", ME, "CH", "Zürich"], ["Bern", ME, "CH", "Bern"], ["Basel", ME, "CH", "Basel-Stadt"], ["Genf", ME, "CH", "Genf"],
  ["Amsterdam", ME, "NL"], ["Brüssel", ME, "B"], ["Luxemburg", ME, "L"], ["Prag", ME, "CZ"], ["Warschau", ME, "PL"],
  ["Krakau", ME, "PL"], ["Danzig", ME, "PL"], ["Breslau", ME, "PL"], ["Budapest", ME, "H"], ["Bratislava", ME, "SK"],
  ["Paris", X, "F"], ["Marseille", X, "F"], ["Lyon", X, "F"], ["Straßburg", X, "F"],
  // Nordeuropa
  ["London", NE, "GB"], ["Edinburgh", NE, "GB"], ["Oxford", NE, "GB"], ["Dublin", NE, "IRL"], ["Reykjavík", NE, "IS"],
  ["Kopenhagen", NE, "DK"], ["Stockholm", NE, "S"], ["Oslo", NE, "N"], ["Helsinki", NE, "FIN"],
  ["Tallinn", NE, "EST"], ["Riga", NE, "LV"], ["Vilnius", NE, "LT"],
  // Südeuropa
  ["Rom", SE, "I"], ["Venedig", SE, "I"], ["Florenz", SE, "I"], ["Mailand", SE, "I"], ["Neapel", SE, "I"],
  ["Palermo", SE, "I"], ["Madrid", SE, "E"], ["Barcelona", SE, "E"], ["Sevilla", SE, "E"], ["Granada", SE, "E"],
  ["Lissabon", SE, "P"], ["Porto", SE, "P"], ["Athen", SE, "GR"], ["Dubrovnik", SE, "HR"], ["Sarajevo", SE, "BIH"],
  ["Belgrad", SE, "SRB"], ["Sofia", SE, "BG"],
  // zwischen den Regionen
  ["Istanbul", X, "TR"], ["Moskau", X, "RUS"], ["Sankt Petersburg", X, "RUS"], ["Kiew", X, "UA"], ["Bukarest", X, "RO"],
  // Afrika
  ["Kairo", AF, "ET"], ["Alexandria", AF, "ET"], ["Marrakesch", AF, "MA"], ["Casablanca", AF, "MA"], ["Tunis", AF, "TN"],
  ["Nairobi", AF, "EAK"], ["Sansibar", AF, "EAT"], ["Kapstadt", AF, "ZA"], ["Johannesburg", AF, "ZA"],
  ["Windhoek", AF, "NAM"], ["Addis Abeba", AF, "ETH"], ["Lagos", AF, "WAN"], ["Kinshasa", AF, "CGO"],
  // Nordamerika
  ["New York", NA, "USA", "New York"], ["Washington", NA, "USA"], ["Boston", NA, "USA", "Massachusetts"],
  ["Chicago", NA, "USA", "Illinois"], ["Los Angeles", NA, "USA", "Kalifornien"], ["San Francisco", NA, "USA", "Kalifornien"],
  ["Hollywood", NA, "USA", "Kalifornien"], ["Las Vegas", NA, "USA", "Nevada"], ["New Orleans", NA, "USA", "Louisiana"],
  ["Miami", NA, "USA", "Florida"], ["Seattle", NA, "USA", "Washington"], ["Philadelphia", NA, "USA", "Pennsylvania"],
  ["Detroit", NA, "USA", "Michigan"], ["Dallas", NA, "USA", "Texas"], ["Houston", NA, "USA", "Texas"],
  ["Toronto", NA, "CDN"], ["Montreal", NA, "CDN"], ["Vancouver", NA, "CDN"], ["Mexiko-Stadt", NA, "MEX"],
  ["Havanna", NA, "C"],
  // Südamerika
  ["Rio de Janeiro", SA, "BR"], ["São Paulo", SA, "BR"], ["Buenos Aires", SA, "RA"], ["Santiago de Chile", SA, "RCH"],
  ["Lima", SA, "PE"], ["Cusco", SA, "PE"], ["La Paz", SA, "BOL"], ["Quito", SA, "EC"], ["Bogotá", SA, "CO"],
  ["Caracas", SA, "YV"], ["Montevideo", SA, "ROU"],
  // Australien
  ["Sydney", OA, "AUS", "New South Wales"], ["Melbourne", OA, "AUS", "Victoria"], ["Brisbane", OA, "AUS", "Queensland"],
  ["Canberra", OA, "AUS"], ["Perth", WA, "AUS", "Western Australia"],
];

const BY_NAME = new Map(
  CITY_DEFAULTS.map(([name, continent, country, state]) => [
    name.toLowerCase(),
    { name, continent, country: country || null, state: state || null },
  ])
);

// Region/Land/Bundesland für eine Stadt: zuerst aus der Datenbank (dbCities),
// sonst aus der Grundliste. null = unbekannt.
export function cityPlace(name, dbCities = []) {
  const k = String(name || "").trim().toLowerCase();
  if (!k) return null;
  const db = dbCities.find((c) => String(c?.name || "").trim().toLowerCase() === k);
  if (db && (db.continent != null || db.country)) {
    return { continent: db.continent, country: db.country || null, state: db.state || null };
  }
  return BY_NAME.get(k) || null;
}

// Vorschläge: Städte aus der Datenbank, dann die Grundliste (ohne Doppelte).
export function cityOptions(dbCities = []) {
  const seen = new Set();
  const out = [];
  for (const c of [...dbCities.map((x) => x?.name), ...CITY_DEFAULTS.map((x) => x[0])]) {
    const s = String(c || "").trim();
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
  }
  return out;
}

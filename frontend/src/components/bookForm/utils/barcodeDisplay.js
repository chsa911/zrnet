const POSITION_MAP = {
  d: "Down",
  o: "Top",
  l: "Left",
  r: "Right",
};

const TYPE_MAP = {
  g: ["Green", "Marker"],
  kg: ["Green", "Pencil"],
  gk: ["Green", "Marker + Pencil"],
  b: ["Blue", "Marker"],
  kb: ["Blue", "Pencil"],
  n: ["Orange", "Marker"],
  kn: ["Orange", "Pencil"],
  nk: ["Orange", "Marker + Pencil"],
  t: ["Red", "Marker"],
  kt: ["Red", "Pencil"],
  tk: ["Red", "Marker + Pencil"],
  p: ["Pink", "Marker"],
  pk: ["Pink", "Marker + Pencil"],
  i: ["Purple", "Marker"],
  ki: ["Purple", "Pencil"],
  ik: ["Purple", "Marker + Pencil"],
  s: ["Black", "Marker"],
  k: ["Dark", "Pencil"],
  u: ["Grey", "Marker"],
  uk: ["Grey", "Marker + Pencil"],
  y: ["Yellow", "Marker"],
  yk: ["Yellow", "Marker + Pencil"],
};

export function formatBookCode(code) {
  const s = String(code || "").toLowerCase().trim();
  if (!s) return "";

  const position = POSITION_MAP[s[0]];
  const rest = s.slice(1);

  const typeKey = Object.keys(TYPE_MAP)
    .sort((a, b) => b.length - a.length)
    .find((key) => rest.startsWith(key));

  if (!position || !typeKey) return code || "";

  const [color, tool] = TYPE_MAP[typeKey];
  const digits = rest.slice(typeKey.length);
  const place = digits ? digits.split("").join("-") : "";

  return `${position} ${color} (${tool}) · ${place}`;
}

export function parseBookCodeInput(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, "");
}
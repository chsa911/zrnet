const POSITIONS = {
  o: "Up",
  d: "Down",
  l: "Left",
};

const COLORS = {
  g: "Green",
  a: "Brown",
  b: "Blue",
  s: "Black",
  i: "Purple",
  y: "Yellow",
  n: "Orange",
  p: "Pink",
  t: "Red",
  u: "Grey",
};

function toolLabel(tool) {
  if (!tool) return "";
  if (tool === "k") return "Pencil";
  if (tool.endsWith("k")) return "Marker + Pencil";
  if (tool.startsWith("k")) return "Coloured Pencil";
  return "Marker";
}

function colorLabel(tool) {
  if (!tool) return "";
  if (tool === "k") return "Dark";

  const colorCode = tool.replace(/k/g, "");
  return COLORS[colorCode] || colorCode.toUpperCase();
}

export function formatBookCode(code) {
  const s = String(code || "").trim().toLowerCase();

  // examples:
  // dg111  = Down Green Marker 1-1-1
  // dgk111 = Down Green Marker + Pencil 1-1-1
  // dkg111 = Down Green Coloured Pencil 1-1-1
  // dk111  = Down Dark Pencil 1-1-1
  const m = s.match(/^([odl])([a-z]{1,2})([0-9]{3})$/);
  if (!m) return code || "";

  const [, pos, tool, nums] = m;

  return `${POSITIONS[pos] || pos.toUpperCase()} ${colorLabel(tool)} ${toolLabel(
    tool
  )} ${nums[0]}-${nums[1]}-${nums[2]}`;
}

export function parseBookCodeDisplay(display) {
  return String(display || "").trim();
}
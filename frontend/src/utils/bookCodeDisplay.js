import React from "react";

const POSITIONS = {
  o: { label: "Up", arrow: "↑" },
  d: { label: "Down", arrow: "↓" },
  l: { label: "Left", arrow: "←" },
};

const COLORS = {
  g: { label: "Green", value: "#15803d" },
  a: { label: "Brown", value: "#92400e" },
  b: { label: "Blue", value: "#2563eb" },
  s: { label: "Black", value: "#111827" },
  i: { label: "Purple", value: "#7c3aed" },
  y: { label: "Yellow", value: "#facc15" },
  n: { label: "Orange", value: "#f97316" },
  p: { label: "Pink", value: "#ec4899" },
  t: { label: "Red", value: "#dc2626" },
  u: { label: "Grey", value: "#6b7280" },
};

const BLACK = { label: "Black", value: "#111827" };

function getColor(colorCode) {
  return COLORS[colorCode] || {
    label: String(colorCode || "").toUpperCase(),
    value: "#111827",
  };
}

export function parseBookCode(code) {
  const s = String(code || "").trim().toLowerCase();
  const m = s.match(/^([odl])([a-z]{1,2})([0-9]{3})$/);
  if (!m) return null;

  const [, posCode, toolCode, nums] = m;
  const colorCode = toolCode.replace(/k/g, "");
  const color = colorCode ? getColor(colorCode) : BLACK;
  const hasPen = toolCode.includes("k");

  return {
    raw: s,
    position: POSITIONS[posCode] || {
      label: posCode.toUpperCase(),
      arrow: posCode.toUpperCase(),
    },
    // gk = green marker + black/dark ballpoint pen
    // kg = green ballpoint pen only
    marker: toolCode.startsWith("k") ? null : color,
    pen: hasPen ? (toolCode.startsWith("k") ? color : BLACK) : null,
    nums: nums.split(""),
  };
}

export function formatBookCode(code) {
  const parsed = parseBookCode(code);
  if (!parsed) return code || "";

  const tools = [
    parsed.marker ? `${parsed.marker.label} Marker` : null,
    parsed.pen ? `${parsed.pen.label} Ballpoint Pen` : null,
  ].filter(Boolean);

  return `${parsed.position.label} ${tools.join(" + ")} ${parsed.nums.join("-")}`;
}

export function parseBookCodeDisplay(display) {
  return String(display || "").trim();
}

export function parseBookCodeInput(text) {
  return String(text || "").trim();
}

const wrapStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  lineHeight: 1,
  verticalAlign: "middle",
};

const arrowStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "38px",
  height: "38px",
  border: "4px solid #111827",
  borderRadius: "999px",
  fontSize: "32px",
  fontWeight: 1000,
  background: "#fff",
  color: "#111827",
  boxSizing: "border-box",
};

const groupStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};

const numsStyle = {
  fontSize: "18px",
  fontWeight: 900,
  letterSpacing: "0.04em",
  color: "#111827",
};

function MarkerIcon({ color }) {
  return React.createElement(
    "svg",
    {
      width: 66,
      height: 30,
      viewBox: "0 0 132 60",
      role: "img",
      title: `${color.label} marker`,
      "aria-label": `${color.label} marker`,
      style: { display: "block", flex: "0 0 auto" },
    },
    React.createElement("rect", {
      x: 14,
      y: 15,
      width: 80,
      height: 30,
      rx: 8,
      fill: color.value,
      stroke: "#111827",
      strokeWidth: 5,
    }),
    React.createElement("rect", {
      x: 21,
      y: 20,
      width: 16,
      height: 20,
      rx: 4,
      fill: "rgba(255,255,255,0.72)",
    }),
    React.createElement("rect", {
      x: 92,
      y: 18,
      width: 18,
      height: 24,
      rx: 3,
      fill: "#f8fafc",
      stroke: "#111827",
      strokeWidth: 5,
    }),
    React.createElement("path", {
      d: "M110 20 L126 30 L110 40 Z",
      fill: "#111827",
      stroke: "#111827",
      strokeWidth: 3,
      strokeLinejoin: "round",
    })
  );
}

function BallpointPenIcon({ color }) {
  return React.createElement(
    "svg",
    {
      width: 70,
      height: 28,
      viewBox: "0 0 140 56",
      role: "img",
      title: `${color.label} ballpoint pen`,
      "aria-label": `${color.label} ballpoint pen`,
      style: { display: "block", flex: "0 0 auto" },
    },
    React.createElement("rect", {
      x: 16,
      y: 20,
      width: 82,
      height: 16,
      rx: 8,
      fill: color.value,
      stroke: "#111827",
      strokeWidth: 5,
    }),
    React.createElement("rect", {
      x: 28,
      y: 24,
      width: 34,
      height: 4,
      rx: 2,
      fill: "rgba(255,255,255,0.65)",
    }),
    React.createElement("path", {
      d: "M98 20 L122 28 L98 36 Z",
      fill: "#d1d5db",
      stroke: "#111827",
      strokeWidth: 5,
      strokeLinejoin: "round",
    }),
    React.createElement("circle", {
      cx: 125,
      cy: 28,
      r: 4,
      fill: "#111827",
    }),
    React.createElement("rect", {
      x: 6,
      y: 23,
      width: 14,
      height: 10,
      rx: 5,
      fill: "#111827",
    })
  );
}

export function BookCodeVisual({ code }) {
  const parsed = parseBookCode(code);
  if (!parsed) return code || "";

  const readable = formatBookCode(code);

  return React.createElement(
    "span",
    {
      className: "book-code-visual",
      title: readable,
      "aria-label": readable,
      style: wrapStyle,
    },
    React.createElement("span", { style: arrowStyle }, parsed.position.arrow),
    React.createElement(
      "span",
      { style: groupStyle },
      parsed.marker ? React.createElement(MarkerIcon, { color: parsed.marker }) : null,
      parsed.pen ? React.createElement(BallpointPenIcon, { color: parsed.pen }) : null
    ),
    React.createElement("span", { style: numsStyle }, parsed.nums.join("-"))
  );
}

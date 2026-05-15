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
  return COLORS[colorCode] || { label: String(colorCode || "").toUpperCase(), value: "#111827" };
}

export function parseBookCode(code) {
  const s = String(code || "").trim().toLowerCase();
  const m = s.match(/^([odl])([a-z]{1,2})([0-9]{3})$/);
  if (!m) return null;

  const [, posCode, toolCode, nums] = m;
  const colorCode = toolCode.replace(/k/g, "");
  const color = colorCode ? getColor(colorCode) : BLACK;
  const hasPencil = toolCode.includes("k");

  return {
    raw: s,
    position: POSITIONS[posCode] || { label: posCode.toUpperCase(), arrow: posCode.toUpperCase() },
    marker: toolCode.startsWith("k") ? null : color,
    pencil: hasPencil ? (toolCode === "k" ? BLACK : color) : null,
    nums: nums.split(""),
  };
}

export function formatBookCode(code) {
  const parsed = parseBookCode(code);
  if (!parsed) return code || "";

  const tools = [
    parsed.marker ? `${parsed.marker.label} Marker` : null,
    parsed.pencil ? `${parsed.pencil.label} Pencil` : null,
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
  width: "32px",
  height: "32px",
  border: "2px solid #111827",
  borderRadius: "999px",
  fontSize: "26px",
  fontWeight: 900,
  background: "#fff",
  color: "#111827",
};

const groupStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "5px",
};

const numsStyle = {
  fontSize: "18px",
  fontWeight: 800,
  letterSpacing: "0.04em",
  color: "#111827",
};

function MarkerIcon({ color }) {
  return React.createElement(
    "span",
    {
      title: `${color.label} marker`,
      "aria-label": `${color.label} marker`,
      style: {
        display: "inline-flex",
        alignItems: "center",
        width: "52px",
        height: "18px",
        border: "2px solid #111827",
        borderRadius: "4px 10px 10px 4px",
        background: color.value,
        boxShadow: "inset 10px 0 0 rgba(255,255,255,0.85)",
      },
    },
    React.createElement("span", {
      style: {
        width: 0,
        height: 0,
        marginLeft: "47px",
        borderTop: "6px solid transparent",
        borderBottom: "6px solid transparent",
        borderLeft: "10px solid #111827",
      },
    })
  );
}

function PencilIcon({ color }) {
  return React.createElement(
    "span",
    {
      title: `${color.label} pencil`,
      "aria-label": `${color.label} pencil`,
      style: {
        display: "inline-flex",
        alignItems: "center",
        transform: "rotate(-22deg)",
        transformOrigin: "center",
      },
    },
    React.createElement("span", {
      style: {
        width: "42px",
        height: "10px",
        background: color.value,
        border: "2px solid #111827",
        borderRight: "0",
        borderRadius: "3px 0 0 3px",
      },
    }),
    React.createElement("span", {
      style: {
        width: 0,
        height: 0,
        borderTop: "7px solid transparent",
        borderBottom: "7px solid transparent",
        borderLeft: "13px solid #d6a35a",
      },
    }),
    React.createElement("span", {
      style: {
        width: 0,
        height: 0,
        marginLeft: "-4px",
        borderTop: "3px solid transparent",
        borderBottom: "3px solid transparent",
        borderLeft: "6px solid #111827",
      },
    })
  );
}

export function BookCodeVisual({ code }) {
  const parsed = parseBookCode(code);
  if (!parsed) return code || "";

  return React.createElement(
    "span",
    {
      className: "book-code-visual",
      title: formatBookCode(code),
      "aria-label": formatBookCode(code),
      style: wrapStyle,
    },
    React.createElement("span", { style: arrowStyle }, parsed.position.arrow),
    React.createElement(
      "span",
      { style: groupStyle },
      parsed.marker ? React.createElement(MarkerIcon, { color: parsed.marker }) : null,
      parsed.pencil ? React.createElement(PencilIcon, { color: parsed.pencil }) : null
    ),
    React.createElement("span", { style: numsStyle }, parsed.nums.join("-"))
  );
}

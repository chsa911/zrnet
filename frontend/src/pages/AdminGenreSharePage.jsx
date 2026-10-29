// frontend/src/pages/AdminGenreSharePage.jsx
// Tortengrafik: Anteil Fiction / Non-Fiction (bzw. aller Genres) an einer
// einstellbaren Bücher-Menge – Bestand oder gelesene Bücher (fertig/abgebrochen),
// mit/ohne Barcode. Daten: GET /api/admin/stats/genre-share
// Der Server liefert Zählungen je Genre × Status × Barcode; gefiltert wird hier,
// damit jede Umstellung sofort wirkt.
import React, { useEffect, useMemo, useState } from "react";
import AdminNavRow from "../components/AdminNavRow";
import { API_BASE } from "../api/config";

const ENV_BASE = (import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_API_BASE || "").trim();
const BASE = String(ENV_BASE || API_BASE || "/api").replace(/\/$/, "");
function buildUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (BASE.endsWith("/api") && p.startsWith("/api/")) return `${BASE}${p.slice(4)}`;
  return `${BASE}${p}`;
}

const STATUSES = [
  { key: "in_stock", label: "Ungelesen" },
  { key: "in_progress", label: "In Lektüre" },
  { key: "finished", label: "Fertig gelesen" },
  { key: "abandoned", label: "Abgebrochen" },
];

const PRESETS = [
  { key: "bestand", label: "Bestand", statuses: ["in_stock", "in_progress"] },
  { key: "gelesen", label: "Gelesen", statuses: ["finished", "abandoned"] },
  { key: "alle", label: "Alle", statuses: ["in_stock", "in_progress", "finished", "abandoned"] },
];

const BARCODE = [
  { key: "all", label: "Alle" },
  { key: "with", label: "Mit Barcode" },
  { key: "without", label: "Ohne Barcode" },
];

const C = {
  fiction: "#008A55",
  nonfiction: "#2F6FDE",
  others: ["#E08A1E", "#9B59B6", "#C0392B", "#16A2B8"],
  none: "#BDBDBD",
  text: "rgba(0,0,0,0.62)",
  ink: "#111",
};

const nf = new Intl.NumberFormat("de-DE");
const pf = new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1 });

function kindOf(name) {
  const s = String(name || "").toLowerCase();
  if (!s) return "none";
  if (/non.?fiction|sachbuch/.test(s)) return "nonfiction";
  if (/^fiction|belletristik|roman/.test(s)) return "fiction";
  return "other";
}

function loadPref(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch {
    return def;
  }
}
function savePref(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* egal */ }
}

function Chip({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      className="zr-btn2 zr-btn2--ghost"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "6px 12px",
        fontWeight: 700,
        background: active ? "rgba(0,0,0,0.08)" : "#fff",
      }}
    >
      {children}
    </button>
  );
}

function arcPath(cx, cy, r, a0, a1) {
  // Vollkreis: zwei Halbbögen, sonst wird der Bogen nicht gezeichnet
  if (a1 - a0 >= Math.PI * 2 - 1e-9) {
    return `M${cx},${cy - r}A${r},${r} 0 1 1 ${cx},${cy + r}A${r},${r} 0 1 1 ${cx},${cy - r}Z`;
  }
  const x0 = cx + r * Math.sin(a0);
  const y0 = cy - r * Math.cos(a0);
  const x1 = cx + r * Math.sin(a1);
  const y1 = cy - r * Math.cos(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${cx},${cy}L${x0.toFixed(2)},${y0.toFixed(2)}A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}Z`;
}

function Pie({ slices, total }) {
  const [hover, setHover] = useState(null);
  const size = 300;
  const r = 140;
  const cx = size / 2;
  const cy = size / 2;

  let a = 0;
  const geo = slices.map((s) => {
    const a0 = a;
    const a1 = a + (s.n / total) * Math.PI * 2;
    a = a1;
    const mid = (a0 + a1) / 2;
    return { ...s, a0, a1, lx: cx + r * 0.62 * Math.sin(mid), ly: cy - r * 0.62 * Math.cos(mid) };
  });

  const hs = hover != null ? geo[hover] : null;

  return (
    <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        role="img"
        aria-label={geo.map((s) => `${s.label}: ${pf.format(s.n / total)}`).join(", ")}
        style={{ display: "block", maxWidth: "100%", height: "auto" }}
        onPointerLeave={() => setHover(null)}
      >
        {geo.map((s, i) => (
          <path
            key={s.key}
            d={arcPath(cx, cy, hover === i ? r + 4 : r, s.a0, s.a1)}
            fill={s.color}
            stroke="#fff"
            strokeWidth={geo.length > 1 ? 2 : 0}
            style={{ cursor: "default", transition: "d 120ms" }}
            onPointerEnter={() => setHover(i)}
            onPointerDown={() => setHover(i)}
          />
        ))}
        {geo.map((s) =>
          s.a1 - s.a0 > 0.35 ? (
            <text
              key={`t-${s.key}`}
              x={s.lx}
              y={s.ly}
              dy="0.35em"
              textAnchor="middle"
              fontSize="17"
              fontWeight="800"
              fill="#fff"
              pointerEvents="none"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {pf.format(s.n / total)}
            </text>
          ) : null
        )}
      </svg>

      <div style={{ minWidth: 220, maxWidth: 420, flex: "1 1 220px" }}>
        <table style={{ borderCollapse: "collapse", fontVariantNumeric: "tabular-nums", width: "100%" }}>
          <tbody>
            {geo.map((s, i) => (
              <tr
                key={s.key}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                style={{ background: hover === i ? "rgba(0,0,0,0.04)" : undefined }}
              >
                <td style={{ padding: "6px 8px 6px 0", width: 18 }}>
                  <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 3, background: s.color }} />
                </td>
                <td style={{ padding: "6px 12px 6px 0", fontWeight: 700 }}>{s.label}</td>
                <td style={{ padding: "6px 12px 6px 0", textAlign: "right" }}>{nf.format(s.n)}</td>
                <td style={{ padding: "6px 0", textAlign: "right", color: C.text }}>{pf.format(s.n / total)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "1px solid rgba(0,0,0,0.15)" }}>
              <td />
              <td style={{ padding: "6px 12px 6px 0", color: C.text }}>Summe</td>
              <td style={{ padding: "6px 12px 6px 0", textAlign: "right", fontWeight: 800 }}>{nf.format(total)}</td>
              <td />
            </tr>
          </tbody>
        </table>
        <div style={{ minHeight: "1.5em", marginTop: 6, fontSize: "0.75em", color: C.text }}>
          {hs ? `${hs.label}: ${nf.format(hs.n)} von ${nf.format(total)} Büchern` : ""}
        </div>
      </div>
    </div>
  );
}

export default function AdminGenreSharePage() {
  const [statuses, setStatuses] = useState(() => loadPref("zr.genreShare.statuses", PRESETS[0].statuses));
  const [barcode, setBarcode] = useState(() => loadPref("zr.genreShare.barcode", "all"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => savePref("zr.genreShare.statuses", statuses), [statuses]);
  useEffect(() => savePref("zr.genreShare.barcode", barcode), [barcode]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr("");
    fetch(buildUrl("/admin/stats/genre-share"), { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setErr(e?.message || "Laden fehlgeschlagen"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const { slices, total } = useMemo(() => {
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const sel = new Set(statuses);
    const by = new Map();
    for (const r of rows) {
      if (!sel.has(r.status)) continue;
      if (barcode === "with" && !r.has_barcode) continue;
      if (barcode === "without" && r.has_barcode) continue;
      const key = r.genre_id ?? "none";
      const cur = by.get(key) || { key: String(key), label: r.genre_name || "Ohne Genre", kind: kindOf(r.genre_name), n: 0 };
      cur.n += r.n;
      by.set(key, cur);
    }
    const order = { fiction: 0, nonfiction: 1, other: 2, none: 3 };
    let oi = 0;
    const list = [...by.values()]
      .filter((s) => s.n > 0)
      .sort((a, b) => order[a.kind] - order[b.kind] || b.n - a.n)
      .map((s) => ({
        ...s,
        color: s.kind === "fiction" ? C.fiction : s.kind === "nonfiction" ? C.nonfiction
          : s.kind === "none" ? C.none : C.others[oi++ % C.others.length],
      }));
    return { slices: list, total: list.reduce((t, s) => t + s.n, 0) };
  }, [data, statuses, barcode]);

  const activePreset = PRESETS.find(
    (p) => p.statuses.length === statuses.length && p.statuses.every((s) => statuses.includes(s))
  );

  function toggleStatus(key) {
    setStatuses((cur) => {
      const next = cur.includes(key) ? cur.filter((s) => s !== key) : [...cur, key];
      return next.length ? STATUSES.map((s) => s.key).filter((k) => next.includes(k)) : cur; // nie leer
    });
  }

  const statusText = activePreset
    ? activePreset.label
    : STATUSES.filter((s) => statuses.includes(s.key)).map((s) => s.label).join(" + ");
  const barcodeText = barcode === "all" ? "" : barcode === "with" ? " · mit Barcode" : " · ohne Barcode";

  return (
    <section className="zr-section">
      <AdminNavRow />

      <h1 style={{ marginBottom: 6 }}>Fiction / Non-Fiction</h1>
      <p className="zr-lede" style={{ marginTop: 0 }}>
        Anteil der Genres an der gewählten Bücher-Menge.
      </p>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }} role="group" aria-label="Bereich">
          <span style={{ minWidth: 90, fontSize: "0.75em", color: C.text }}>Bereich</span>
          {PRESETS.map((p) => (
            <Chip key={p.key} active={activePreset?.key === p.key} onClick={() => setStatuses(p.statuses)}>
              {p.label}
            </Chip>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }} role="group" aria-label="Status">
          <span style={{ minWidth: 90, fontSize: "0.75em", color: C.text }}>Status</span>
          {STATUSES.map((s) => (
            <Chip key={s.key} active={statuses.includes(s.key)} onClick={() => toggleStatus(s.key)}>
              {statuses.includes(s.key) ? "✓ " : ""}{s.label}
            </Chip>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }} role="group" aria-label="Barcode">
          <span style={{ minWidth: 90, fontSize: "0.75em", color: C.text }}>Barcode</span>
          {BARCODE.map((b) => (
            <Chip
              key={b.key}
              active={barcode === b.key}
              onClick={() => setBarcode(b.key)}
              title={b.key === "all" ? undefined : "Barcode = Buch hatte jemals einen Barcode zugeordnet"}
            >
              {b.label}
            </Chip>
          ))}
        </div>
      </div>

      {err ? <div className="zr-card" style={{ color: "#a00" }}>Fehler: {err}</div> : null}

      <div className="zr-card" style={{ padding: 16 }}>
        <div style={{ fontSize: "0.8em", color: C.text, marginBottom: 10 }}>
          {statusText}{barcodeText}
        </div>
        {!data ? (
          <div style={{ height: 300 }}>{loading ? "Lade…" : ""}</div>
        ) : total ? (
          <Pie slices={slices} total={total} />
        ) : (
          <div style={{ padding: "24px 0", color: C.text }}>Keine Bücher für diese Auswahl.</div>
        )}
      </div>
    </section>
  );
}

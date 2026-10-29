// frontend/src/pages/AdminStockPage.jsx
// Bestandsverlauf: Linie mit der Zahl der Bücher im Bestand (in_stock + in_progress)
// über die Zeit. Daten: GET /api/admin/stock/history?bucket=day|week|month
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import AdminNavRow from "../components/AdminNavRow";
import { API_BASE } from "../api/config";

const ENV_BASE = (import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_API_BASE || "").trim();
const BASE = String(ENV_BASE || API_BASE || "/api").replace(/\/$/, "");
function buildUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (BASE.endsWith("/api") && p.startsWith("/api/")) return `${BASE}${p.slice(4)}`;
  return `${BASE}${p}`;
}

const RANGES = [
  { key: "30d", label: "30 Tage", bucket: "day", days: 30 },
  { key: "90d", label: "90 Tage", bucket: "day", days: 90 },
  { key: "1y", label: "1 Jahr", bucket: "week", days: 365 },
  { key: "all", label: "Alles", bucket: "month", days: null },
];

const BUCKET_LABEL = { day: "Tag", week: "Woche", month: "Monat" };

const C = {
  line: "#008A55",
  area: "rgba(0,138,85,0.08)",
  grid: "rgba(0,0,0,0.08)",
  axis: "rgba(0,0,0,0.25)",
  text: "rgba(0,0,0,0.62)",
  ink: "#111",
};

const nf = new Intl.NumberFormat("de-DE");

function parseDay(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtPeriod(s, bucket) {
  const d = parseDay(s);
  if (bucket === "month") return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  if (bucket === "week") return `Woche ab ${d.toLocaleDateString("de-DE")}`;
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtTick(d, spanDays) {
  if (spanDays > 3 * 365) return String(d.getFullYear());
  if (spanDays > 120) return d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

// "schöne" Achsenwerte (1/2/5 × 10^n)
function niceTicks(lo, hi, count = 5) {
  if (lo === hi) { lo -= 1; hi += 1; }
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((f) => f * mag).find((s) => s >= raw) || raw;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const out = [];
  for (let v = start; v <= end + step / 2; v += step) out.push(Math.round(v));
  return out;
}

function useWidth(ref) {
  const [w, setW] = useState(800);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function StockChart({ points, bucket }) {
  const wrapRef = useRef(null);
  const width = useWidth(wrapRef);
  const [hover, setHover] = useState(null);

  const height = 340;
  const m = { top: 16, right: 18, bottom: 34, left: 56 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;

  const geo = useMemo(() => {
    if (!points.length) return null;
    const xs = points.map((p) => parseDay(p.period).getTime());
    const ys = points.map((p) => p.bestand);
    const x0 = xs[0];
    const x1 = xs.length > 1 ? xs[xs.length - 1] : x0 + 86400000;
    const yt = niceTicks(Math.min(...ys), Math.max(...ys));
    const y0 = yt[0];
    const y1 = yt[yt.length - 1];
    const sx = (t) => m.left + ((t - x0) / (x1 - x0)) * iw;
    const sy = (v) => m.top + ih - ((v - y0) / (y1 - y0 || 1)) * ih;
    const pts = points.map((p, i) => [sx(xs[i]), sy(p.bestand)]);
    const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
    const area = `${line}L${pts[pts.length - 1][0].toFixed(1)},${sy(y0)}L${pts[0][0].toFixed(1)},${sy(y0)}Z`;
    const spanDays = (x1 - x0) / 86400000;
    const nX = Math.max(2, Math.min(7, Math.floor(iw / 110)));
    const xTicks = Array.from({ length: nX }, (_, i) => x0 + ((x1 - x0) * i) / (nX - 1)).map((t) => ({
      x: sx(t),
      label: fmtTick(new Date(t), spanDays),
    }));
    return { pts, line, area, yt, sy, xTicks };
  }, [points, iw, ih, m.left, m.top]);

  if (!geo) return <div ref={wrapRef} className="zr-card">Keine Daten.</div>;

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    for (let i = 1; i < geo.pts.length; i++) {
      if (Math.abs(geo.pts[i][0] - x) < Math.abs(geo.pts[best][0] - x)) best = i;
    }
    setHover(best);
  }

  const hp = hover != null ? points[hover] : null;
  const hx = hover != null ? geo.pts[hover][0] : 0;
  const hy = hover != null ? geo.pts[hover][1] : 0;
  const tipLeft = hx > width - 200;

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Verlauf des Bücherbestands"
        style={{ display: "block", touchAction: "pan-y" }}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {geo.yt.map((v) => (
          <g key={v}>
            <line x1={m.left} x2={width - m.right} y1={geo.sy(v)} y2={geo.sy(v)} stroke={C.grid} />
            <text x={m.left - 8} y={geo.sy(v)} dy="0.35em" textAnchor="end" fontSize="12" fill={C.text}
              style={{ fontVariantNumeric: "tabular-nums" }}>
              {nf.format(v)}
            </text>
          </g>
        ))}
        <line x1={m.left} x2={width - m.right} y1={m.top + ih} y2={m.top + ih} stroke={C.axis} />
        {geo.xTicks.map((t, i) => (
          <text key={i} x={t.x} y={height - 10} fontSize="12" fill={C.text}
            textAnchor={i === 0 ? "start" : i === geo.xTicks.length - 1 ? "end" : "middle"}>
            {t.label}
          </text>
        ))}

        <path d={geo.area} fill={C.area} />
        <path d={geo.line} fill="none" stroke={C.line} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* letzter Wert direkt beschriftet */}
        <circle cx={geo.pts.at(-1)[0]} cy={geo.pts.at(-1)[1]} r="4" fill={C.line} stroke="#fff" strokeWidth="2" />

        {hp ? (
          <g pointerEvents="none">
            <line x1={hx} x2={hx} y1={m.top} y2={m.top + ih} stroke={C.axis} strokeDasharray="3 3" />
            <circle cx={hx} cy={hy} r="5" fill={C.line} stroke="#fff" strokeWidth="2" />
          </g>
        ) : null}
      </svg>

      {hp ? (
        <div
          style={{
            position: "absolute",
            top: Math.max(0, hy - 70),
            left: tipLeft ? undefined : hx + 12,
            right: tipLeft ? width - hx + 12 : undefined,
            background: "#fff",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 10,
            boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
            padding: "8px 12px",
            fontSize: 14,
            lineHeight: 1.45,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <div style={{ color: C.text }}>{fmtPeriod(hp.period, bucket)}</div>
          <div style={{ fontWeight: 800, color: C.ink }}>{nf.format(hp.bestand)} Bücher</div>
          <div style={{ color: C.text }}>
            +{nf.format(hp.zugang)} Zugang · −{nf.format(hp.abgang)} Abgang
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="zr-card" style={{ padding: "12px 16px", minWidth: 150, flex: "1 1 150px" }}>
      <div style={{ fontSize: "0.75em", color: C.text }}>{label}</div>
      <div style={{ fontSize: "1.6em", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub ? <div style={{ fontSize: "0.7em", color: C.text }}>{sub}</div> : null}
    </div>
  );
}

export default function AdminStockPage() {
  const [rangeKey, setRangeKey] = useState(() => {
    try { return localStorage.getItem("zr.stock.range") || "1y"; } catch { return "1y"; }
  });
  const range = RANGES.find((r) => r.key === rangeKey) || RANGES[2];

  const [cache, setCache] = useState({}); // bucket -> response
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    try { localStorage.setItem("zr.stock.range", range.key); } catch { /* egal */ }
    if (cache[range.bucket]) return;
    let cancelled = false;
    setLoading(true);
    setErr("");
    fetch(buildUrl(`/admin/stock/history?bucket=${range.bucket}`), { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d) => { if (!cancelled) setCache((c) => ({ ...c, [range.bucket]: d })); })
      .catch((e) => { if (!cancelled) setErr(e?.message || "Laden fehlgeschlagen"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range.key, range.bucket, cache]);

  const data = cache[range.bucket];

  const points = useMemo(() => {
    const all = Array.isArray(data?.points) ? data.points : [];
    if (!range.days) return all;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - range.days);
    return all.filter((p) => parseDay(p.period) >= from);
  }, [data, range.days]);

  const current = data?.current || {};
  const total = (current.in_stock ?? 0) + (current.in_progress ?? 0);
  const first = points[0];
  const last = points.at(-1);
  const zu = points.reduce((s, p) => s + p.zugang, 0);
  const ab = points.reduce((s, p) => s + p.abgang, 0);
  const delta = first && last ? last.bestand - (first.bestand - first.zugang + first.abgang) : 0;

  return (
    <section className="zr-section">
      <AdminNavRow />

      <h1 style={{ marginBottom: 6 }}>Bestand</h1>
      <p className="zr-lede" style={{ marginTop: 0 }}>
        Bücher im Bestand (ungelesen + in Lektüre) im Zeitverlauf. Zugang = neu erfasst, Abgang = gelesen oder abgebrochen.
      </p>

      {data ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <Stat label="Bestand heute" value={nf.format(total)}
            sub={`${nf.format(current.in_stock ?? 0)} ungelesen · ${nf.format(current.in_progress ?? 0)} in Lektüre`} />
          <Stat label={`Veränderung (${range.label})`} value={`${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${nf.format(Math.abs(delta))}`}
            sub={`+${nf.format(zu)} Zugang · −${nf.format(ab)} Abgang`} />
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }} role="group" aria-label="Zeitraum">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            className="zr-btn2 zr-btn2--ghost"
            aria-pressed={r.key === range.key}
            onClick={() => setRangeKey(r.key)}
            style={{
              borderRadius: 999,
              padding: "6px 12px",
              fontWeight: 700,
              background: r.key === range.key ? "rgba(0,0,0,0.08)" : "#fff",
            }}
          >
            {r.label}
          </button>
        ))}
        <span style={{ alignSelf: "center", fontSize: "0.7em", color: C.text }}>
          je {BUCKET_LABEL[range.bucket]}{loading ? " · lädt…" : ""}
        </span>
      </div>

      {err ? <div className="zr-card" style={{ color: "#a00" }}>Fehler: {err}</div> : null}

      <div className="zr-card" style={{ padding: 12 }}>
        {data ? <StockChart points={points} bucket={range.bucket} /> : <div style={{ height: 340 }}>Lade…</div>}
      </div>

      {points.length ? (
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer" }}>Tabelle anzeigen</summary>
          <div style={{ maxHeight: 360, overflow: "auto", marginTop: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums", fontSize: "0.8em" }}>
              <thead>
                <tr style={{ textAlign: "right" }}>
                  <th style={{ textAlign: "left", padding: 6 }}>{BUCKET_LABEL[range.bucket]}</th>
                  <th style={{ padding: 6 }}>Zugang</th>
                  <th style={{ padding: 6 }}>Abgang</th>
                  <th style={{ padding: 6 }}>Bestand</th>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map((p) => (
                  <tr key={p.period} style={{ textAlign: "right", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                    <td style={{ textAlign: "left", padding: 6 }}>{fmtPeriod(p.period, range.bucket)}</td>
                    <td style={{ padding: 6 }}>{p.zugang ? `+${nf.format(p.zugang)}` : "–"}</td>
                    <td style={{ padding: 6 }}>{p.abgang ? `−${nf.format(p.abgang)}` : "–"}</td>
                    <td style={{ padding: 6, fontWeight: 700 }}>{nf.format(p.bestand)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </section>
  );
}

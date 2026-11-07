// frontend/src/pages/AdminDashboardPage.jsx
// Dashboard: alle Kennzahlen zum Buchbestand auf einen Blick.
// Daten: GET /api/admin/stats/overview
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminNavRow from "../components/AdminNavRow";
import { API_BASE } from "../api/config";

const ENV_BASE = (import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_API_BASE || "").trim();
const BASE = String(ENV_BASE || API_BASE || "/api").replace(/\/$/, "");
function buildUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (BASE.endsWith("/api") && p.startsWith("/api/")) return `${BASE}${p.slice(4)}`;
  return `${BASE}${p}`;
}

const nf = new Intl.NumberFormat("de-DE");
const pf = new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1 });

const TEXT = "rgba(0,0,0,0.62)";

// Reihenfolge = Lebenszyklus eines Buches
const STATUSES = [
  { key: "in_stock", label: "Im Bestand (ungelesen)", short: "Ungelesen", color: "#2F6FDB" },
  { key: "in_progress", label: "In Lektüre", short: "In Lektüre", color: "#E0A100" },
  { key: "finished", label: "Gelesen", short: "Gelesen", color: "#008A55" },
  { key: "abandoned", label: "Abgebrochen", short: "Abgebrochen", color: "#C8473A" },
  { key: "lost", label: "Verloren", short: "Verloren", color: "#5E35B1" },
];
const WISHLIST = { key: "wishlist", label: "Wunschliste", color: "#8A8F98" };

function Tile({ label, value, sub, color, big = false }) {
  return (
    <div
      className="zr-card"
      style={{
        padding: "12px 16px",
        flex: big ? "1 1 100%" : "1 1 220px",
        minWidth: 0,
        borderLeft: color ? `6px solid ${color}` : undefined,
      }}
    >
      <div style={{ fontSize: "0.75em", color: TEXT }}>{label}</div>
      <div style={{ fontSize: big ? "2.4em" : "1.7em", fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1.15 }}>
        {value}
      </div>
      {sub ? <div style={{ fontSize: "0.7em", color: TEXT }}>{sub}</div> : null}
    </div>
  );
}

// Gestapelter Balken: Anteile der Status am Gesamtbestand
function ShareBar({ counts, total }) {
  if (!total) return null;
  return (
    <div className="zr-card" style={{ padding: "12px 16px", marginBottom: 14 }}>
      <div style={{ fontSize: "0.75em", color: TEXT, marginBottom: 8 }}>Verteilung des Bestands</div>
      <div
        role="img"
        aria-label={STATUSES.map((s) => `${s.short}: ${pf.format((counts[s.key] || 0) / total)}`).join(", ")}
        style={{ display: "flex", height: 28, borderRadius: 8, overflow: "hidden", gap: 2, background: "#fff" }}
      >
        {STATUSES.map((s) => {
          const n = counts[s.key] || 0;
          if (!n) return null;
          return (
            <div
              key={s.key}
              title={`${s.label}: ${nf.format(n)} (${pf.format(n / total)})`}
              style={{ flex: `${n} 1 0`, background: s.color, minWidth: 3 }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px", marginTop: 8, fontSize: "0.7em" }}>
        {STATUSES.map((s) => (
          <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: s.color, display: "inline-block" }} />
            {s.short} <b style={{ fontVariantNumeric: "tabular-nums" }}>{pf.format((counts[s.key] || 0) / total)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function GenreTable({ rows }) {
  const data = useMemo(() => {
    const map = new Map();
    for (const r of rows || []) {
      const g = r.genre || "— ohne Genre —";
      if (!map.has(g)) map.set(g, { genre: g, total: 0 });
      const e = map.get(g);
      e[r.status] = (e[r.status] || 0) + r.n;
      e.total += r.n;
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [rows]);

  if (!data.length) return null;

  const sum = (k) => data.reduce((s, r) => s + (r[k] || 0), 0);
  const cell = { padding: "6px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" };

  return (
    <div className="zr-card" style={{ padding: "12px 16px", marginTop: 14 }}>
      <h2 style={{ marginTop: 0 }}>Nach Genre</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8em" }}>
          <thead>
            <tr>
              <th style={{ ...cell, textAlign: "left" }}>Genre</th>
              {STATUSES.map((s) => (
                <th key={s.key} style={{ ...cell, whiteSpace: "nowrap" }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: s.color, marginRight: 6 }} />
                  {s.short}
                </th>
              ))}
              <th style={cell}>Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.genre} style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                <td style={{ ...cell, textAlign: "left" }}>{r.genre}</td>
                {STATUSES.map((s) => (
                  <td key={s.key} style={cell}>{r[s.key] ? nf.format(r[s.key]) : "–"}</td>
                ))}
                <td style={{ ...cell, fontWeight: 700 }}>{nf.format(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid rgba(0,0,0,0.2)", fontWeight: 700 }}>
              <td style={{ ...cell, textAlign: "left" }}>Summe</td>
              {STATUSES.map((s) => (
                <td key={s.key} style={cell}>{nf.format(sum(s.key))}</td>
              ))}
              <td style={cell}>{nf.format(sum("total"))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(buildUrl("/admin/stats/overview"), { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setErr(e?.message || "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = data?.status || {};
  const total = STATUSES.reduce((s, x) => s + (counts[x.key] || 0), 0);
  const physical = (counts.in_stock || 0) + (counts.in_progress || 0);
  const done = (counts.finished || 0) + (counts.abandoned || 0);
  const p = data?.periods || {};
  const year = new Date().getFullYear();
  const month = new Date().toLocaleDateString("de-DE", { month: "long" });

  return (
    <section className="zr-section">
      <AdminNavRow />

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ marginBottom: 6 }}>Dashboard</h1>
        <button type="button" className="zr-btn2 zr-btn2--ghost" onClick={load} disabled={loading}
          style={{ borderRadius: 999, padding: "4px 12px" }}>
          {loading ? "lädt…" : "↻ Aktualisieren"}
        </button>
        {data?.generated_at ? (
          <span style={{ fontSize: "0.65em", color: TEXT }}>
            Stand {new Date(data.generated_at).toLocaleString("de-DE")}
          </span>
        ) : null}
      </div>
      <p className="zr-lede" style={{ marginTop: 0 }}>Alle Kennzahlen zum Buchbestand auf einen Blick.</p>

      {err ? <div className="zr-card" style={{ color: "#a00", marginBottom: 12 }}>Fehler: {err}</div> : null}
      {!data && !err ? <div className="zr-card">Lade…</div> : null}

      {data?.status ? (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <Tile big label="Buchbestand gesamt" value={nf.format(total)}
              sub={`${nf.format(physical)} physisch vorhanden (ungelesen + in Lektüre) · ${nf.format(done)} abgeschlossen (gelesen + abgebrochen)`} />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            {STATUSES.map((s) => (
              <Tile key={s.key} label={s.label} color={s.color}
                value={nf.format(counts[s.key] || 0)}
                sub={total ? `${pf.format((counts[s.key] || 0) / total)} vom Gesamtbestand` : null} />
            ))}
          </div>

          <ShareBar counts={counts} total={total} />

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <Tile label="Abbruchquote" color="#C8473A"
              value={done ? pf.format((counts.abandoned || 0) / done) : "–"}
              sub="Anteil abgebrochen an allen abgeschlossenen Büchern" />
            <Tile label={WISHLIST.label} color={WISHLIST.color}
              value={nf.format(counts.wishlist || 0)}
              sub="nicht im Gesamtbestand enthalten" />
          </div>
        </>
      ) : null}

      {data?.periods ? (
        <div className="zr-card" style={{ padding: "12px 16px" }}>
          <h2 style={{ marginTop: 0 }}>Aktivität</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8em", fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 6 }} />
                  <th style={{ textAlign: "right", padding: 6 }}>{month}</th>
                  <th style={{ textAlign: "right", padding: 6 }}>{year}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Neu erfasst", p.added_month, p.added_year],
                  ["Gelesen", p.finished_month, p.finished_year],
                  ["Abgebrochen", p.abandoned_month, p.abandoned_year],
                ].map(([label, m, y]) => (
                  <tr key={label} style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                    <td style={{ padding: 6 }}>{label}</td>
                    <td style={{ padding: 6, textAlign: "right", fontWeight: 700 }}>{nf.format(m || 0)}</td>
                    <td style={{ padding: 6, textAlign: "right", fontWeight: 700 }}>{nf.format(y || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: "0.65em", color: TEXT, marginTop: 8 }}>
            Verlauf über die Zeit: <Link to="/admin/stock">📈 Bestand</Link>
          </div>
        </div>
      ) : null}

      {data?.genres ? <GenreTable rows={data.genres} /> : null}
    </section>
  );
}

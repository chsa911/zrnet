// frontend/src/pages/AdminWidthsPage.jsx
// Dashboard: welche Buchbreiten kommen am häufigsten vor?
// Daten: GET /api/admin/stats/widths – Zählungen je Breite (mm) × Status × Barcode.
// Gefiltert, sortiert und gezeichnet wird hier, damit jede Umstellung sofort wirkt.
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

const LIMITS = [
  { key: 10, label: "Top 10" },
  { key: 20, label: "Top 20" },
  { key: 50, label: "Top 50" },
  { key: 0, label: "Alle" },
];

const SORTS = [
  { key: "count", label: "Nach Häufigkeit" },
  { key: "width", label: "Nach Breite" },
];

const C = {
  bar: "#2F6FDE",
  barTop: "#008A55",
  track: "rgba(0,0,0,0.05)",
  text: "rgba(0,0,0,0.62)",
};

const nf = new Intl.NumberFormat("de-DE");
const pf = new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1 });
const cmf = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const cm = (mm) => `${cmf.format(mm / 10)} cm`;

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

function ChipRow({ label, children }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }} role="group" aria-label={label}>
      <span style={{ minWidth: 90, fontSize: "0.75em", color: C.text }}>{label}</span>
      {children}
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div className="zr-card" style={{ padding: "12px 16px", minWidth: 150, flex: "1 1 150px" }}>
      <div style={{ fontSize: "0.75em", color: C.text }}>{label}</div>
      <div style={{ fontSize: "1.6em", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub ? <div style={{ fontSize: "0.75em", color: C.text }}>{sub}</div> : null}
    </div>
  );
}

function Bars({ items, total, max }) {
  const [hover, setHover] = useState(null);
  return (
    <div role="table" aria-label="Häufigste Breiten" style={{ display: "grid", gap: 4 }}>
      <div
        role="row"
        style={{
          display: "grid",
          gridTemplateColumns: "34px 78px 1fr 64px 60px",
          gap: 10,
          fontSize: "0.72em",
          color: C.text,
          paddingBottom: 4,
          borderBottom: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <span role="columnheader">#</span>
        <span role="columnheader">Breite</span>
        <span role="columnheader">Größenregel</span>
        <span role="columnheader" style={{ textAlign: "right" }}>Bücher</span>
        <span role="columnheader" style={{ textAlign: "right" }}>Anteil</span>
      </div>
      {items.map((it) => {
        const pct = max ? (it.n / max) * 100 : 0;
        const isHover = hover === it.width;
        return (
          <div
            key={it.width}
            role="row"
            onPointerEnter={() => setHover(it.width)}
            onPointerLeave={() => setHover(null)}
            title={`${cm(it.width)} (${it.width} mm): ${nf.format(it.n)} Bücher${it.rules ? ` · ${it.rules}` : ""}`}
            style={{
              display: "grid",
              gridTemplateColumns: "34px 78px 1fr 64px 60px",
              gap: 10,
              alignItems: "center",
              padding: "3px 0",
              borderRadius: 4,
              background: isHover ? "rgba(0,0,0,0.04)" : undefined,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span role="cell" style={{ color: C.text, fontSize: "0.85em" }}>{it.rank}</span>
            <span role="cell" style={{ fontWeight: 700 }}>{cm(it.width)}</span>
            <span role="cell" style={{ position: "relative", height: 22, background: C.track, borderRadius: 4 }}>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${Math.max(pct, 0.5)}%`,
                  background: it.rank === 1 ? C.barTop : C.bar,
                  opacity: isHover ? 1 : 0.85,
                  borderRadius: 4,
                }}
              />
              {it.rules ? (
                <span
                  style={{
                    position: "absolute",
                    left: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: "0.72em",
                    fontWeight: 700,
                    color: pct > 30 ? "#fff" : C.text,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    maxWidth: "calc(100% - 16px)",
                    pointerEvents: "none",
                  }}
                >
                  {it.rules}
                </span>
              ) : null}
            </span>
            <span role="cell" style={{ textAlign: "right", fontWeight: 700 }}>{nf.format(it.n)}</span>
            <span role="cell" style={{ textAlign: "right", color: C.text }}>{pf.format(it.n / total)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminWidthsPage() {
  const [statuses, setStatuses] = useState(() => loadPref("zr.widths.statuses", PRESETS[0].statuses));
  const [barcode, setBarcode] = useState(() => loadPref("zr.widths.barcode", "all"));
  const [limit, setLimit] = useState(() => loadPref("zr.widths.limit", 20));
  const [sort, setSort] = useState(() => loadPref("zr.widths.sort", "count"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => savePref("zr.widths.statuses", statuses), [statuses]);
  useEffect(() => savePref("zr.widths.barcode", barcode), [barcode]);
  useEffect(() => savePref("zr.widths.limit", limit), [limit]);
  useEffect(() => savePref("zr.widths.sort", sort), [sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr("");
    fetch(buildUrl("/admin/stats/widths"), { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setErr(e?.message || "Laden fehlgeschlagen"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    const sel = new Set(statuses);
    const by = new Map();
    let missing = 0;
    for (const r of rows) {
      if (!sel.has(r.status)) continue;
      if (barcode === "with" && !r.has_barcode) continue;
      if (barcode === "without" && r.has_barcode) continue;
      if (r.width == null || !(Number(r.width) > 0)) {
        missing += r.n;
        continue;
      }
      const w = Number(r.width);
      const cur = by.get(w) || { width: w, rules: r.rules || "", n: 0 };
      cur.n += r.n;
      by.set(w, cur);
    }
    const ranked = [...by.values()]
      .sort((a, b) => b.n - a.n || a.width - b.width)
      .map((it, i) => ({ ...it, rank: i + 1 }));
    const total = ranked.reduce((t, it) => t + it.n, 0);
    const top10 = ranked.slice(0, 10).reduce((t, it) => t + it.n, 0);

    // Median-Breite über alle Bücher
    let median = null;
    if (total) {
      const half = total / 2;
      let acc = 0;
      for (const it of [...ranked].sort((a, b) => a.width - b.width)) {
        acc += it.n;
        if (acc >= half) { median = it.width; break; }
      }
    }
    return { ranked, total, missing, top10, median, distinct: ranked.length };
  }, [data, statuses, barcode]);

  const shown = useMemo(() => {
    const list = limit ? stats.ranked.slice(0, limit) : stats.ranked;
    return sort === "width" ? [...list].sort((a, b) => a.width - b.width) : list;
  }, [stats, limit, sort]);

  const maxN = stats.ranked[0]?.n || 0;

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
  const top = stats.ranked[0];

  return (
    <section className="zr-section">
      <AdminNavRow />

      <h1 style={{ marginBottom: 6 }}>Häufigste Breiten</h1>
      <p className="zr-lede" style={{ marginTop: 0 }}>
        Welche Buchbreiten in der gewählten Bücher-Menge am meisten vorkommen.
      </p>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <ChipRow label="Bereich">
          {PRESETS.map((p) => (
            <Chip key={p.key} active={activePreset?.key === p.key} onClick={() => setStatuses(p.statuses)}>
              {p.label}
            </Chip>
          ))}
        </ChipRow>

        <ChipRow label="Status">
          {STATUSES.map((s) => (
            <Chip key={s.key} active={statuses.includes(s.key)} onClick={() => toggleStatus(s.key)}>
              {statuses.includes(s.key) ? "✓ " : ""}{s.label}
            </Chip>
          ))}
        </ChipRow>

        <ChipRow label="Barcode">
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
        </ChipRow>

        <ChipRow label="Anzeige">
          {LIMITS.map((l) => (
            <Chip key={l.key} active={limit === l.key} onClick={() => setLimit(l.key)}>{l.label}</Chip>
          ))}
          <span style={{ width: 8 }} />
          {SORTS.map((s) => (
            <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>{s.label}</Chip>
          ))}
        </ChipRow>
      </div>

      {err ? <div className="zr-card" style={{ color: "#a00" }}>Fehler: {err}</div> : null}

      {data && stats.total ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <Kpi
            label="Häufigste Breite"
            value={top ? cm(top.width) : "–"}
            sub={top ? `${nf.format(top.n)} Bücher · ${pf.format(top.n / stats.total)}` : ""}
          />
          <Kpi label="Verschiedene Breiten" value={nf.format(stats.distinct)} sub={`bei ${nf.format(stats.total)} Büchern`} />
          <Kpi label="Anteil Top 10" value={pf.format(stats.top10 / stats.total)} sub="der Bücher mit Breite" />
          <Kpi label="Median-Breite" value={stats.median != null ? cm(stats.median) : "–"} />
          <Kpi label="Ohne Breite" value={nf.format(stats.missing)} sub="nicht im Diagramm" />
        </div>
      ) : null}

      <div className="zr-card" style={{ padding: 16 }}>
        <div style={{ fontSize: "0.8em", color: C.text, marginBottom: 10 }}>
          {statusText}{barcodeText}
          {limit && stats.ranked.length > limit ? ` · ${limit} von ${nf.format(stats.ranked.length)} Breiten` : ""}
        </div>
        {!data ? (
          <div style={{ height: 300 }}>{loading ? "Lade…" : ""}</div>
        ) : stats.total ? (
          <Bars items={shown} total={stats.total} max={maxN} />
        ) : (
          <div style={{ padding: "24px 0", color: C.text }}>Keine Bücher mit Breite für diese Auswahl.</div>
        )}
      </div>
    </section>
  );
}

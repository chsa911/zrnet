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
  { key: 0, label: "Alle Breiten" },
];

const SORTS = [
  { key: "count", label: "Nach Häufigkeit" },
  { key: "width", label: "Nach Breite" },
];

// Breiten-Schema (mm, inklusive Grenzen):
// 1 = 0–10,4 cm, 2–24 = Halbzentimeter-Schritte ab 10,5 cm, 25 = 22–100 cm
const BUCKETS = [
  { no: 1, min: 0, max: 104 },
  ...Array.from({ length: 23 }, (_, i) => ({ no: i + 2, min: 105 + i * 5, max: 109 + i * 5 })),
  { no: 25, min: 220, max: 1000 },
];
const fmtCm = (mm) => (mm % 10 === 0 ? String(mm / 10) : cmf.format(mm / 10));
const bucketLabel = (b) => `${fmtCm(b.min)}–${fmtCm(b.max)} cm`;

const GROUPS = [
  { key: "buckets", label: "Bereiche (Schema)" },
  { key: "widths", label: "Einzelne Breiten" },
];

const BUCKET_SORTS = [
  { key: "no", label: "Nach Bereich" },
  { key: "count", label: "Nach Häufigkeit" },
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

function Bars({ items, total, max, labelHeader = "Breite", labelWidth = 76, ariaLabel = "Häufigste Breiten" }) {
  const cols = `34px ${labelWidth}px 1fr 64px 60px`;
  const [hover, setHover] = useState(null);
  return (
    <div role="table" aria-label={ariaLabel} style={{ display: "grid", gap: 4 }}>
      <div
        role="row"
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gap: 10,
          fontSize: "0.72em",
          color: C.text,
          paddingBottom: 4,
          borderBottom: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <span role="columnheader">#</span>
        <span role="columnheader">{labelHeader}</span>
        <span role="columnheader">Größenregel</span>
        <span role="columnheader" style={{ textAlign: "right" }}>Bücher</span>
        <span role="columnheader" style={{ textAlign: "right" }}>Anteil</span>
      </div>
      {items.map((it) => {
        const pct = max ? (it.n / max) * 100 : 0;
        const isEmpty = !it.n;
        const key = it.key ?? it.width;
        const label = it.label ?? cm(it.width);
        const isHover = hover === key;
        return (
          <div
            key={key}
            role="row"
            onPointerEnter={() => setHover(key)}
            onPointerLeave={() => setHover(null)}
            title={it.title ?? `${cm(it.width)} (${it.width} mm): ${nf.format(it.n)} Bücher${it.rules ? ` · ${it.rules}` : ""}`}
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: 10,
              alignItems: "center",
              padding: "3px 0",
              borderRadius: 4,
              background: isHover ? "rgba(0,0,0,0.04)" : undefined,
              fontVariantNumeric: "tabular-nums",
              opacity: isEmpty ? 0.55 : 1,
            }}
          >
            <span role="cell" style={{ color: C.text, fontSize: "0.85em" }}>{it.rank ?? "–"}</span>
            <span role="cell" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>
            <span role="cell" style={{ position: "relative", height: 22, background: C.track, borderRadius: 4 }}>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  width: isEmpty ? 0 : `${Math.max(pct, 0.5)}%`,
                  background: it.top ?? it.rank === 1 ? C.barTop : C.bar,
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
                    color: !isEmpty && pct > 30 ? "#fff" : C.text,
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
            <span role="cell" style={{ textAlign: "right", color: C.text }}>{total ? pf.format(it.n / total) : "–"}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminWidthsPage() {
  const [statuses, setStatuses] = useState(() => loadPref("zr.widths.statuses", PRESETS[0].statuses));
  const [barcode, setBarcode] = useState(() => loadPref("zr.widths.barcode", "all"));
  // v2: Standard ist jetzt die komplette, lückenlose Breitenspanne
  const [limit, setLimit] = useState(() => loadPref("zr.widths.limit.v2", 0));
  const [sort, setSort] = useState(() => loadPref("zr.widths.sort", "count"));
  const [group, setGroup] = useState(() => loadPref("zr.widths.group", "buckets"));
  const [bucketSort, setBucketSort] = useState(() => loadPref("zr.widths.bucketSort", "no"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => savePref("zr.widths.statuses", statuses), [statuses]);
  useEffect(() => savePref("zr.widths.barcode", barcode), [barcode]);
  useEffect(() => savePref("zr.widths.limit.v2", limit), [limit]);
  useEffect(() => savePref("zr.widths.sort", sort), [sort]);
  useEffect(() => savePref("zr.widths.group", group), [group]);
  useEffect(() => savePref("zr.widths.bucketSort", bucketSort), [bucketSort]);

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
    // Komplette Spanne: jede Breite (mm) von der kleinsten bis zur größten,
    // auch solche ohne Bücher – mit passender Größenregel.
    const sizeRules = Array.isArray(data?.sizeRules) ? data.sizeRules : [];
    const rulesFor = (w) =>
      [...new Set(sizeRules.filter((r) => w >= r.min_width && w <= r.max_width).map((r) => r.name))]
        .sort()
        .join(", ");
    const full = [];
    let minW = null;
    let maxW = null;
    if (ranked.length) {
      minW = Math.min(...ranked.map((it) => it.width));
      maxW = Math.max(...ranked.map((it) => it.width));
      const byWidth = new Map(ranked.map((it) => [it.width, it]));
      for (let w = minW; w <= maxW; w++) {
        const hit = byWidth.get(w);
        full.push(hit || { width: w, n: 0, rank: null, rules: rulesFor(w) });
      }
    }
    const empty = full.length - ranked.length;
    return { ranked, full, total, missing, top10, median, distinct: ranked.length, minW, maxW, empty };
  }, [data, statuses, barcode]);

  const shown = useMemo(() => {
    if (!limit) {
      // Alle Breiten der Spanne (inkl. 0 Bücher)
      return sort === "width"
        ? stats.full
        : [...stats.full].sort((a, b) => b.n - a.n || a.width - b.width);
    }
    const list = stats.ranked.slice(0, limit);
    return sort === "width" ? [...list].sort((a, b) => a.width - b.width) : list;
  }, [stats, limit, sort]);

  const buckets = useMemo(() => {
    const sizeRules = Array.isArray(data?.sizeRules) ? data.sizeRules : [];
    const list = BUCKETS.map((b) => {
      const inB = stats.ranked.filter((it) => it.width >= b.min && it.width <= b.max);
      const n = inB.reduce((t, it) => t + it.n, 0);
      const names = n
        ? inB.flatMap((it) => (it.rules ? it.rules.split(", ") : []))
        : sizeRules.filter((r) => r.min_width <= b.max && r.max_width >= b.min).map((r) => r.name);
      const rules = [...new Set(names)].sort().join(", ");
      const label = bucketLabel(b);
      return {
        key: `b${b.no}`,
        rank: b.no,
        label,
        n,
        rules,
        widths: inB.length,
        title: `Bereich ${b.no}: ${label} (${b.min}–${b.max} mm): ${nf.format(n)} Bücher` +
          (inB.length ? ` · ${inB.length} verschiedene Breiten` : "") + (rules ? ` · ${rules}` : ""),
      };
    });
    const maxB = Math.max(0, ...list.map((b) => b.n));
    for (const b of list) b.top = b.n > 0 && b.n === maxB;
    const inside = list.reduce((t, b) => t + b.n, 0);
    const outside = stats.total - inside;
    const shownB = bucketSort === "count" ? [...list].sort((a, b) => b.n - a.n || a.rank - b.rank) : list;
    const topB = list.find((b) => b.top) || null;
    return { list, shown: shownB, max: maxB, outside, top: topB, empty: list.filter((b) => !b.n).length };
  }, [data, stats, bucketSort]);

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

      <h1 style={{ marginBottom: 6 }}>Breiten</h1>
      <p className="zr-lede" style={{ marginTop: 0 }}>
        Wie viele Bücher in jeden Breitenbereich fallen – oder, unter „Einzelne Breiten“, jede Breite für sich.
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

        <ChipRow label="Gruppierung">
          {GROUPS.map((g) => (
            <Chip key={g.key} active={group === g.key} onClick={() => setGroup(g.key)}>{g.label}</Chip>
          ))}
        </ChipRow>

        {group === "buckets" ? (
          <ChipRow label="Anzeige">
            {BUCKET_SORTS.map((s) => (
              <Chip key={s.key} active={bucketSort === s.key} onClick={() => setBucketSort(s.key)}>{s.label}</Chip>
            ))}
          </ChipRow>
        ) : (
          <ChipRow label="Anzeige">
            {LIMITS.map((l) => (
              <Chip key={l.key} active={limit === l.key} onClick={() => setLimit(l.key)}>{l.label}</Chip>
            ))}
            <span style={{ width: 8 }} />
            {SORTS.map((s) => (
              <Chip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>{s.label}</Chip>
            ))}
          </ChipRow>
        )}
      </div>

      {err ? <div className="zr-card" style={{ color: "#a00" }}>Fehler: {err}</div> : null}

      {data && stats.total && group === "buckets" ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <Kpi
            label="Häufigster Bereich"
            value={buckets.top ? buckets.top.label : "–"}
            sub={buckets.top ? `Bereich ${buckets.top.rank} · ${nf.format(buckets.top.n)} Bücher · ${pf.format(buckets.top.n / stats.total)}` : ""}
          />
          <Kpi label="Bücher mit Breite" value={nf.format(stats.total)} sub={`${nf.format(BUCKETS.length - buckets.empty)} von ${BUCKETS.length} Bereichen belegt`} />
          <Kpi label="Median-Breite" value={stats.median != null ? cm(stats.median) : "–"} />
          <Kpi
            label="Ohne Breite"
            value={nf.format(stats.missing)}
            sub={buckets.outside ? `+ ${nf.format(buckets.outside)} außerhalb des Schemas` : "nicht im Diagramm"}
          />
        </div>
      ) : null}

      {data && stats.total && group === "widths" ? (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <Kpi
            label="Häufigste Breite"
            value={top ? cm(top.width) : "–"}
            sub={top ? `${nf.format(top.n)} Bücher · ${pf.format(top.n / stats.total)}` : ""}
          />
          <Kpi label="Verschiedene Breiten" value={nf.format(stats.distinct)} sub={`bei ${nf.format(stats.total)} Büchern`} />
          <Kpi
            label="Breitenspanne"
            value={stats.minW != null ? `${cmf.format(stats.minW / 10)}–${cm(stats.maxW)}` : "–"}
            sub={`${nf.format(stats.full.length)} Breiten · ${nf.format(stats.empty)} ohne Bücher`}
          />
          <Kpi label="Anteil Top 10" value={pf.format(stats.top10 / stats.total)} sub="der Bücher mit Breite" />
          <Kpi label="Median-Breite" value={stats.median != null ? cm(stats.median) : "–"} />
          <Kpi label="Ohne Breite" value={nf.format(stats.missing)} sub="nicht im Diagramm" />
        </div>
      ) : null}

      <div className="zr-card" style={{ padding: 16 }}>
        <div style={{ fontSize: "0.8em", color: C.text, marginBottom: 10 }}>
          {statusText}{barcodeText}
          {group === "widths" && limit && stats.ranked.length > limit ? ` · ${limit} von ${nf.format(stats.ranked.length)} Breiten` : ""}
          {group === "buckets" ? ` · ${BUCKETS.length} Bereiche nach Schema` : ""}
          {group === "widths" && !limit && stats.full.length
            ? ` · alle ${nf.format(stats.full.length)} Breiten von ${cm(stats.minW)} bis ${cm(stats.maxW)}` +
              (stats.empty ? ` (${nf.format(stats.empty)} ohne Bücher)` : "")
            : ""}
        </div>
        {!data ? (
          <div style={{ height: 300 }}>{loading ? "Lade…" : ""}</div>
        ) : stats.total ? (
          group === "buckets" ? (
            <Bars
              items={buckets.shown}
              total={stats.total}
              max={buckets.max}
              labelHeader="Bereich"
              labelWidth={112}
              ariaLabel="Bücher je Breitenbereich"
            />
          ) : (
            <Bars items={shown} total={stats.total} max={maxN} />
          )
        ) : (
          <div style={{ padding: "24px 0", color: C.text }}>Keine Bücher mit Breite für diese Auswahl.</div>
        )}
      </div>
    </section>
  );
}

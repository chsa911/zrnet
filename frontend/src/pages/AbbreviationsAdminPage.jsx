import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminNavRow from "../components/AdminNavRow";
import { getApiRoot } from "../api/apiRoot";

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function normalizeLevelValue(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

function compactLabel(row) {
  const abbr = String(row?.abbr_display || row?.abbr_raw || row?.abbr_norm || "").trim().toLowerCase();
  const lastName = String(row?.author_last_name || "").trim();
  const titles = Number.isFinite(Number(row?.published_titles)) ? Number(row.published_titles) : null;
  if (!abbr && !lastName) return "—";
  if (titles == null) return `${abbr} ${lastName}`.trim();
  return `${abbr} ${lastName}, ${titles}`.trim();
}

export default function AbbreviationsAdminPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const acRef = useRef(null);

  useEffect(() => {
    if (acRef.current) acRef.current.abort();
    const ac = new AbortController();
    acRef.current = ac;

    const params = new URLSearchParams();
    params.set("source", "authors");
    params.set("type", "author");
    if (level !== "all") params.set("level", level);
    if (q.trim()) params.set("q", q.trim());
    params.set("limit", "2000");

    setLoading(true);
    setErr("");

    fetch(`${getApiRoot()}/admin/abbreviations?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
      signal: ac.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error("Please login to view abbreviations.");
          }
          if (res.status === 404) {
            throw new Error("Backend route /api/admin/abbreviations is missing.");
          }
          const text = await res.text().catch(() => "");
          throw new Error(text || `Request failed (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (ac.signal.aborted) return;
        setRows(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setRows([]);
        setErr(e?.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [q, level]);

  const sortedRows = useMemo(() => {
    return rows
      .filter((row) => normalizeText(row?.type) === "author")
      .filter((row) => {
        const len = normalizeLevelValue(row?.abbr_len);
        if (!len) return false;
        if (level === "all") return true;
        return len === Number(level);
      })
      .sort((a, b) => {
        const abbrDiff = normalizeText(a?.abbr_norm || a?.abbr_display || a?.abbr_raw).localeCompare(
          normalizeText(b?.abbr_norm || b?.abbr_display || b?.abbr_raw),
          "de"
        );
        if (abbrDiff !== 0) return abbrDiff;

        const lenDiff = normalizeLevelValue(a?.abbr_len) - normalizeLevelValue(b?.abbr_len);
        if (lenDiff !== 0) return lenDiff;

        return normalizeText(a?.author_last_name).localeCompare(normalizeText(b?.author_last_name), "de");
      });
  }, [rows, level]);

  return (
    <section className="zr-section" aria-busy={loading ? "true" : "false"}>
      <AdminNavRow />

      <h1>Abbreviations</h1>
      <p className="zr-lede">
        Kompakte Ansicht nur für Autoren: <strong>a. Archer, 60</strong>. Sortierung streng alphabetisch über alle Ebenen:
        <strong> a. → ab → abc → b.</strong>
      </p>

      <div className="zr-card" style={{ marginBottom: 14 }}>
        {err ? (
          <div className="zr-alert zr-alert--error" style={{ display: "grid", gap: 6, marginBottom: 12 }}>
            <div>{err}</div>
            {(String(err).toLowerCase().includes("login") ||
              String(err).toLowerCase().includes("unauthorized") ||
              String(err).toLowerCase().includes("forbidden")) && (
              <div>
                <Link to="/admin?next=/admin/abbreviations">Go to Admin login</Link>
              </div>
            )}
          </div>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(240px,1fr) auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: 6 }}>
            Suche
            <input
              className="zr-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="z. B. a, ab, archer"
            />
          </label>

          <div style={{ display: "grid", gap: 6 }}>
            <div>Level-Filter</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["all", "Alle"],
                ["1", "1"],
                ["2", "2"],
                ["3", "3"],
                ["4", "4"],
              ].map(([value, label]) => {
                const active = level === value;
                return (
                  <button
                    key={value}
                    type="button"
                    className="zr-btn2 zr-btn2--ghost"
                    onClick={() => setLevel(value)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(0,0,0,0.14)",
                      background: active ? "rgba(0,0,0,0.08)" : "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="zr-card" style={{ marginBottom: 14, padding: 12 }}>
        <strong>{sortedRows.length}</strong> Einträge, streng alphabetisch sortiert.
      </div>

      {loading ? <div className="zr-alert">Loading…</div> : null}

      {!loading && sortedRows.length > 0 ? (
        <div className="zr-card">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            {sortedRows.map((row, idx) => {
              const key = `${row.abbr_norm || row.abbr_display || "row"}-${row.author_last_name || ""}-${idx}`;
              return (
                <div
                  key={key}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: "rgba(0,0,0,0.035)",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: 15,
                    lineHeight: 1.35,
                  }}
                  title={compactLabel(row)}
                >
                  {compactLabel(row)}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {!loading && sortedRows.length === 0 ? <div className="zr-alert">Keine Einträge gefunden.</div> : null}
    </section>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import AdminNavRow from "../components/AdminNavRow";
import RequireAdmin from "../components/RequireAdmin";
import { getBarcodeSummary, listBarcodes } from "../api/barcodes";

function fmtTs(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function pill(text) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.18)",
        fontSize: 12,
        fontWeight: 700,
        opacity: 0.9,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div
      className="zr-card"
      style={{
        padding: 14,
        minWidth: 160,
        flex: "1 1 160px",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.05 }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, opacity: 0.7 }}>{hint}</div> : null}
    </div>
  );
}

function Inner() {
  const [summary, setSummary] = useState({
    total: 0,
    available: 0,
    assigned: 0,
    other: 0,
    open_assigned: 0,
    mismatch: { assigned_without_open: 0, open_without_assigned: 0 },
  });
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryErr, setSummaryErr] = useState("");

  const [filters, setFilters] = useState({ status: "", q: "", page: 1, limit: 50 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState({ items: [], totalItems: 0, pages: 1 });

  const canPrev = useMemo(() => filters.page > 1, [filters.page]);
  const canNext = useMemo(() => filters.page < (data.pages || 1), [filters.page, data.pages]);

  async function refreshSummary() {
    setLoadingSummary(true);
    setSummaryErr("");
    try {
      const s = await getBarcodeSummary();
      setSummary({
        total: Number(s?.total ?? 0) || 0,
        available: Number(s?.available ?? 0) || 0,
        assigned: Number(s?.assigned ?? 0) || 0,
        other: Number(s?.other ?? 0) || 0,
        open_assigned: Number(s?.open_assigned ?? 0) || 0,
        mismatch: s?.mismatch || { assigned_without_open: 0, open_without_assigned: 0 },
      });
    } catch (e) {
      setSummaryErr(e?.message || "Failed to load summary");
    } finally {
      setLoadingSummary(false);
    }
  }

  async function refreshList() {
    setLoading(true);
    setErr("");
    try {
      const d = await listBarcodes(filters);
      setData({
        items: Array.isArray(d?.items) ? d.items : [],
        totalItems: Number(d?.totalItems ?? 0) || 0,
        pages: Number(d?.pages ?? 1) || 1,
      });
    } catch (e) {
      setData({ items: [], totalItems: 0, pages: 1 });
      setErr(e?.message || "Failed to load barcodes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.q, filters.page, filters.limit]);

  const mismatchNote = useMemo(() => {
    const a = Number(summary?.mismatch?.assigned_without_open || 0);
    const b = Number(summary?.mismatch?.open_without_assigned || 0);
    if (!a && !b) return "Inventory & assignments look consistent.";
    return `⚠️ Mismatch: ${a} ASSIGNED without open assignment, ${b} open assignment without ASSIGNED.`;
  }, [summary?.mismatch]);

  return (
    <section className="zr-section">
      <AdminNavRow />

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>Barcodes</h1>
          <p className="zr-lede" style={{ marginTop: 0 }}>
            Barcode inventory dashboard: total, taken, and available.
          </p>
        </div>

        <button
          className="zr-btn2 zr-btn2--ghost"
          onClick={() => {
            refreshSummary();
            refreshList();
          }}
          disabled={loading || loadingSummary}
        >
          ⟳ Refresh
        </button>
      </div>

      {summaryErr ? (
        <div className="zr-card" style={{ border: "1px solid rgba(160,0,0,0.25)", color: "#a00" }}>
          {summaryErr}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <StatCard label="Total" value={loadingSummary ? "…" : summary.total} />
        <StatCard label="Available" value={loadingSummary ? "…" : summary.available} hint="status = AVAILABLE" />
        <StatCard label="Taken" value={loadingSummary ? "…" : summary.assigned} hint="status = ASSIGNED" />
        <StatCard label="Other" value={loadingSummary ? "…" : summary.other} hint="rare / special" />
        <StatCard label="Open assignments" value={loadingSummary ? "…" : summary.open_assigned} hint="barcode_assignments (freed_at IS NULL)" />
      </div>

      <div className="zr-card" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "grid", gap: 6, minWidth: 180 }}>
            Status
            <select
              className="zr-input"
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value, page: 1 }))}
            >
              <option value="">All</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="ASSIGNED">ASSIGNED</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 240, flex: "1 1 240px" }}>
            Search barcode
            <input
              className="zr-input"
              value={filters.q}
              onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value, page: 1 }))}
              placeholder="e.g. dgk001"
            />
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 120 }}>
            Per page
            <select
              className="zr-input"
              value={filters.limit}
              onChange={(e) => setFilters((p) => ({ ...p, limit: Number(e.target.value) || 50, page: 1 }))}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{mismatchNote}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="zr-btn2 zr-btn2--ghost"
              disabled={!canPrev || loading}
              onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
            >
              ← Prev
            </button>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Page <b>{filters.page}</b> / {data.pages || 1} ({data.totalItems || 0} total)
            </div>
            <button
              className="zr-btn2 zr-btn2--ghost"
              disabled={!canNext || loading}
              onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <div className="zr-card" style={{ padding: 0, overflow: "auto" }}>
        {err ? (
          <div style={{ padding: 14, color: "#a00" }}>{err}</div>
        ) : null}

        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.04)", textAlign: "left" }}>
              <th style={{ padding: 10 }}>Barcode</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Sizegroup</th>
              <th style={{ padding: 10 }}>Band</th>
              <th style={{ padding: 10 }}>Rank</th>
              <th style={{ padding: 10 }}>Book</th>
              <th style={{ padding: 10 }}>Assigned at</th>
              <th style={{ padding: 10 }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 14, opacity: 0.75 }}>
                  Loading…
                </td>
              </tr>
            ) : (data.items || []).length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 14, opacity: 0.75 }}>
                  No barcodes found.
                </td>
              </tr>
            ) : (
              (data.items || []).map((it) => {
                const title = it?.book_title || "";
                const author = it?.book_author || "";
                const bookLine = (title || author)
                  ? `${title}${title && author ? " — " : ""}${author}`
                  : it?.book_id
                    ? String(it.book_id)
                    : "—";

                return (
                  <tr key={it.barcode} style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                    <td style={{ padding: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{it.barcode}</td>
                    <td style={{ padding: 10 }}>{pill(it.status || "—")}</td>
                    <td style={{ padding: 10 }}>{it.sizegroup ?? "—"}</td>
                    <td style={{ padding: 10 }}>{it.band ?? "—"}</td>
                    <td style={{ padding: 10 }}>{it.rank_in_inventory ?? "—"}</td>
                    <td style={{ padding: 10, maxWidth: 360 }}>
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={bookLine}>
                        {bookLine}
                      </div>
                      {it?.book_reading_status ? (
                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                          {it.book_reading_status}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: 10 }}>{fmtTs(it.assigned_at)}</td>
                    <td style={{ padding: 10 }}>{fmtTs(it.updated_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function BarcodeDashboardPage() {
  return (
    <RequireAdmin>
      <Inner />
    </RequireAdmin>
  );
}

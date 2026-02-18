import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminNavRow from "../components/AdminNavRow";
import RequireAdmin from "../components/RequireAdmin";
import { approveComment, listAdminComments, rejectComment } from "../api/comments";

function fmtTs(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function Inner() {
  const [filters, setFilters] = useState({ status: "pending", page: 1, limit: 25 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState({ items: [], totalItems: 0, pages: 1 });

  const canPrev = useMemo(() => filters.page > 1, [filters.page]);
  const canNext = useMemo(() => filters.page < (data.pages || 1), [filters.page, data.pages]);

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const d = await listAdminComments(filters);
      setData({
        items: Array.isArray(d?.items) ? d.items : [],
        totalItems: Number(d?.totalItems ?? 0) || 0,
        pages: Number(d?.pages ?? 1) || 1,
      });
    } catch (e) {
      setData({ items: [], totalItems: 0, pages: 1 });
      setErr(e?.message || "Failed to load comments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.page, filters.limit]);

  async function doApprove(id) {
    try {
      await approveComment(id);
      refresh();
    } catch (e) {
      alert(e?.message || "Approve failed");
    }
  }

  async function doReject(id) {
    try {
      await rejectComment(id);
      refresh();
    } catch (e) {
      alert(e?.message || "Reject failed");
    }
  }

  return (
    <section className="zr-section">
      <AdminNavRow />

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>Comments</h1>
          <p className="zr-lede" style={{ marginTop: 0 }}>
            Moderate guest comments on public book pages.
          </p>
        </div>

        <button className="zr-btn2 zr-btn2--ghost" onClick={refresh} disabled={loading}>
          ⟳ Refresh
        </button>
      </div>

      <div className="zr-card" style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "grid", gap: 6, minWidth: 200 }}>
            Status
            <select
              className="zr-input"
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value, page: 1 }))}
            >
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="spam">spam</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, minWidth: 140 }}>
            Per page
            <select
              className="zr-input"
              value={filters.limit}
              onChange={(e) => setFilters((p) => ({ ...p, limit: Number(e.target.value) || 25, page: 1 }))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
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

      {err ? (
        <div className="zr-card" style={{ border: "1px solid rgba(160,0,0,0.25)", color: "#a00" }}>
          {err}
        </div>
      ) : null}

      <div className="zr-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.04)" }}>
                <th style={{ textAlign: "left", padding: 10, fontSize: 12, opacity: 0.8 }}>Book</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 12, opacity: 0.8 }}>Author</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 12, opacity: 0.8 }}>Comment</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 12, opacity: 0.8 }}>Created</th>
                <th style={{ textAlign: "right", padding: 10, fontSize: 12, opacity: 0.8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 14 }}>Loading…</td>
                </tr>
              ) : data.items.length ? (
                data.items.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                    <td style={{ padding: 10, verticalAlign: "top" }}>
                      <div style={{ fontWeight: 900 }}>{c.book_title || "(unknown)"}</div>
                      {c.book_id ? (
                        <Link to={`/book/${c.book_id}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, opacity: 0.8 }}>
                          Open book ↗
                        </Link>
                      ) : null}
                    </td>
                    <td style={{ padding: 10, verticalAlign: "top" }}>
                      <div style={{ fontWeight: 800 }}>{c.author_name || "Guest"}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>{c.book_author || ""}</div>
                    </td>
                    <td style={{ padding: 10, verticalAlign: "top", maxWidth: 560 }}>
                      <div style={{ whiteSpace: "pre-wrap" }}>{c.body}</div>
                      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>status: {c.status}</div>
                    </td>
                    <td style={{ padding: 10, verticalAlign: "top", whiteSpace: "nowrap" }}>{fmtTs(c.created_at)}</td>
                    <td style={{ padding: 10, verticalAlign: "top", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        <button
                          className="zr-btn2 zr-btn2--primary"
                          onClick={() => doApprove(c.id)}
                          disabled={loading}
                        >
                          Approve
                        </button>
                        <button
                          className="zr-btn2 zr-btn2--ghost"
                          onClick={() => doReject(c.id)}
                          disabled={loading}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: 14, opacity: 0.75 }}>No comments.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function AdminCommentsPage() {
  return (
    <RequireAdmin>
      <Inner />
    </RequireAdmin>
  );
}

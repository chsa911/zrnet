import React, { useEffect, useState } from "react";
import AdminNavRow from "../components/AdminNavRow";
import RequireAdmin from "../components/RequireAdmin";
import { listNewsletterSubscribers } from "../api/newsletter";

function fmtTs(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function Inner() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const d = await listNewsletterSubscribers({ limit: 200 });
      setItems(Array.isArray(d?.items) ? d.items : []);
    } catch (e) {
      setItems([]);
      setErr(e?.message || "Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="zr-section">
      <AdminNavRow />

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>Newsletter subscribers</h1>
          <p className="zr-lede" style={{ marginTop: 0 }}>
            Last 200 signups.
          </p>
        </div>

        <button className="zr-btn2 zr-btn2--ghost" onClick={refresh} disabled={loading}>
          ⟳ Refresh
        </button>
      </div>

      {err ? (
        <div className="zr-card" style={{ border: "1px solid rgba(160,0,0,0.25)", color: "#a00", padding: 14 }}>
          {err}
        </div>
      ) : null}

      <div className="zr-card" style={{ padding: 0, overflow: "hidden", marginTop: 14 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.04)" }}>
                <th style={{ textAlign: "left", padding: 10, fontSize: 12, opacity: 0.8 }}>Email</th>
                <th style={{ textAlign: "left", padding: 10, fontSize: 12, opacity: 0.8 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={2} style={{ padding: 14 }}>Loading…</td>
                </tr>
              ) : items.length ? (
                items.map((r) => (
                  <tr key={`${r.email}-${r.created_at}`} style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                    <td style={{ padding: 10, fontWeight: 800 }}>{r.email}</td>
                    <td style={{ padding: 10, whiteSpace: "nowrap" }}>{fmtTs(r.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} style={{ padding: 14, opacity: 0.75 }}>No subscribers yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function AdminNewsletterPage() {
  return (
    <RequireAdmin>
      <Inner />
    </RequireAdmin>
  );
}
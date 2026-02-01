// frontend/src/pages/AnalyticsPage.jsx
import React, { useEffect, useState } from "react";

export default function AnalyticsPage() {
  const year = new Date().getFullYear();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      try {
        const r = await fetch(`/api/public/books/stats?year=${year}`, {
          headers: { Accept: "application/json" },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setData(await r.json());
      } catch (e) {
        setErr(e.message || String(e));
      }
    })();
  }, [year]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontFamily: "Arial, sans-serif" }}>Analytics {year}</h2>

      {err ? (
        <div style={{ color: "#b00020", fontFamily: "Arial, sans-serif" }}>
          Could not load stats: {err}
        </div>
      ) : null}

      {!data ? (
        <div style={{ fontFamily: "Arial, sans-serif" }}>Loading…</div>
      ) : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Card label="Finished" value={data.finished ?? 0} />
          <Card label="Abandoned" value={data.abandoned ?? 0} />
          <Card label="Top" value={data.top ?? 0} />
        </div>
      )}
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 180,
        border: "2px solid white",
        borderRadius: 14,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.65)",
      }}
    >
      <div style={{ fontSize: 12, color: "#333" }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}
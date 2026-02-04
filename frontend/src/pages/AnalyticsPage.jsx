// AnalyticsPage.jsx
import React, { useEffect, useState } from "react";
import { useI18n } from "../context/I18nContext";
import { listPublicBooks } from "../api/books";

export default function AnalyticsPage() {
  const { t } = useI18n();

  // search UI state
  const [bucket, setBucket] = useState("finished");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchErr, setSearchErr] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);

  const debouncedQ = useDebouncedValue(q, 250);

  // Buckets supported by the public API (/api/public/books)
  const bucketOptions = [
    { key: "stock", labelKey: "analytics_bucket_stock" },
    { key: "finished", labelKey: "analytics_bucket_finished" },
    { key: "abandoned", labelKey: "analytics_bucket_abandoned" },
    { key: "top", labelKey: "analytics_bucket_top" },
  ];

  const setBucketAndReset = (next) => {
    setBucket(next);
    setPage(1);
    // setQ(""); // optional: clear search when switching buckets
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingSearch(true);
      setSearchErr("");
      try {
        const res = await listPublicBooks({
          bucket,
          year: 2026,
          q: debouncedQ.trim() ? debouncedQ.trim() : undefined,
          limit,
          page,
        });
        if (!alive) return;
        setItems(res.items || []);
        setTotal(res.total || 0);
      } catch (e) {
        if (!alive) return;
        setItems([]);
        setTotal(0);
        setSearchErr(e?.message || String(e));
      } finally {
        if (!alive) return;
        setLoadingSearch(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [bucket, debouncedQ, page, limit]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ background: "mintcream", borderRadius: 12, padding: 16 }}>
      <h2 style={{ fontFamily: "Arial, sans-serif", marginTop: 0 }}>
        {t("analytics_title")}
      </h2>

      <div
        style={{
          background: "rgba(255,255,255,0.65)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        {/* Controls */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {bucketOptions.map((b) => {
              const active = bucket === b.key;
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setBucketAndReset(b.key)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.18)",
                    background: active ? "rgba(0,0,0,0.10)" : "white",
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {t(b.labelKey)}
                </button>
              );
            })}
          </div>

          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={t("analytics_search_placeholder")}
            style={{ minWidth: 280 }}
          />

          <select
            value={String(limit)}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>

          <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
            {loadingSearch
              ? t("analytics_searching")
              : t("analytics_results", { count: total })}
          </div>
        </div>

        {searchErr ? <div style={{ color: "#b00020", marginTop: 8 }}>{searchErr}</div> : null}

        {/* Results */}
        <div style={{ marginTop: 10 }}>
          {items.map((b) => (
            <div
              key={b.id}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontWeight: 800 }}>
                {b.title || "—"}
                <span style={{ fontWeight: 500, opacity: 0.7 }}> — {b.author || "—"}</span>
              </div>
            </div>
          ))}

          {!loadingSearch && items.length === 0 ? (
            <div style={{ padding: 12, opacity: 0.8 }}>{t("analytics_no_results")}</div>
          ) : null}
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage(1)}>
            ⏮
          </button>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ◀
          </button>
          <div style={{ fontSize: 13 }}>{t("analytics_page", { page, pages })}</div>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            ▶
          </button>
          <button type="button" disabled={page >= pages} onClick={() => setPage(pages)}>
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
}

function useDebouncedValue(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { listPublicBooks } from "../api/books";

export default function AnalyticsPage() {
  const { t } = useI18n();
  const year = 2026;

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
  // NOTE: "stock" is intentionally removed from the diary filter.
  // The “In stock” pill now links to the dedicated stats page (most-owned authors in stock).
  const bucketOptions = [
    { key: "finished", labelKey: "analytics_bucket_finished" },
    { key: "abandoned", labelKey: "analytics_bucket_abandoned" },
    { key: "top", labelKey: "analytics_bucket_top" },
  ];

  const bucketKeys = useMemo(() => new Set(["finished", "abandoned", "top"]), []);

  const setBucketAndReset = (next) => {
    setBucket(next);
    setPage(1);
  };

  // Safety: if an old state somehow lands on an unsupported bucket (e.g. "stock"), reset.
  useEffect(() => {
    if (!bucketKeys.has(bucket)) setBucket("finished");
  }, [bucket, bucketKeys]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingSearch(true);
      setSearchErr("");

      try {
        const res = await listPublicBooks({
          bucket,
          year,
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

  const authorFromBook = (b) => {
    const arr = Array.isArray(b?.authors) ? b.authors : [];
    const names = arr
      .map((x) => x?.name_display_display || x?.name_display || x?.name || x?.full_name)
      .filter(Boolean);
    if (names.length) return names.join(", ");

    return (
      b?.author_display ||
      b?.author ||
      b?.BAutor ||
      b?.author_name ||
      "—"
    );
  };

  return (
    <section className="zr-section">
      <h1>{t("analytics_title")}</h1>
      <p className="zr-lede">
        {loadingSearch
          ? t("analytics_searching")
          : t("analytics_results", { count: total })}
      </p>

      <div className="zr-card">
        {/* Controls */}
        <div className="zr-toolbar">
          <div className="zr-toolbar">
            {bucketOptions.map((b) => {
              const active = bucket === b.key;
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setBucketAndReset(b.key)}
                  className={[
                    "zr-btn2",
                    "zr-btn2--sm",
                    active ? "zr-btn2--primary" : "zr-btn2--ghost",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  {t(b.labelKey)}
                </button>
              );
            })}

            {/* "In stock" lives on the stats page (most-owned authors in stock) */}
            <Link
              to={`/stats/stock?year=${encodeURIComponent(year)}`}
              className={["zr-btn2", "zr-btn2--sm", "zr-btn2--ghost"].join(" ")}
              title="Most owned authors (new in stock)"
            >
              {t("analytics_bucket_stock")}
            </Link>
          </div>

          <input
            className="zr-input"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={t("analytics_search_placeholder")}
          />

          <select
            className="zr-select"
            value={String(limit)}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            aria-label="Limit"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>

          <div className="zr-toolbar__grow" />

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {t("analytics_page", { page, pages })}
          </div>
        </div>

        {searchErr ? <div className="zr-alert zr-alert--error">{searchErr}</div> : null}

        {/* Results */}
        <div className="zr-results">
          {items.map((b) => (
            <div key={b.id} className="zr-resultRow">
              <div className="zr-resultTitle">
                {b?.id ? (
                  <Link to={`/book/${encodeURIComponent(b.id)}`}>{b.title || "—"}</Link>
                ) : (
                  <span>{b.title || "—"}</span>
                )}
                <span className="zr-resultMeta"> — {authorFromBook(b)}</span>
              </div>
            </div>
          ))}

          {!loadingSearch && items.length === 0 ? (
            <div className="zr-empty">{t("analytics_no_results")}</div>
          ) : null}
        </div>

        {/* Pagination */}
        <div className="zr-toolbar" style={{ marginTop: 10 }}>
          <button
            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(1)}
          >
            ⏮
          </button>
          <button
            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ◀
          </button>

          <div className="zr-toolbar__grow" />

          <button
            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            ▶
          </button>
          <button
            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
            type="button"
            disabled={page >= pages}
            onClick={() => setPage(pages)}
          >
            ⏭
          </button>
        </div>
      </div>
    </section>
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
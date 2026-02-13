import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { listStockAuthors, listPublicBooks } from "../api/books";
import "./StatsDetailPage.css";

function isAbortError(e) {
  return (
    e?.name === "AbortError" ||
    String(e?.message || "").toLowerCase().includes("aborted") ||
    String(e || "").toLowerCase().includes("aborted")
  );
}

export default function StatsDetailPage() {
  const { type } = useParams();
  const [sp, setSp] = useSearchParams();
  const { t } = useI18n();

  const year = Number(sp.get("year")) || 2026;
  const selectedAuthor = sp.get("author") || "";

  const cfg = useMemo(() => {
    return (
      {
        stock: { title: t("stats_in_stock"), subtitle: "Most owned authors (in stock)" },
        finished: {
          title: t("stats_finished"),
          bucket: "finished",
          dateField: "reading_status_updated_at",
        },
        abandoned: {
          title: t("stats_abandoned"),
          bucket: "abandoned",
          dateField: "reading_status_updated_at",
        },
        top: { title: t("stats_top"), bucket: "top", dateField: "top_book_set_at" },
      }[type] || null
    );
  }, [type, t]);

  const stockBaseUrl = `/stats/stock?year=${encodeURIComponent(year)}`;
  const finishedUrl = `/stats/finished?year=${encodeURIComponent(year)}`;
  const topUrl = `/stats/top?year=${encodeURIComponent(year)}`;

  // Tabs (only the ones you asked for)
  const tabs = useMemo(
    () => [
      { key: "stock", label: t("stats_in_stock"), to: stockBaseUrl },
      { key: "finished", label: t("stats_finished"), to: finishedUrl },
      { key: "top", label: t("stats_top"), to: topUrl },
    ],
    [t, stockBaseUrl, finishedUrl, topUrl]
  );

  // Stock state
  const [authorQuery, setAuthorQuery] = useState("");
  const [authors, setAuthors] = useState([]);
  const [topN, setTopN] = useState(10);

  // Common list state
  const [books, setBooks] = useState([]);

  const [loadingAuthors, setLoadingAuthors] = useState(false);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [err, setErr] = useState("");

  const onClearAuthor = () => {
    const next = new URLSearchParams(sp);
    next.delete("author");
    setErr("");
    setSp(next, { replace: false });
  };

  const onSelectAuthor = (author) => {
    const next = new URLSearchParams(sp);
    next.set("author", author);
    setErr("");
    setSp(next, { replace: false });
  };

  // --- STOCK: authors ranking ---
  useEffect(() => {
    if (type !== "stock") return;

    const ac = new AbortController();
    setErr("");
    setLoadingAuthors(true);

    listStockAuthors({ limit: 200, signal: ac.signal })
      .then((rows) => setAuthors(Array.isArray(rows) ? rows : []))
      .catch((e) => {
        if (isAbortError(e) || ac.signal.aborted) return;
        setErr(e?.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingAuthors(false);
      });

    return () => ac.abort();
  }, [type]);

  // --- STOCK: titles for selected author (titles only) ---
  useEffect(() => {
    if (type !== "stock") return;

    if (!selectedAuthor) {
      setBooks([]);
      return;
    }

    const ac = new AbortController();
    setErr("");
    setLoadingBooks(true);

    listPublicBooks({
      bucket: "stock",
      author: selectedAuthor,
      limit: 500,
      offset: 0,
      year,
      signal: ac.signal,
    })
      .then((res) => setBooks(res.items || []))
      .catch((e) => {
        if (isAbortError(e) || ac.signal.aborted) return;
        setErr(e?.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingBooks(false);
      });

    return () => ac.abort();
  }, [type, selectedAuthor, year]);

  // --- FINISHED / ABANDONED / TOP: newest-first list for the year ---
  useEffect(() => {
    if (!cfg || type === "stock") return;

    const ac = new AbortController();
    setErr("");
    setBooks([]);
    setLoadingBooks(true);

    listPublicBooks({
      bucket: cfg.bucket,
      year,
      limit: 2000,
      offset: 0,
      signal: ac.signal,
    })
      .then((res) => {
        const items = Array.isArray(res.items) ? res.items : [];

        // Ensure year filtering (in case backend ignores year)
        const start = new Date(Date.UTC(year, 0, 1));
        const end = new Date(Date.UTC(year + 1, 0, 1));
        const filtered = items.filter((b) => {
          const s = b?.[cfg.dateField];
          if (!s) return false;
          const d = new Date(s);
          if (Number.isNaN(d.getTime())) return false;
          return d >= start && d < end;
        });

        // Newest first
        filtered.sort((a, b) => {
          const da = new Date(a?.[cfg.dateField] || 0).getTime();
          const db = new Date(b?.[cfg.dateField] || 0).getTime();
          return db - da;
        });

        setBooks(filtered);
      })
      .catch((e) => {
        if (isAbortError(e) || ac.signal.aborted) return;
        setErr(e?.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingBooks(false);
      });

    return () => ac.abort();
  }, [cfg, type, year]);

  if (!cfg) {
    return (
      <div className="zr-statsdetail">
        <h2>404</h2>
        <Link to="/">{t("nav_home")}</Link>
      </div>
    );
  }

  // Filter authors + Top N for stock list
  const filteredAuthors = useMemo(() => {
    const q = authorQuery.trim().toLowerCase();
    const base = !q
      ? authors
      : authors.filter((a) => String(a.author || "").toLowerCase().includes(q));
    return q ? base : base.slice(0, topN);
  }, [authors, authorQuery, topN]);

  const backLabel = selectedAuthor ? "← Back to authors" : `← ${t("nav_home")}`;
  const backHref = selectedAuthor ? stockBaseUrl : "/";

  return (
    <div className="zr-statsdetail">
      <div className="zr-statsdetail-top">
        <Link to={backHref} className="zr-statsdetail-back">
          {backLabel}
        </Link>

        <div className="zr-statsdetail-title">
          {cfg.title}
          <span className="zr-statsdetail-year">{year}</span>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="zr-statsdetail-breadcrumb">
        <Link to="/" className="zr-crumb-link">
          {t("nav_home")}
        </Link>
        <span className="zr-crumb-sep">›</span>

        {type === "stock" && selectedAuthor ? (
          <>
            <Link to={stockBaseUrl} className="zr-crumb-link">
              {cfg.title}
            </Link>
            <span className="zr-crumb-sep">›</span>
            <span className="zr-crumb strong">{selectedAuthor}</span>
          </>
        ) : (
          <span className="zr-crumb strong">{cfg.title}</span>
        )}
      </div>

      {/* Tabs */}
      <nav className="zr-statsdetail-tabs" aria-label="Stats sections">
        {tabs.map((tab) => {
          const active = tab.key === type;
          return (
            <Link
              key={tab.key}
              to={tab.to}
              className={`zr-statsdetail-tab ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              title={tab.label}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {err ? <div className="zr-statsdetail-error">{err}</div> : null}

      {/* STOCK */}
      {type === "stock" ? (
        <>
          {!selectedAuthor ? (
            <>
              <div className="zr-statsdetail-subtitle">{cfg.subtitle}</div>

              <div className="zr-statsdetail-controls">
                <input
                  className="zr-statsdetail-search"
                  value={authorQuery}
                  onChange={(e) => setAuthorQuery(e.target.value)}
                  placeholder="Filter authors…"
                />

                <select
                  className="zr-topn-select"
                  value={topN}
                  onChange={(e) => setTopN(Number(e.target.value))}
                  aria-label="Top authors"
                  title="Top authors"
                >
                  <option value={10}>Top 10</option>
                  <option value={50}>Top 50</option>
                  <option value={200}>Top 200</option>
                </select>

                <div className="zr-statsdetail-meta">
                  {authorQuery.trim()
                    ? `${filteredAuthors.length} matches`
                    : `${topN} authors`}
                </div>
              </div>

              <div className="zr-author-list">
                {filteredAuthors.map((a) => (
                  <button
                    key={a.author}
                    className="zr-author-row"
                    onClick={() => onSelectAuthor(a.author)}
                    type="button"
                    title={a.author}
                  >
                    <span className="zr-author-name">{a.author}</span>
                    <span className="zr-author-count">{a.count}</span>
                  </button>
                ))}
              </div>

              {loadingAuthors ? (
                <div className="zr-statsdetail-loading">loading…</div>
              ) : null}
            </>
          ) : (
            <>
              <div className="zr-statsdetail-subtitle">
                Titles by <b>{selectedAuthor}</b>
                <span style={{ opacity: 0.7, marginLeft: 8 }}>
                  ({books.length})
                </span>
                <button
                  className="zr-statsdetail-btn"
                  onClick={onClearAuthor}
                  type="button"
                >
                  Back to authors
                </button>
              </div>

              {loadingBooks ? (
                <div className="zr-statsdetail-loading">loading…</div>
              ) : null}

              {/* titles only */}
              <ul className="zr-books-list">
                {books.map((b) => {
                  const title = b.title || "—";
                  const url =
                    typeof b.purchase_url === "string" && b.purchase_url.trim()
                      ? b.purchase_url.trim()
                      : "";

                  return (
                    <li key={b.id} className="zr-books-item">
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer">
                          {title}
                        </a>
                      ) : (
                        <span>{title}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      ) : (
        /* FINISHED / ABANDONED / TOP */
        <>
          <div className="zr-statsdetail-subtitle">
            {cfg.title} {year}{" "}
            <span style={{ opacity: 0.7 }}>({books.length})</span>
          </div>

          {loadingBooks ? (
            <div className="zr-statsdetail-loading">loading…</div>
          ) : null}

          {/* author + title, newest-first */}
          <ul className="zr-books-list">
            {books.map((b) => {
              const author = a.name_display || "—";
              const title = b.title || "—";
              const url =
                typeof b.purchase_url === "string" && b.purchase_url.trim()
                  ? b.purchase_url.trim()
                  : "";

              return (
                <li key={b.id} className="zr-books-item">
                  {url ? (
                    <>
                      <a href={url} target="_blank" rel="noreferrer">
                        {author}
                      </a>
                      <span className="zr-sep">—</span>
                      <a href={url} target="_blank" rel="noreferrer">
                        {title}
                      </a>
                    </>
                  ) : (
                    <span>
                      <b>{author}</b> <span className="zr-sep">—</span> {title}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
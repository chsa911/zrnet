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
    const map = {
      stock: { title: t("stats_in_stock"), subtitle: "Most owned authors (in stock)" },
      finished: { title: t("stats_finished") },
      abandoned: { title: t("stats_abandoned") },
      top: { title: t("stats_top") },
    };
    return map[type] || null;
  }, [type, t]);

  const stockBaseUrl = `/stats/stock?year=${encodeURIComponent(year)}`;

  const [authorQuery, setAuthorQuery] = useState("");
  const [authors, setAuthors] = useState([]);
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

  // STOCK: load author ranking
  useEffect(() => {
    if (type !== "stock") return;

    const ac = new AbortController();
    setErr("");
    setLoadingAuthors(true);

    listStockAuthors({ limit: 200, signal: ac.signal })
      .then((rows) => setAuthors(Array.isArray(rows) ? rows : []))
      .catch((e) => {
        if (isAbortError(e) || ac.signal.aborted) return; // ignore abort
        setErr(e?.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingAuthors(false);
      });

    return () => ac.abort();
  }, [type]);

  // STOCK: load books for selected author
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
        if (isAbortError(e) || ac.signal.aborted) return; // ignore abort
        setErr(e?.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingBooks(false);
      });

    return () => ac.abort();
  }, [type, selectedAuthor, year]);

  if (!cfg) {
    return (
      <div className="zr-statsdetail">
        <h2>404</h2>
        <Link to="/">{t("nav_home")}</Link>
      </div>
    );
  }

  const filteredAuthors = useMemo(() => {
    const q = authorQuery.trim().toLowerCase();
    if (!q) return authors;
    return authors.filter((a) => String(a.author || "").toLowerCase().includes(q));
  }, [authors, authorQuery]);

  // ✅ This fixes your complaint:
  // If you’re inside an author, the top-left “back” goes to author list,
  // NOT home.
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

      {/* ✅ Breadcrumbs: Home goes home, In stock goes back to author list */}
      <div className="zr-statsdetail-breadcrumb">
        <Link to="/" className="zr-crumb-link">{t("nav_home")}</Link>
        <span className="zr-crumb-sep">›</span>

        {type === "stock" ? (
          selectedAuthor ? (
            <>
              <Link to={stockBaseUrl} className="zr-crumb-link">{cfg.title}</Link>
              <span className="zr-crumb-sep">›</span>
              <span className="zr-crumb strong">{selectedAuthor}</span>
            </>
          ) : (
            <span className="zr-crumb strong">{cfg.title}</span>
          )
        ) : (
          <span className="zr-crumb strong">{cfg.title}</span>
        )}
      </div>

      {err ? <div className="zr-statsdetail-error">{err}</div> : null}

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
                <div className="zr-statsdetail-meta">{filteredAuthors.length} authors</div>
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

              {loadingAuthors ? <div className="zr-statsdetail-loading">loading…</div> : null}
            </>
          ) : (
            <>
              <div className="zr-statsdetail-subtitle">
                Titles by <b>{selectedAuthor}</b>
                <button className="zr-statsdetail-btn" onClick={onClearAuthor} type="button">
                  Back to authors
                </button>
              </div>

              {loadingBooks ? <div className="zr-statsdetail-loading">loading…</div> : null}

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
        <div className="zr-statsdetail-subtitle">(Next: we can apply the same UI to finished/abandoned/top.)</div>
      )}
    </div>
  );
}
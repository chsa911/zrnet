import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import "./StatsDetailPage.css";

function inYear(dateStr, year) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  return d >= start && d < end;
}

function getBookTitle(b) {
  return b?.title || b?.book_title || b?.name || "(untitled)";
}

function getBookId(b, i) {
  return (
    b?.id ||
    b?.book_id ||
    b?.isbn ||
    b?.asin ||
    `${getBookTitle(b)}-${b?.author || ""}-${i}`
  );
}

export default function StatsDetailPage() {
  const { type } = useParams();
  const [sp, setSp] = useSearchParams();
  const { t } = useI18n();

  const year = Number(sp.get("year")) || 2026; // keep your default
  const author = sp.get("author") || "";

  const cfg = useMemo(() => {
    const map = {
      stock: { titleKey: "stats_in_stock" },
      finished: { titleKey: "stats_finished", bucket: "finished", yearField: "reading_status_updated_at" },
      abandoned: { titleKey: "stats_abandoned", bucket: "abandoned", yearField: "reading_status_updated_at" },
      top: { titleKey: "stats_top", bucket: "top", yearField: "top_book_set_at" },
    };
    return map[type] || null;
  }, [type]);

  const [authors, setAuthors] = useState([]);
  const [books, setBooks] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const updateParams = (patch, options) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") next.delete(k);
      else next.set(k, String(v));
    });
    setSp(next, options);
  };

  // STOCK: load ranking
  useEffect(() => {
    if (type !== "stock") return;
    setLoading(true);
    setErr("");

    fetch(`/api/public/books/stock-authors?limit=120`, { headers: { Accept: "application/json" } })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((rows) => setAuthors(Array.isArray(rows) ? rows : []))
      .catch((e) => setErr(e?.message || String(e)))
      .finally(() => setLoading(false));
  }, [type]);

  // STOCK: load books for author
  useEffect(() => {
    if (type !== "stock") return;
    if (!author) {
      setBooks([]);
      setOffset(0);
      return;
    }

    setLoading(true);
    setErr("");

    fetch(`/api/public/books?bucket=stock&author=${encodeURIComponent(author)}&limit=200&offset=0`, {
      headers: { Accept: "application/json" },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((rows) => {
        setBooks(Array.isArray(rows) ? rows : []);
        setOffset(200);
      })
      .catch((e) => setErr(e?.message || String(e)))
      .finally(() => setLoading(false));
  }, [type, author]);

  // OTHER PAGES: load list (year-filtered client side)
  useEffect(() => {
    if (!cfg || type === "stock") return;

    setLoading(true);
    setErr("");
    setBooks([]);
    setOffset(0);

    fetch(`/api/public/books?bucket=${encodeURIComponent(cfg.bucket)}&limit=200&offset=0`, {
      headers: { Accept: "application/json" },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((rows) => {
        const arr = Array.isArray(rows) ? rows : [];
        const filtered = arr.filter((b) => inYear(b?.[cfg.yearField], year));
        setBooks(filtered);
        setOffset(200);
      })
      .catch((e) => setErr(e?.message || String(e)))
      .finally(() => setLoading(false));
  }, [cfg, type, year]);

  const loadMore = async () => {
    if (loading) return;

    try {
      setLoading(true);
      setErr("");

      if (type === "stock") {
        if (!author) return;

        const r = await fetch(
          `/api/public/books?bucket=stock&author=${encodeURIComponent(author)}&limit=200&offset=${offset}`,
          { headers: { Accept: "application/json" } }
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const rows = await r.json();
        const arr = Array.isArray(rows) ? rows : [];
        setBooks((prev) => prev.concat(arr));
        setOffset((o) => o + 200);
      } else {
        if (!cfg) return;

        const r = await fetch(
          `/api/public/books?bucket=${encodeURIComponent(cfg.bucket)}&limit=200&offset=${offset}`,
          { headers: { Accept: "application/json" } }
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const rows = await r.json();
        const arr = Array.isArray(rows) ? rows : [];
        const filtered = arr.filter((b) => inYear(b?.[cfg.yearField], year));
        setBooks((prev) => prev.concat(filtered));
        setOffset((o) => o + 200);
      }
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!cfg) {
    return (
      <div className="zr-statsdetail">
        <h2>404</h2>
        <Link to="/">{t("nav_home")}</Link>
      </div>
    );
  }

  return (
    <div className="zr-statsdetail">
      <div className="zr-statsdetail-top">
        <Link to="/" className="zr-statsdetail-back">
          ← {t("nav_home")}
        </Link>

        <div className="zr-statsdetail-title">
          {t(cfg.titleKey)}{" "}
          {type === "stock" ? null : <span className="zr-statsdetail-year">{year}</span>}
        </div>
      </div>

      {err ? <div className="zr-statsdetail-error">{err}</div> : null}
      {loading ? <div className="zr-statsdetail-loading">loading…</div> : null}

      {type === "stock" ? (
        <>
          {!author ? (
            <>
              <div className="zr-statsdetail-subtitle">Most owned authors (in stock)</div>

              <div className="zr-statsdetail-list">
                {authors.length === 0 && !loading ? (
                  <div className="zr-statsdetail-empty">No authors found.</div>
                ) : (
                  <ul>
                    {authors.map((row, i) => {
                      const name = row?.author || row?.name || row?.autor || row?.Author || "";
                      const count =
                        row?.count ?? row?.cnt ?? row?.total ?? row?.n ?? row?.books ?? row?.book_count ?? "";
                      if (!name) return null;

                      return (
                        <li key={`${name}-${i}`}>
                          <button
                            type="button"
                            className="zr-statsdetail-authorbtn"
                            onClick={() => updateParams({ author: name })}
                          >
                            <span className="zr-statsdetail-authorname">{name}</span>
                            {count !== "" ? (
                              <span className="zr-statsdetail-authorcount">{count}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="zr-statsdetail-subtitle">
                <button
                  type="button"
                  className="zr-statsdetail-linkbtn"
                  onClick={() => updateParams({ author: "" })}
                  title="Back to author ranking"
                >
                  ← back
                </button>
                <span className="zr-statsdetail-selectedauthor">{author}</span>
              </div>

              <div className="zr-statsdetail-list">
                {books.length === 0 && !loading ? (
                  <div className="zr-statsdetail-empty">No books found for this author.</div>
                ) : (
                  <ul>
                    {books.map((b, i) => (
                      <li key={getBookId(b, i)} className="zr-statsdetail-bookitem">
                        <div className="zr-statsdetail-booktitle">{getBookTitle(b)}</div>
                        {b?.author ? <div className="zr-statsdetail-bookmeta">{b.author}</div> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="zr-statsdetail-actions">
                <button type="button" className="zr-statsdetail-morebtn" onClick={loadMore} disabled={loading}>
                  Load more
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className="zr-statsdetail-controls">
            <label className="zr-statsdetail-yearlabel">
              Year{" "}
              <input
                type="number"
                value={year}
                onChange={(e) => updateParams({ year: e.target.value }, { replace: true })}
                className="zr-statsdetail-yearinput"
              />
            </label>
          </div>

          <div className="zr-statsdetail-list">
            {books.length === 0 && !loading ? (
              <div className="zr-statsdetail-empty">No books for {year}.</div>
            ) : (
              <ul>
                {books.map((b, i) => (
                  <li key={getBookId(b, i)} className="zr-statsdetail-bookitem">
                    <div className="zr-statsdetail-booktitle">{getBookTitle(b)}</div>
                    {b?.author ? <div className="zr-statsdetail-bookmeta">{b.author}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="zr-statsdetail-actions">
            <button type="button" className="zr-statsdetail-morebtn" onClick={loadMore} disabled={loading}>
              Load more
            </button>
          </div>
        </>
      )}
    </div>
  );
}
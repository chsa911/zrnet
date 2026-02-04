import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPublicBookStats, listMostReadAuthors, listPublicBooks } from "../api/books";
import "./MostReadAuthorsPage.css";

const PAGE_SIZE = 200;

function isAbortError(e) {
  return (
    e?.name === "AbortError" ||
    String(e?.message || "").toLowerCase().includes("aborted") ||
    String(e || "").toLowerCase().includes("aborted")
  );
}

function makePurchaseUrl(b) {
  const barcode = String(b?.barcode || "").trim();
  const isbn13 = String(b?.isbn13 || "").trim();
  const isbn10 = String(b?.isbn10 || "").trim();
  const title = String(b?.title || "").trim();
  const author = String(b?.author || "").trim();
  const q = barcode || isbn13 || isbn10 || [title, author].filter(Boolean).join(" ");
  return q ? `https://www.amazon.de/s?k=${encodeURIComponent(q)}` : "";
}

function usePublicBucket(bucket, { year } = {}) {
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const acRef = useRef(null);

  const load = useCallback(
    async ({ reset = false } = {}) => {
      if (loading) return;
      if (!hasMore && !reset) return;

      if (acRef.current) acRef.current.abort();
      const ac = new AbortController();
      acRef.current = ac;

      setLoading(true);
      setError("");

      const nextOffset = reset ? 0 : offset;

      try {
        const res = await listPublicBooks({
          bucket,
          year,
          limit: PAGE_SIZE,
          offset: nextOffset,
          signal: ac.signal,
        });

        const got = Array.isArray(res?.items) ? res.items : [];

        setItems((prev) => (reset ? got : [...prev, ...got]));
        setOffset(nextOffset + got.length);
        setHasMore(got.length === PAGE_SIZE);
      } catch (e) {
        if (isAbortError(e) || ac.signal.aborted) return;
        setError(e?.message || String(e));
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    },
    [bucket, year, hasMore, loading, offset]
  );

  useEffect(() => {
    // initial load on mount / bucket change
    setItems([]);
    setOffset(0);
    setHasMore(true);
    setError("");
    load({ reset: true });

    return () => {
      if (acRef.current) acRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, year]);

  return { items, loading, error, hasMore, loadMore: () => load({ reset: false }) };
}

export default function MostReadAuthorsPage() {
  const year = 2026;

  const [authors, setAuthors] = useState([]);
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [authorsError, setAuthorsError] = useState("");

  const [stats, setStats] = useState(null);
  const [statsErr, setStatsErr] = useState("");

  const readBooks = usePublicBucket("read-nobarcode", { year });
  const stockBooks = usePublicBucket("stock", { year });
  const favorites = usePublicBucket("top", { year });

  // Load author ranking
  useEffect(() => {
    const ac = new AbortController();
    setAuthorsLoading(true);
    setAuthorsError("");

    listMostReadAuthors({ limit: 200, signal: ac.signal })
      .then((rows) => setAuthors(Array.isArray(rows) ? rows : []))
      .catch((e) => {
        if (isAbortError(e) || ac.signal.aborted) return;
        setAuthorsError(e?.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setAuthorsLoading(false);
      });

    return () => ac.abort();
  }, []);

  // Load stats for in-stock count
  useEffect(() => {
    const ac = new AbortController();
    setStatsErr("");
    getPublicBookStats(year, { signal: ac.signal })
      .then((d) => setStats(d || null))
      .catch((e) => {
        if (isAbortError(e) || ac.signal.aborted) return;
        setStatsErr(e?.message || String(e));
      });
    return () => ac.abort();
  }, [year]);

  const booksInStockCount = useMemo(() => {
    const n = Number(stats?.books_with_barcode);
    return Number.isFinite(n) ? n : null;
  }, [stats]);

  return (
    <div className="zr-mostread">
      <div className="zr-separator" />

      <h1 className="zr-mostread-title">Authors that I have read most plus their best titles</h1>

      <div className="zr-mostread-grid">
        {/* Author most read */}
        <section className="zr-card">
          <h2 className="zr-card-title">Author most read</h2>
          {authorsError ? <div className="zr-error">{authorsError}</div> : null}

          <table className="zr-authors-table" aria-label="Most read authors">
            <tbody>
              {authors.map((a) => {
                const author = a.author || "—";
                const bestTitle = a.best_title || a.bestTitle || "—";
                const url = makePurchaseUrl({ title: bestTitle, author });
                return (
                  <tr key={author}>
                    <td className="zr-count">{a.count ?? a.read_count ?? ""}</td>
                    <td className="zr-author-cell">
                      <strong>{author}</strong>
                      {bestTitle ? (
                        <>
                          {": "}
                          {url ? (
                            <a href={url} target="_blank" rel="noreferrer">{bestTitle}</a>
                          ) : (
                            <span>{bestTitle}</span>
                          )}
                        </>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {authorsLoading ? <div className="zr-loading">loading…</div> : null}
        </section>

        {/* Books (read/no barcode) */}
        <section className="zr-card">
          <h2 className="zr-card-title">Books</h2>
          {readBooks.error ? <div className="zr-error">{readBooks.error}</div> : null}

          <ul className="zr-list" aria-label="Read books (no barcode)">
            {readBooks.items.map((b) => {
              const title = b.title || "—";
              const author = b.author || "";
              const url = makePurchaseUrl(b);
              return (
                <li key={b.id || `${author}-${title}`}>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer">{title}</a>
                  ) : (
                    <span>{title}</span>
                  )}
                  {author ? <span className="zr-muted"> — {author}</span> : null}
                </li>
              );
            })}
          </ul>

          <div className="zr-actions">
            {readBooks.loading ? <span className="zr-loading">loading…</span> : null}
            {readBooks.hasMore ? (
              <button className="zr-btn" onClick={readBooks.loadMore} type="button">
                Load more
              </button>
            ) : null}
          </div>
        </section>

        {/* Books in stock */}
        <section className="zr-card">
          <h2 className="zr-card-title">
            Books in stock
            {booksInStockCount != null ? <span className="zr-badge">{booksInStockCount}</span> : null}
          </h2>
          {statsErr ? <div className="zr-error">{statsErr}</div> : null}
          {stockBooks.error ? <div className="zr-error">{stockBooks.error}</div> : null}

          <ul className="zr-list" aria-label="Books in stock">
            {stockBooks.items.map((b) => {
              const title = b.title || "—";
              const author = b.author || "";
              const url = makePurchaseUrl(b);
              return (
                <li key={b.id || `${author}-${title}`}>
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer">{title}</a>
                  ) : (
                    <span>{title}</span>
                  )}
                  {author ? <span className="zr-muted"> — {author}</span> : null}
                </li>
              );
            })}
          </ul>

          <div className="zr-actions">
            {stockBooks.loading ? <span className="zr-loading">loading…</span> : null}
            {stockBooks.hasMore ? (
              <button className="zr-btn" onClick={stockBooks.loadMore} type="button">
                Load more
              </button>
            ) : null}
          </div>
        </section>
      </div>

      {/* Favorite titles */}
      <section className="zr-card zr-card-wide">
        <h2 className="zr-card-title">Favorite title</h2>
        {favorites.error ? <div className="zr-error">{favorites.error}</div> : null}

        <ul className="zr-list" aria-label="Favorite titles">
          {favorites.items.map((b) => {
            const title = b.title || "—";
            const author = b.author || "";
            const url = makePurchaseUrl(b);
            return (
              <li key={b.id || `${author}-${title}`}>
                {url ? (
                  <a href={url} target="_blank" rel="noreferrer">{title}</a>
                ) : (
                  <span>{title}</span>
                )}
                {author ? <span className="zr-muted"> — {author}</span> : null}
              </li>
            );
          })}
        </ul>

        <div className="zr-actions">
          {favorites.loading ? <span className="zr-loading">loading…</span> : null}
          {favorites.hasMore ? (
            <button className="zr-btn" onClick={favorites.loadMore} type="button">
              Load more
            </button>
          ) : null}
        </div>
      </section>

      <div className="zr-separator" />
    </div>
  );
}

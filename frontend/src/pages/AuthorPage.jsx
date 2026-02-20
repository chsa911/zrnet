import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getAuthorTopBooks } from "../api/books";
import "./AuthorPage.css";

function isAbortError(e) {
  return (
    e?.name === "AbortError" ||
    String(e?.message || "").toLowerCase().includes("aborted")
  );
}

function buyFallback(author, title) {
  const q = [title, author].filter(Boolean).join(" ");
  return q ? `https://www.amazon.de/s?k=${encodeURIComponent(q)}` : "";
}

export default function AuthorPage() {
  const { author: authorParam } = useParams();
  const navigate = useNavigate();

  const authorQuery = useMemo(() => {
    try {
      return decodeURIComponent(String(authorParam || "")).trim();
    } catch {
      return String(authorParam || "").trim();
    }
  }, [authorParam]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr("");
        setData(null);

        const res = await getAuthorTopBooks({
          author: authorQuery,
          limit: 3,
          signal: ac.signal,
        });
        if (!ac.signal.aborted) setData(res);
      } catch (e) {
        if (isAbortError(e) || ac.signal.aborted) return;
        setErr(e?.message || "Failed to load author");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [authorQuery]);

  const authorName =
    data?.author?.nameDisplay || authorQuery || data?.author?.name || "Author";
  const items = Array.isArray(data?.items) ? data.items : [];

  return (
    <section className="zr-section zr-author" aria-busy={loading ? "true" : "false"}>
      <div className="zr-author__top">
        <button className="zr-btn2 zr-btn2--ghost" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <Link className="zr-btn2 zr-btn2--ghost" to="/top-authors">
          Top authors
        </Link>
      </div>

      <h1 className="zr-author__title">{authorName}</h1>
      <p className="zr-lede">
        Top 3 books by this author (from your collection).
      </p>

      {err ? <div className="zr-alert zr-alert--error">{err}</div> : null}
      {loading ? <div className="zr-alert">Loading…</div> : null}

      {!loading && items.length === 0 ? (
        <div className="zr-card">No books found for this author.</div>
      ) : null}

      <div className="zr-author__grid">
        {items.map((b) => {
          const title = b.titleDisplay || "—";
          const cover = b.cover || "";
          const buy = b.purchaseUrl || buyFallback(authorName, title);
          const status = b.readingStatus || "";

          return (
            <article key={b.id} className="zr-card zr-author__book">
              <Link className="zr-author__coverWrap" to={`/book/${encodeURIComponent(b.id)}`}>
                {cover ? (
                  <img
                    className="zr-author__cover"
                    src={cover}
                    alt={`${title} cover`}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const next = e.currentTarget.nextElementSibling;
                      if (next) next.style.display = "flex";
                    }}
                  />
                ) : null}

                <div className="zr-author__coverEmpty">No cover</div>
              </Link>

              <div className="zr-author__meta">
                <Link className="zr-author__bookTitle" to={`/book/${encodeURIComponent(b.id)}`}>
                  {title}
                </Link>
                {status ? <div className="zr-author__status">{status}</div> : null}

                <div className="zr-author__actions">
                  <Link className="zr-btn2 zr-btn2--ghost" to={`/book/${encodeURIComponent(b.id)}`}>
                    Details
                  </Link>
                  {buy ? (
                    <a
                      className="zr-btn2 zr-btn2--primary"
                      href={buy}
                      target="_blank"
                      rel="noreferrer noopener"
                      title="Opens in a new tab"
                    >
                      Buy ↗
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

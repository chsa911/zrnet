import React, { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import "./SubGenrePage.css";

const API_ROOT = import.meta.env.VITE_API_ROOT || "";

export default function SubGenrePage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const excludeId = sp.get("exclude") || null;

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const rowRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    fetch(`${API_ROOT}/api/public/sub-genres/${id}/books?page=1&limit=96&sort=registered_at&dir=desc`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((json) => { setData(json); setLoading(false); })
      .catch((e) => { setError("Bücher konnten nicht geladen werden."); setLoading(false); });
  }, [id]);

  function scroll(dir) {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: "smooth" });
  }

  if (loading) return <main className="sg-page"><p className="sg-loading">Lade…</p></main>;
  if (error)   return <main className="sg-page"><p className="sg-error">{error}</p></main>;
  if (!data)   return null;

  const { subGenre } = data;

  const books = (() => {
    const source = excludeId
      ? (data.books || []).filter((b) => b.id !== excludeId)
      : (data.books || []);

    const seenTitles = new Set();
    return source.filter((b) => {
      if (!b.cover_url) return false;
      const title = (b.title || "").trim().toLowerCase();
      if (seenTitles.has(title)) return false;
      seenTitles.add(title);
      return true;
    });
  })();

  return (
    <main className="sg-page">
      <div className="sg-section">
        <div className="sg-section-head">
          <h2 className="sg-section-title">{subGenre?.name}</h2>
          <span className="sg-count">{books.length}</span>
        </div>

        <div className="sg-carousel-wrap">
          <button className="sg-arrow sg-arrow--left" onClick={() => scroll(-1)} aria-label="Zurück">‹</button>

          <div className="sg-row" ref={rowRef}>
            {books.length === 0 ? (
              <p className="sg-empty">Noch keine Bücher in diesem Thema.</p>
            ) : (
              books.map((book) => (
                <Link key={book.id} to={`/book/${book.id}`} className="sg-card">
                  <div className="sg-cover-wrap">
                    <img
                      src={book.cover_url}
                      alt={book.title || "Buchcover"}
                      className="sg-cover"
                      loading="lazy"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                    {book.top_book && <span className="sg-badge">Top</span>}
                  </div>
                  <div className="sg-card-body">
                    <p className="sg-book-title">{book.title || "Ohne Titel"}</p>
                    {book.author && <p className="sg-book-author">{book.author}</p>}
                  </div>
                </Link>
              ))
            )}
          </div>

          <button className="sg-arrow sg-arrow--right" onClick={() => scroll(1)} aria-label="Weiter">›</button>
        </div>
      </div>
    </main>
  );
}

  import React, { useEffect, useMemo, useRef, useState } from "react";
  import { Link } from "react-router-dom";
  import "./HomeTitlesPage.css";
  import { coverUrl } from "../utils/covers";
  const API_ROOT = import.meta.env.VITE_API_ROOT || "";

  export default function HomeTitlesPage() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
      let mounted = true;

      async function load() {
        try {
          setLoading(true);
          setError("");

          const res = await fetch(`${API_ROOT}/api/public/books/home-titles`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          if (mounted) setBooks(Array.isArray(data?.books) ? data.books : []);
        } catch (err) {
          console.error(err);
          if (mounted) setError("Could not load titles.");
        } finally {
          if (mounted) setLoading(false);
        }
      }

      load();
      return () => {
        mounted = false;
      };
    }, []);

    const hasCover = (b) => Boolean(coverUrl(b));

const finishedBooks = useMemo(
  () => books.filter((b) => b.presented_as === "finished" && hasCover(b)),
  [books]
);

const receivedBooks = useMemo(
  () => books.filter((b) => b.presented_as === "received" && hasCover(b)),
  [books]
);

    if (loading) return <main className="home-titles-page">Loading…</main>;
    if (error) return <main className="home-titles-page">{error}</main>;

    return (
      <main className="home-titles-page">
        
        <div className="home-titles-rows">
          <TitleSection title="Top Finished" books={finishedBooks} />
          <TitleSection title="Top Received" books={receivedBooks} />
        </div>
      </main>
    );
  }

  function TitleSection({ title, books }) {
    const scrollRef = useRef(null);

    const scrollByPage = (direction) => {
      const el = scrollRef.current;
      if (!el) return;

      el.scrollBy({
        left: direction * Math.round(el.clientWidth * 0.82),
        behavior: "smooth",
      });
    };

    return (
      <section className="home-titles-section">
        <div className="home-titles-section-head">
          <h2>{title}</h2>
        </div>

        {books.length === 0 ? (
          <p className="home-titles-empty">No titles yet.</p>
        ) : (
          <div className="home-titles-carousel">
            <button
              type="button"
              className="home-titles-arrow home-titles-arrow--left"
              onClick={() => scrollByPage(-1)}
              aria-label={`Scroll ${title} left`}
            >
              ‹
            </button>

            <div className="home-titles-scroll" ref={scrollRef} aria-label={title}>
  {books.map((book) => (
    <BookCover
      key={`${book.presented_as}-${book.highlight_id || book.id}`}
      book={book}
    />
  ))}
</div>
            <button
              type="button"
              className="home-titles-arrow home-titles-arrow--right"
              onClick={() => scrollByPage(1)}
              aria-label={`Scroll ${title} right`}
            >
              ›
            </button>
          </div>
        )}
      </section>
    );
  }

 function BookCover({ book }) {
  const [failed, setFailed] = useState(false);

  const title = book.title || "Book";
  const src = coverUrl(book);

  if (!src || failed) return null;

  return (
    <Link
      to={`/book/${book.book_id || book.id}`}
      className="home-title-card"
      aria-label={`Open ${title}`}
      title={title}
    >
      <div className="home-title-cover-wrap">
        <img
          src={src}
          alt={title}
          className="home-title-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    </Link>
  );
}
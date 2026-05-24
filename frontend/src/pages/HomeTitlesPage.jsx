import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./HomeTitlesPage.css";

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
    return () => { mounted = false; };
  }, []);

  const finishedBooks = useMemo(
    () => books.filter((b) => b.presented_as === "finished"),
    [books]
  );

  const receivedBooks = useMemo(
    () => books.filter((b) => b.presented_as === "received"),
    [books]
  );

  if (loading) return <main className="home-titles-page">Loading…</main>;
  if (error) return <main className="home-titles-page">{error}</main>;

  return (
    <main className="home-titles-page">
      <header className="home-titles-header">
        <h1>Homepage Title History</h1>
        <p>All titles that appeared on Home as Top Finished or Top Received.</p>
      </header>

      <TitleSection title="Top Finished" books={finishedBooks} />
      <TitleSection title="Top Received" books={receivedBooks} />
    </main>
  );
}

function TitleSection({ title, books }) {
  return (
    <section className="home-titles-section">
      <div className="home-titles-section-head">
        <h2>{title}</h2>
        <span>{books.length}</span>
      </div>

      {books.length === 0 ? (
        <p className="home-titles-empty">No titles yet.</p>
      ) : (
        <div className="home-titles-grid">
          {books.map((book) => (
            <Link
              key={`${book.presented_as}-${book.highlight_id || book.id}`}
              to={`/book/${book.book_id || book.id}`}
              className="home-title-card"
            >
              <div className="home-title-cover-wrap">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title || "Book cover"}
                    className="home-title-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="home-title-placeholder">No Cover</div>
                )}
              </div>

              <div className="home-title-content">
                <h3>{book.title || "Untitled"}</h3>
                {book.author && <p>{book.author}</p>}
                {book.presented_at && (
                  <small>{new Date(book.presented_at).toLocaleDateString()}</small>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

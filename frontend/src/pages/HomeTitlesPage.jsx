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

        const res = await fetch(`${API_ROOT}/api/public/books/home-titles`);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (!mounted) return;

        setBooks(Array.isArray(data?.books) ? data.books : []);
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

  const finishedBooks = useMemo(
    () => books.filter((b) => b.status === "finished"),
    [books]
  );

  const receivedBooks = useMemo(
    () => books.filter((b) => b.status === "received"),
    [books]
  );

  if (loading) {
    return <div className="home-titles-page">Loading…</div>;
  }

  if (error) {
    return <div className="home-titles-page">{error}</div>;
  }

  return (
    <div className="home-titles-page">
      <header className="home-titles-header">
        <h1>Finished & Received Titles</h1>
        <p>All highlighted titles from the homepage.</p>
      </header>

      <section className="home-titles-section">
        <h2>Top Finished</h2>

        <div className="home-titles-grid">
          {finishedBooks.map((book) => (
            <Link
              key={book.id}
              to={`/book/${book.id}`}
              className="home-title-card"
            >
              <div className="home-title-cover-wrap">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="home-title-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="home-title-placeholder">No Cover</div>
                )}
              </div>

              <div className="home-title-content">
                <h3>{book.title}</h3>
                {book.author && <p>{book.author}</p>}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-titles-section">
        <h2>Received</h2>

        <div className="home-titles-grid">
          {receivedBooks.map((book) => (
            <Link
              key={book.id}
              to={`/book/${book.id}`}
              className="home-title-card"
            >
              <div className="home-title-cover-wrap">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="home-title-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="home-title-placeholder">No Cover</div>
                )}
              </div>

              <div className="home-title-content">
                <h3>{book.title}</h3>
                {book.author && <p>{book.author}</p>}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

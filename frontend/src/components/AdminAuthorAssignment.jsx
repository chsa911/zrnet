import React, { useState } from "react";
import { apiUrl } from "../api/apiRoot";

export default function AdminAuthorAssignment() {
  const [bookQuery, setBookQuery] = useState("");
  const [authorQuery, setAuthorQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedAuthor, setSelectedAuthor] = useState(null);
  const [message, setMessage] = useState("");

  async function searchBooks(value) {
    setBookQuery(value);
    setSelectedBook(null);

    if (value.trim().length < 2) {
      setBooks([]);
      return;
    }

    const res = await fetch(
      apiUrl(`/admin/author-assignment/books?q=${encodeURIComponent(value)}`),
      { credentials: "include", cache: "no-store" }
    );

    const json = await res.json();
    setBooks(json.items || []);
  }

  async function searchAuthors(value) {
    setAuthorQuery(value);
    setSelectedAuthor(null);

    if (value.trim().length < 1) {
      setAuthors([]);
      return;
    }

    const res = await fetch(
      apiUrl(`/admin/author-assignment/authors?q=${encodeURIComponent(value)}`),
      { credentials: "include", cache: "no-store" }
    );

    const json = await res.json();
    setAuthors(json.items || []);
  }

  async function assignAuthor() {
    setMessage("");

    if (!selectedBook || !selectedAuthor) {
      setMessage("Select one book and one author.");
      return;
    }

    const res = await fetch(apiUrl("/admin/author-assignment/assign"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  title_display: selectedBook.title_display,
  author_id: selectedAuthor.id,
}),
    });

    const json = await res.json();

    if (!res.ok) {
      setMessage(json.error || "Assignment failed.");
      return;
    }

    setMessage(`Assigned "${json.item.title_display}" to ${json.item.author_name_display}.`);
    searchBooks(bookQuery);
  }

  return (
    <div className="author-assignment-box">
      <h2>Free Author Assignment</h2>

      <div className="author-assignment-grid">
        <div>
          <h3>Book title</h3>

          <input
            className="afi-search"
            value={bookQuery}
            onChange={(e) => searchBooks(e.target.value)}
            placeholder="Search title keyword, e.g. wanderhure"
          />

          <div className="assignment-results">
            {books.map((book) => (
              <button
                key={book.id}
                type="button"
                className={
                  selectedBook?.id === book.id
                    ? "assignment-result assignment-result--selected"
                    : "assignment-result"
                }
                onClick={() => setSelectedBook(book)}
              >
              <strong>{book.title_display}</strong>

<small>
  Currently assigned to: {book.current_author || "none"}
</small>

<small>
  {book.book_count} copies
</small>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3>Author</h3>

          <input
            className="afi-search"
            value={authorQuery}
            onChange={(e) => searchAuthors(e.target.value)}
            placeholder="Search abbreviation, last name, or name"
          />

          <div className="assignment-results">
            {authors.map((author) => (
              <button
                key={author.id}
                type="button"
                className={
                  selectedAuthor?.id === author.id
                    ? "assignment-result assignment-result--selected"
                    : "assignment-result"
                }
                onClick={() => setSelectedAuthor(author)}
              >
                <strong>{author.name_display}</strong>
                <small>
                  {[author.abbr, author.last_name].filter(Boolean).join(" · ")}
                </small>
              </button>
            ))}
          </div>

          <button className="assignment-assign-button" type="button" onClick={assignAuthor}>
            Assign selected title to selected author
          </button>

          {message ? <div className="assignment-message">{message}</div> : null}
        </div>
      </div>
    </div>
  );
}
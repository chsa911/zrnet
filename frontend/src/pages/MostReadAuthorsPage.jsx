import React, { useEffect, useRef, useState } from "react";
import { listMostReadAuthors } from "../api/books";
import "./MostReadAuthorsPage.css";

// hardcoded favorites (from your old HTML screenshot)
const FAVORITES = [
  { re: /konsalik/i, title: "the black mandarin" },
  { re: /grisham/i, title: "the firm" },
  { re: /\bking\b/i, title: "the green mile" },
  { re: /charlotte\s+link/i, title: "the decision" },

  { re: /follett/i, title: "the needle" },
  { re: /hohlbein/i, title: "the inquisitor" },
  { re: /\barcher\b/i, title: "kain and abel" },
  { re: /\bsteel\b/i, title: "the gift" },

  { re: /\bkarl\s+may\b|may,\s*karl/i, title: "winnetou 1" },
  { re: /barbara\s+wood/i, title: "the curse of the rolles" },
  { re: /vandenberg/i, title: "the hetaere" },

  { re: /crichton/i, title: "timeline" },
  { re: /lorentz/i, title: "the tartarin" },
  { re: /murakami/i, title: "dangerous lover" },
  { re: /tania\s+kinkel/i, title: "the dollplayers" },

  { re: /wolf\s+serno/i, title: "the dollking" },
];

function favFor(author) {
  const a = String(author || "");
  const hit = FAVORITES.find((x) => x.re.test(a));
  return hit?.title || "";
}

function buyUrl(author, title) {
  const q = [title, author].filter(Boolean).join(" ");
  return q ? `https://www.amazon.de/s?k=${encodeURIComponent(q)}` : "";
}

export default function MostReadAuthorsPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const acRef = useRef(null);

  useEffect(() => {
    if (acRef.current) acRef.current.abort();
    const ac = new AbortController();
    acRef.current = ac;

    setLoading(true);
    setErr("");

    listMostReadAuthors({ limit: 200, signal: ac.signal })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((e) => {
        if (ac.signal.aborted) return;
        setErr(e?.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, []);

  return (
    <div className="mra">
      <h1 className="mra-title">Authors that I have read most plus their best titles</h1>

      {err ? <div className="mra-error">{err}</div> : null}
      {loading ? <div className="mra-loading">loading…</div> : null}

      <div className="mra-wrap">
        <table className="mra-table">
          <thead>
            <tr>
              <th>Author</th>
              <th className="mra-num">Books read (number)</th>
              <th className="mra-num">Books in stock (number)</th>
              <th>Favorite title</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const author = r.author || "—";
              const booksRead = r.books_read ?? 0;
              const booksInStock = r.books_in_stock ?? 0;

              const fav = favFor(author) || r.best_title || "";
              const url = fav ? buyUrl(author, fav) : "";

              return (
                <tr key={author}>
                  <td>{author}</td>
                  <td className="mra-num">{booksRead}</td>
                  <td className="mra-num">{booksInStock}</td>
                  <td>
                    {fav ? (
                      <a href={url} target="_blank" rel="noreferrer">{fav}</a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="mra-empty">No data.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
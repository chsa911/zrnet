import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { listMostReadAuthors } from "../api/books";
import { useI18n } from "../context/I18nContext";

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
  const { t } = useI18n();

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
      .then((data) => {
        if (ac.signal.aborted) return;
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setErr(e?.message || String(e));
        setRows([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, []);

  const title = t("mra_title");
  const lede = t("mra_lede");
  const thAuthor = t("mra_th_author");
  const thRead = t("mra_th_read");
  const thStock = t("mra_th_stock");
  const thFav = t("mra_th_fav");
  const emptyText = t("mra_empty");

  return (
    <section className="zr-section" aria-busy={loading ? "true" : "false"}>
      <h1>{title}</h1>
      <p className="zr-lede">{lede}</p>

      <div className="zr-card">
        {err ? <div className="zr-alert zr-alert--error">{err}</div> : null}
        {loading ? <div className="zr-alert">{t("mra_loading")}</div> : null}

        <div style={{ overflow: "auto" }}>
          <table className="zr-table">
            <thead>
              <tr>
                <th>{thAuthor}</th>
                <th style={{ textAlign: "right" }}>{thRead}</th>
                <th style={{ textAlign: "right" }}>{thStock}</th>
                <th>{thFav}</th>
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
                    <td>
                      <Link to={`/author/${encodeURIComponent(author)}`}>{author}</Link>
                    </td>
                    <td style={{ textAlign: "right" }}>{booksRead}</td>
                    <td style={{ textAlign: "right" }}>{booksInStock}</td>
                    <td>
                      {fav ? (
                        <a href={url} target="_blank" rel="noreferrer noopener">
                          {fav}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ opacity: 0.75 }}>
                    {emptyText}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
// Alle Titel mit einem Schlagwort: /tag/:slug
// Daten: GET /api/public/keywords/:slug/books (backend/routes/keywords.js)

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { getKeywordBooks } from "../api/books";
import { useSeo } from "../utils/seo";
import "./KeywordPage.css";

function BookCard({ book, untitled }) {
  const [broken, setBroken] = useState(false);
  const title = book.title || untitled;
  return (
    <Link to={`/book/${encodeURIComponent(book.id)}`} className="kw-card" title={title}>
      <div className="kw-cover-wrap">
        {book.cover_url && !broken ? (
          <img
            src={book.cover_url}
            alt={title}
            className="kw-cover"
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="kw-cover-empty">{title}</div>
        )}
        {book.top_book ? <span className="kw-badge">Top</span> : null}
      </div>
      <div className="kw-card-body">
        <p className="kw-book-title">{title}</p>
        {book.author ? <p className="kw-book-author">{book.author}</p> : null}
      </div>
    </Link>
  );
}

export default function KeywordPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | not_found | error

  useEffect(() => {
    const ac = new AbortController();
    setState("loading");
    setData(null);
    getKeywordBooks(slug, { signal: ac.signal })
      .then((json) => {
        setData(json);
        setState("ok");
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setState(e?.status === 404 ? "not_found" : "error");
      });
    return () => ac.abort();
  }, [slug]);

  const name = data?.keyword?.name || "";
  useSeo({
    title: name ? t("seo.keyword.title", { name }) : undefined,
    description: name ? t("seo.keyword.desc", { name }) : undefined,
    path: slug ? `/tag/${encodeURIComponent(slug)}` : undefined,
    noindex: state === "not_found",
  });

  const books = data?.books || [];

  return (
    <main className="kw-page">
      <div className="kw-top">
        <button
          type="button"
          className="zr-btn2 zr-btn2--ghost"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
        >
          ← {t("keyword.back")}
        </button>
      </div>

      {state === "loading" ? <p className="kw-msg">{t("keyword.loading")}</p> : null}
      {state === "not_found" ? <p className="kw-msg">{t("keyword.not_found")}</p> : null}
      {state === "error" ? <p className="kw-msg kw-msg--err">{t("keyword.failed")}</p> : null}

      {state === "ok" ? (
        <>
          <div className="kw-head">
            <h1 className="kw-title"># {name}</h1>
            <span className="kw-count">{t("keyword.count", { n: books.length })}</span>
          </div>

          {books.length ? (
            <div className="kw-grid">
              {books.map((b) => (
                <BookCard key={b.id} book={b} untitled={t("keyword.untitled")} />
              ))}
            </div>
          ) : (
            <p className="kw-msg">{t("keyword.empty")}</p>
          )}
        </>
      ) : null}
    </main>
  );
}

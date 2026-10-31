// frontend/src/pages/AuthorProfilePage.jsx
// Author profile: name on the left, then three columns —
// finished titles | abandoned titles | favourite title with cover.
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listPublicBooks } from "../api/books";
import { getApiRoot } from "../api/apiRoot";
import { coverUrl } from "../utils/covers";
import { useSeo } from "../utils/seo";
import { useI18n } from "../context/I18nContext";
import "./AuthorProfilePage.css";

const LABELS = {
  de: {
    finished: "Beendet",
    abandoned: "Abgebrochen",
    favorite: "Mein Lieblingstitel",
    noFavorite: "Noch kein Lieblingstitel",
    none: "Keine Titel",
    loading: "Lädt…",
    noCover: "Kein Cover",
  },
  en: {
    finished: "Finished",
    abandoned: "Abandoned",
    favorite: "My favourite",
    noFavorite: "No favourite yet",
    none: "No titles",
    loading: "Loading…",
    noCover: "No cover",
  },
};

const isUuid = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "").trim()
  );

const isAbortError = (e) =>
  e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("aborted");

function toBook(raw, i) {
  const id = String(raw?.id ?? raw?.book_id ?? raw?.bookId ?? "").trim() || `book-${i}`;
  return {
    id,
    raw,
    title: raw?.titleDisplay || raw?.bookTitleDisplay || raw?.title || raw?.BTitle || "—",
    st: String(raw?.reading_status || raw?.readingStatus || raw?.status || "").toLowerCase().trim(),
    isTop: Boolean(raw?.top_book ?? raw?.topBook ?? raw?.BTop),
    topSetAt: raw?.top_book_set_at || raw?.topBookSetAt || "",
    updatedAt: raw?.reading_status_updated_at || raw?.readingStatusUpdatedAt || "",
  };
}

const byTitle = (a, b) => String(a.title).localeCompare(String(b.title), undefined, { sensitivity: "base" });

function TitleList({ heading, books, emptyText, loading, loadingText, variant }) {
  return (
    <section className={`zr-ap__col zr-ap__col--${variant}`} aria-label={heading}>
      <header className="zr-ap__colHead">
        <h2 className="zr-ap__colTitle">{heading}</h2>
        <span className="zr-ap__count">{loading ? "—" : books.length}</span>
      </header>
      {loading ? (
        <p className="zr-ap__empty">{loadingText}</p>
      ) : books.length === 0 ? (
        <p className="zr-ap__empty">{emptyText}</p>
      ) : (
        <ol className="zr-ap__list">
          {books.map((b) => (
            <li key={b.id}>
              <Link to={`/book/${encodeURIComponent(b.id)}`}>{b.title}</Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default function AuthorProfilePage() {
  const { author: authorParam } = useParams();
  const { locale, t } = useI18n();
  const L = LABELS[String(locale || "").split("-")[0]] || LABELS.en;

  const authorQuery = useMemo(() => {
    try {
      return decodeURIComponent(String(authorParam || "")).trim();
    } catch {
      return String(authorParam || "").trim();
    }
  }, [authorParam]);

  // Resolve UUID -> display name + lookup key
  const [author, setAuthor] = useState({ key: authorQuery, display: authorQuery });
  useEffect(() => {
    let alive = true;
    if (!isUuid(authorQuery)) {
      setAuthor({ key: authorQuery, display: authorQuery });
      return undefined;
    }
    (async () => {
      try {
        const res = await fetch(`${getApiRoot()}/public/authors/${encodeURIComponent(authorQuery)}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("author_lookup_failed");
        const a = await res.json();
        const display = a?.name_display ?? a?.nameDisplay ?? a?.full_name ?? a?.name ?? authorQuery;
        const key = a?.abbreviation ?? a?.abbr ?? a?.name_display ?? a?.name ?? display;
        if (alive) setAuthor({ key: String(key).trim(), display: String(display).trim() });
      } catch {
        if (alive) setAuthor({ key: authorQuery, display: authorQuery });
      }
    })();
    return () => {
      alive = false;
    };
  }, [authorQuery]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setErr("");
      setItems([]);
      if (!author.key) {
        setLoading(false);
        return;
      }
      try {
        const res = await listPublicBooks({ author: author.key, bucket: "all", limit: 2000, offset: 0, signal: ac.signal });
        if (!ac.signal.aborted) setItems(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        if (!isAbortError(e) && !ac.signal.aborted) setErr(e?.message || "Failed to load books");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [author.key]);

  const { finished, abandoned, favorite } = useMemo(() => {
    const books = items.map(toBook);
    const fin = books.filter((b) => b.st === "finished").sort(byTitle);
    const ab = books.filter((b) => b.st === "abandoned").sort(byTitle);
    // Favourite = top book; prefer a finished one, most recently marked top
    const tops = books
      .filter((b) => b.isTop)
      .sort(
        (a, b) =>
          (b.st === "finished") - (a.st === "finished") ||
          String(b.topSetAt).localeCompare(String(a.topSetAt))
      );
    return { finished: fin, abandoned: ab, favorite: tops[0] || null };
  }, [items]);

  const authorName = useMemo(() => {
    if (author.display && !isUuid(author.display)) return author.display;
    const first = items[0];
    return String(first?.authorNameDisplay || first?.author_name_display || first?.author || author.display || "").trim();
  }, [author.display, items]);

  useSeo({
    title: authorName ? t("seo.author.title", { author: authorName }) : undefined,
    description: authorName ? t("seo.author.desc", { author: authorName }) : undefined,
  });

  const [coverBroken, setCoverBroken] = useState(false);
  useEffect(() => setCoverBroken(false), [favorite?.id]);
  const favCover = favorite ? coverUrl(favorite.raw) : "";

  return (
    <section className="zr-section zr-ap" aria-busy={loading ? "true" : "false"}>
      {err ? <div className="zr-alert zr-alert--error">{err}</div> : null}

      <div className="zr-ap__layout">
        <aside className="zr-ap__name">
          <h1>{authorName}</h1>
        </aside>

        <TitleList
          variant="finished"
          heading={L.finished}
          books={finished}
          emptyText={L.none}
          loading={loading}
          loadingText={L.loading}
        />

        <TitleList
          variant="abandoned"
          heading={L.abandoned}
          books={abandoned}
          emptyText={L.none}
          loading={loading}
          loadingText={L.loading}
        />

        <section className="zr-ap__col zr-ap__col--fav" aria-label={L.favorite}>
          <header className="zr-ap__colHead">
            <h2 className="zr-ap__colTitle">{L.favorite}</h2>
          </header>
          {loading ? (
            <p className="zr-ap__empty">{L.loading}</p>
          ) : favorite ? (
            <Link className="zr-ap__fav" to={`/book/${encodeURIComponent(favorite.id)}`}>
              <div className="zr-ap__favCover">
                {favCover && !coverBroken ? (
                  <img src={favCover} alt={`${favorite.title} – Cover`} onError={() => setCoverBroken(true)} />
                ) : (
                  <span>{L.noCover}</span>
                )}
              </div>
              <span className="zr-ap__favTitle">{favorite.title}</span>
            </Link>
          ) : (
            <p className="zr-ap__empty">{L.noFavorite}</p>
          )}
        </section>
      </div>
    </section>
  );
}

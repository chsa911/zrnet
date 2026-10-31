// Global search in the top navigation: magnifier + field.
// Typing shows authors (author-suggest) and books (public books, bucket=all:
// title, author, publisher, ISBN …). Enter opens the collection with all results.
import { useEffect, useId, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { listPublicBooks, suggestAuthors } from "../api/books";
import { coverHomeUrl } from "../utils/covers";
import "./navsearch.css";

function isAbortError(e) {
  return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("abort");
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M20 20l-4.2-4.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function NavSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const uid = useId();
  const listId = `${uid}-list`;

  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false); // dropdown visible
  const [mobileOpen, setMobileOpen] = useState(false); // field expanded on small screens
  const [authors, setAuthors] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  const term = q.trim();

  // close everything on navigation
  useEffect(() => {
    setOpen(false);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  // close when clicking outside
  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  // "/" focuses the search from anywhere
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || e.target?.isContentEditable) return;
      e.preventDefault();
      setMobileOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // live results (debounced)
  useEffect(() => {
    if (term.length < 2) {
      setAuthors([]);
      setBooks([]);
      setLoading(false);
      return undefined;
    }
    const ac = new AbortController();
    setLoading(true);
    const id = setTimeout(async () => {
      const [a, b] = await Promise.allSettled([
        suggestAuthors({ q: term, limit: 4, signal: ac.signal }),
        listPublicBooks({ bucket: "all", q: term, limit: 5, signal: ac.signal }),
      ]);
      if (ac.signal.aborted) return;
      setAuthors(a.status === "fulfilled" ? a.value : []);
      setBooks(b.status === "fulfilled" ? b.value?.items || [] : []);
      if (a.status === "rejected" && !isAbortError(a.reason)) console.warn("[NavSearch] authors", a.reason);
      if (b.status === "rejected" && !isAbortError(b.reason)) console.warn("[NavSearch] books", b.reason);
      setActive(-1);
      setLoading(false);
    }, 220);
    return () => {
      clearTimeout(id);
      ac.abort();
    };
  }, [term]);

  // flat list for keyboard navigation (authors, books, "all results")
  const options = [
    ...authors.map((a) => ({ kind: "author", key: `a-${a.id}`, to: `/author/${encodeURIComponent(a.author)}`, item: a })),
    ...books.map((b) => ({ kind: "book", key: `b-${b.id}`, to: `/book/${encodeURIComponent(b.id)}`, item: b })),
  ];
  const allTo = `/collection?filter=all&q=${encodeURIComponent(term)}`;
  if (term.length >= 2) options.push({ kind: "all", key: "all", to: allTo });

  function go(to) {
    setOpen(false);
    setMobileOpen(false);
    setQ("");
    inputRef.current?.blur();
    navigate(to);
  }

  function onSubmit(e) {
    e.preventDefault();
    if (active >= 0 && options[active]) return go(options[active].to);
    if (term) go(allTo);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      setOpen(false);
      setMobileOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!options.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    }
  }

  const showDrop = open && term.length >= 2;
  let idx = -1;
  const opt = (o, children) => {
    idx += 1;
    const i = idx;
    return (
      <li
        key={o.key}
        id={`${uid}-opt-${i}`}
        role="option"
        aria-selected={i === active}
        className={`zr-search__opt zr-search__opt--${o.kind}${i === active ? " is-active" : ""}`}
        onMouseDown={(e) => {
          e.preventDefault();
          go(o.to);
        }}
        onMouseEnter={() => setActive(i)}
      >
        {children}
      </li>
    );
  };

  return (
    <div ref={wrapRef} className={`zr-search${mobileOpen ? " is-mobileOpen" : ""}`}>
      <button
        type="button"
        className="zr-search__toggle"
        aria-label={t("nav_search_label")}
        aria-expanded={mobileOpen}
        onClick={() => {
          setMobileOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <SearchIcon />
      </button>

      <form className="zr-search__form" role="search" onSubmit={onSubmit}>
        <span className="zr-search__icon">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="search"
          className="zr-search__input"
          placeholder={t("nav_search_placeholder")}
          aria-label={t("nav_search_label")}
          value={q}
          autoComplete="off"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={showDrop}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${uid}-opt-${active}` : undefined}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <kbd className="zr-search__kbd" aria-hidden="true">/</kbd>

        {showDrop ? (
          <ul id={listId} className="zr-search__drop" role="listbox" aria-label={t("nav_search_label")}>
            {authors.length ? (
              <li className="zr-search__head" role="presentation">{t("nav_search_authors")}</li>
            ) : null}
            {authors.map((a) =>
              opt(
                { kind: "author", key: `a-${a.id}`, to: `/author/${encodeURIComponent(a.author)}` },
                <>
                  <span className="zr-search__avatar" aria-hidden="true">{(a.author || "?").trim().charAt(0)}</span>
                  <span className="zr-search__main">{a.author}</span>
                  <span className="zr-search__meta">
                    {t(a.count === 1 ? "collection.count_one" : "collection.count", { count: a.count })}
                  </span>
                </>
              )
            )}

            {books.length ? (
              <li className="zr-search__head" role="presentation">{t("nav_search_books")}</li>
            ) : null}
            {books.map((b) =>
              opt(
                { kind: "book", key: `b-${b.id}`, to: `/book/${encodeURIComponent(b.id)}` },
                <>
                  <span className="zr-search__thumb" aria-hidden="true">
                    {coverHomeUrl(b) ? (
                      <img src={coverHomeUrl(b)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
                    ) : null}
                  </span>
                  <span className="zr-search__text">
                    <span className="zr-search__main">{b.title || "—"}</span>
                    {b.author ? <span className="zr-search__sub">{b.author}</span> : null}
                  </span>
                </>
              )
            )}

            {!loading && !authors.length && !books.length ? (
              <li className="zr-search__empty" role="presentation">{t("nav_search_none")}</li>
            ) : null}
            {loading && !authors.length && !books.length ? (
              <li className="zr-search__empty" role="presentation">{t("collection.loading")}</li>
            ) : null}

            {opt({ kind: "all", key: "all", to: allTo }, <span className="zr-search__main">{t("nav_search_all", { q: term })} →</span>)}
          </ul>
        ) : null}
      </form>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { listPublicBooks, suggestAuthors } from "../api/books";
import { coverHomeUrl } from "../utils/covers";
import "./home_minimal.css";
import "./CollectionPage.css";
import { useSeo } from "../utils/seo";

const PAGE_SIZE = 48;

// filter key -> bucket of the existing GET /api/public/books
// ("Alle" without wishlist needs a backend change – see Claude outputs/feature-title-translations)
const FILTERS = [
  { key: "available", bucket: "stock", labelKey: "collection.filter_available" }, // same count as the home page
  { key: "finished", bucket: "finished", labelKey: "collection.filter_finished" },
  { key: "abandoned", bucket: "abandoned", labelKey: "collection.filter_abandoned" },
  { key: "top", bucket: "top", labelKey: "collection.filter_top" },
];
const DEFAULT_FILTER = "available";

function isAbortError(e) {
  return e?.name === "AbortError" || String(e?.message || "").toLowerCase().includes("abort");
}

function authorHref(name) {
  return `/author/${encodeURIComponent(name)}`;
}

function BookCard({ book, t }) {
  const [broken, setBroken] = useState(false);
  const src = coverHomeUrl(book);
  const title = book.title || "—";

  let badge = "";
  if (book.top_book) badge = t("collection.badge_top");
  else if (book.reading_status === "finished") badge = t("collection.badge_finished");
  else if (book.reading_status === "abandoned") badge = t("collection.badge_abandoned");
  else if (book.is_in_stock || book.reading_status === "in_progress")
    badge = t("collection.badge_available");

  return (
    <div className="zr-coll-card">
      <Link to={`/book/${encodeURIComponent(book.id)}`} className="zr-coll-cardLink">
      <div className="zr-coll-cover">
        {src && !broken ? (
          <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <div className="zr-coll-cover__fallback" aria-hidden="true">
            <span>{title}</span>
          </div>
        )}
        {badge ? <span className="zr-coll-badge">{badge}</span> : null}
      </div>
      <div className="zr-coll-title">{title}</div>
      </Link>
      {book.author ? (
        <Link to={authorHref(book.author)} className="zr-coll-author" title={t("collection.author_link", { author: book.author })}>
          {book.author}
        </Link>
      ) : (
        <div className="zr-coll-author">—</div>
      )}
    </div>
  );
}

export default function CollectionPage() {
  const { t, locale } = useI18n();
  useSeo({ title: t("collection.title"), description: t("seo.collection.desc"), path: "/collection" });
  const [sp, setSp] = useSearchParams();

  const filterKey = FILTERS.some((f) => f.key === sp.get("filter")) ? sp.get("filter") : DEFAULT_FILTER;
  const urlQ = sp.get("q") || "";

  const [input, setInput] = useState(urlQ);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [offset, setOffset] = useState(0);
  const acRef = useRef(null);
  const navigate = useNavigate();
  const [suggest, setSuggest] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  // author suggestions while typing (from the public API, not the raw DB)
  useEffect(() => {
    const term = input.trim();
    if (term.length < 2) {
      setSuggest([]);
      return undefined;
    }
    const ac = new AbortController();
    const id = setTimeout(async () => {
      try {
        const rows = await suggestAuthors({ q: term, limit: 6, signal: ac.signal });
        setSuggest(rows);
        setActiveIdx(-1);
      } catch (e) {
        if (!isAbortError(e)) setSuggest([]);
      }
    }, 200);
    return () => {
      clearTimeout(id);
      ac.abort();
    };
  }, [input]);

  function openAuthor(name) {
    setSuggestOpen(false);
    navigate(authorHref(name));
  }

  function onSearchKey(e) {
    if (!suggestOpen || !suggest.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggest.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggest.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      openAuthor(suggest[activeIdx].author);
    } else if (e.key === "Escape") {
      setSuggestOpen(false);
    }
  }

  const bucket = useMemo(() => FILTERS.find((f) => f.key === filterKey)?.bucket, [filterKey]);

  // debounce typing -> URL ?q=
  useEffect(() => {
    const id = setTimeout(() => {
      const next = new URLSearchParams(sp);
      if (input.trim()) next.set("q", input.trim());
      else next.delete("q");
      if (next.toString() !== sp.toString()) setSp(next, { replace: true });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  async function load(nextOffset, append) {
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    setLoading(true);
    setErr("");
    try {
      const data = await listPublicBooks({
        bucket,
        q: urlQ || undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
        signal: ac.signal,
      });
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setTotal(data.total || 0);
      setOffset(nextOffset);
    } catch (e) {
      if (isAbortError(e)) return;
      setErr(t("collection.error"));
      if (!append) setItems([]);
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    load(0, false);
    return () => acRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, urlQ]);

  function pickFilter(key) {
    const next = new URLSearchParams(sp);
    if (key === DEFAULT_FILTER) next.delete("filter");
    else next.set("filter", key);
    setSp(next, { replace: true });
  }

  const nf = useMemo(() => new Intl.NumberFormat(locale || "de"), [locale]);
  const hasMore = items.length < total;

  return (
    <section className="zr-section zr-coll">
      <div className="pil-sectionHead">
        <div className="pil-eyebrow pil-eyebrow--muted">{t("home_collection_eyebrow")}</div>
        <h1 className="zr-coll-h1">{t("collection.title")}</h1>
        <p className="pil-lede">{t("collection.lede")}</p>
      </div>

      <div className="zr-coll-controls">
        <label htmlFor="coll-search" className="zr-coll-srOnly">
          {t("collection.search_label")}
        </label>
        <div className="zr-coll-searchWrap">
          <input
            id="coll-search"
            type="search"
            className="zr-coll-search"
            placeholder={t("collection.search_placeholder")}
            value={input}
            autoComplete="off"
            role="combobox"
            aria-expanded={suggestOpen && suggest.length > 0}
            aria-controls="coll-suggest"
            aria-activedescendant={activeIdx >= 0 ? `coll-sugg-${activeIdx}` : undefined}
            onChange={(e) => {
              setInput(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
            onKeyDown={onSearchKey}
          />
          {suggestOpen && suggest.length > 0 ? (
            <ul id="coll-suggest" className="zr-coll-suggest" role="listbox" aria-label={t("collection.suggest_label")}>
              <li className="zr-coll-suggest__head" aria-hidden="true">{t("collection.suggest_label")}</li>
              {suggest.map((a, i) => (
                <li
                  key={a.id}
                  id={`coll-sugg-${i}`}
                  role="option"
                  aria-selected={i === activeIdx}
                  className={`zr-coll-suggest__item ${i === activeIdx ? "is-active" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    openAuthor(a.author);
                  }}
                >
                  <span className="zr-coll-suggest__name">{a.author}</span>
                  <span className="zr-coll-suggest__count">
                    {t(a.count === 1 ? "collection.count_one" : "collection.count", { count: nf.format(a.count) })}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="zr-coll-filters" role="group" aria-label={t("collection.filter_label")}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filterKey === f.key}
              className={`zr-coll-chip ${filterKey === f.key ? "is-active" : ""}`}
              onClick={() => pickFilter(f.key)}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <p className="zr-coll-count" aria-live="polite">
        {loading && !items.length
          ? t("collection.loading")
          : t(total === 1 ? "collection.count_one" : "collection.count", { count: nf.format(total) })}
      </p>

      {err ? <p className="zr-coll-error">{err}</p> : null}

      {!loading && !err && items.length === 0 ? (
        <div className="pil-visionBox zr-coll-empty">
          <p>{t("collection.empty")}</p>
        </div>
      ) : null}

      <div className="zr-coll-grid">
        {items.map((b) => (
          <BookCard key={b.id} book={b} t={t} />
        ))}
      </div>

      {hasMore ? (
        <div className="pil-actions zr-coll-more">
          <button
            type="button"
            className="zr-btn2 zr-btn2--ghost"
            disabled={loading}
            onClick={() => load(offset + PAGE_SIZE, true)}
          >
            {loading ? t("collection.loading") : t("collection.more")}
          </button>
        </div>
      ) : null}
    </section>
  );
}

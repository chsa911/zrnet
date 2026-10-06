import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { listPublicBooks } from "../api/books";
import { coverHomeUrl } from "../utils/covers";
import "./home_minimal.css";
import "./CollectionPage.css";

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
    <Link to={`/book/${encodeURIComponent(book.id)}`} className="zr-coll-card">
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
      <div className="zr-coll-author">{book.author || "—"}</div>
    </Link>
  );
}

export default function CollectionPage() {
  const { t, locale } = useI18n();
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
        <input
          id="coll-search"
          type="search"
          className="zr-coll-search"
          placeholder={t("collection.search_placeholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
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

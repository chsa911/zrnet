import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

function pick(obj, keys) {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function safeHttpUrl(v) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

export default function StatsDetailPage() {
  const { type } = useParams(); // stock | finished | abandoned | top
  const [sp] = useSearchParams();
  const year = sp.get("year");
  const { t } = useI18n();

  const allowed = useMemo(() => new Set(["stock", "finished", "abandoned", "top"]), []);
  const isValid = allowed.has(type);

  const pageTitle = useMemo(() => {
    const map = {
      stock: t("stats_in_stock"),
      finished: t("stats_finished"),
      abandoned: t("stats_abandoned"),
      top: t("stats_top"),
    };
    return map[type] || `Stats: ${type}`;
  }, [type, t]);

  // pagination + search
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const limit = 120;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);

  // reset when switching type/year
  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(false);
    setError("");
  }, [type, year]);

  async function fetchPage({ nextOffset, append }) {
    // If your backend uses a different query param than "bucket", change it here:
    const BUCKET_PARAM = "bucket";

    const qs = new URLSearchParams();
    qs.set(BUCKET_PARAM, type);
    qs.set("limit", String(limit));
    qs.set("offset", String(nextOffset));
    qs.set("meta", "1"); // if backend supports it, it can return {items,total,...}

    // only apply year filtering for non-stock (usually stock is lifetime)
    if (type !== "stock" && year) qs.set("year", year);

    // optional backend search support
    if (q.trim()) qs.set("q", q.trim());

    // try the most likely endpoint
    const url = `/api/public/books?${qs.toString()}`;

    const resp = await fetch(url, { headers: { Accept: "application/json" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();

    // Accept multiple response shapes:
    // - { items: [...] }
    // - [...]
    // - { rows: [...] }
    const newItems = Array.isArray(data) ? data : (data.items || data.rows || []);
    const total = !Array.isArray(data) ? (typeof data.total === "number" ? data.total : null) : null;

    setItems((prev) => (append ? [...prev, ...newItems] : newItems));
    setOffset(nextOffset + newItems.length);

    if (total != null) {
      setHasMore(nextOffset + newItems.length < total);
    } else {
      // fallback: if we got a full page, assume there might be more
      setHasMore(newItems.length === limit);
    }
  }

  useEffect(() => {
    if (!isValid) return;
    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setError("");
      try {
        // first page
        await fetchPage({ nextOffset: 0, append: false });
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, year, isValid, q]); // refetch when q changes (backend search). If you prefer client-only search, remove q here.

  const normalized = useMemo(() => {
    return items.map((b) => {
      const author = pick(b, ["author", "author_display", "authorDisplay", "author_name", "authorName"]) || "—";
      const title = pick(b, ["title", "full_title", "fullTitle", "title_keyword", "titleKeyword"]) || "—";

      const purchase_url = safeHttpUrl(
        pick(b, [
          "purchase_url",
          "purchaseUrl",
          "purchase_link",
          "purchaseLink",
          "buy_url",
          "buyUrl",
          "buy_link",
          "buyLink",
          "amazon_url",
          "amazonUrl",
          "link",
          "url",
        ])
      );

      const id = pick(b, ["id", "book_id", "bookId", "barcode", "isbn"]) || `${author}-${title}`;

      return { id, author, title, purchase_url };
    });
  }, [items]);

  if (!isValid) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Unknown stats page</h2>
        <p>Type: {String(type)}</p>
        <Link to="/">← Back</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{pageTitle}</h2>
        {type !== "stock" && year ? <span style={{ opacity: 0.7 }}>({year})</span> : null}
        <Link to="/" style={{ marginLeft: "auto" }}>
          ← {t("nav_home")}
        </Link>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search_placeholder")}
          style={{ padding: "8px 10px", minWidth: 260 }}
        />
        <span style={{ opacity: 0.7 }}>
          {normalized.length} {t("books") || "books"}
        </span>
      </div>

      {error ? (
        <div style={{ marginTop: 16, color: "crimson" }}>
          {t("stats_error", { error }) || `Error: ${error}`}
        </div>
      ) : null}

      <ul style={{ listStyle: "none", padding: 0, marginTop: 18, lineHeight: 1.6 }}>
        {normalized.map((b) => {
          const href = b.purchase_url;

          return (
            <li key={b.id} style={{ padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              {href ? (
                <>
                  <a href={href} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none", fontWeight: 600 }}>
                    {b.author}
                  </a>
                  {" — "}
                  <a href={href} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                    {b.title}
                  </a>
                </>
              ) : (
                <span>
                  {b.author} — {b.title}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
        {loading ? <span>{t("loading") || "Loading…"}</span> : null}

        {!loading && hasMore ? (
          <button
            onClick={async () => {
              setLoading(true);
              setError("");
              try {
                await fetchPage({ nextOffset: offset, append: true });
              } catch (e) {
                setError(e?.message || String(e));
              } finally {
                setLoading(false);
              }
            }}
            style={{ padding: "8px 12px", cursor: "pointer" }}
          >
            {t("load_more") || "Load more"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
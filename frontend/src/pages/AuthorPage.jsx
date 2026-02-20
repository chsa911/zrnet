import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { listPublicBooks } from "../api/books";
import "./AuthorPage.css";

function isAbortError(e) {
  return (
    e?.name === "AbortError" ||
    String(e?.message || "").toLowerCase().includes("aborted")
  );
}

function buyFallback(author, title) {
  const q = [title, author].filter(Boolean).join(" ");
  return q ? `https://www.amazon.de/s?k=${encodeURIComponent(q)}` : "";
}

function normStatus(s) {
  return String(s || "").toLowerCase();
}

export default function AuthorPage() {
  const { author: authorParam } = useParams();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  const authorQuery = useMemo(() => {
    try {
      return decodeURIComponent(String(authorParam || "")).trim();
    } catch {
      return String(authorParam || "").trim();
    }
  }, [authorParam]);

  const tab = (sp.get("tab") || "read").toLowerCase(); // read | wishlist | stock | all
  const q = sp.get("q") || "";

  const setTab = (next) => {
    const p = new URLSearchParams(sp);
    p.set("tab", next);
    setSp(p, { replace: true });
  };

  const setQ = (next) => {
    const p = new URLSearchParams(sp);
    if (next) p.set("q", next);
    else p.delete("q");
    setSp(p, { replace: true });
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr("");
        setItems([]);

        // Fetch ALL books of this author (public endpoint supports author filter)
        const res = await listPublicBooks({
          author: authorQuery,
          limit: 2000,
          offset: 0,
          signal: ac.signal,
        });

        if (!ac.signal.aborted) setItems(Array.isArray(res?.items) ? res.items : []);
      } catch (e) {
        if (isAbortError(e) || ac.signal.aborted) return;
        setErr(e?.message || "Failed to load author books");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [authorQuery]);

  const authorName = authorQuery || "Author";

  // Grouping (client-side)
  const groups = useMemo(() => {
    const all = items.map((b) => ({
      id: b.id,
      title: b.titleDisplay || b.bookTitleDisplay || b.title || "—",
      cover: b.cover || (b.id ? `/assets/covers/${b.id}.jpg` : ""),
      purchaseUrl: b.purchaseUrl || b.purchase_url || "",
      readingStatus: b.readingStatus || b.reading_status || "",
      // if backend later adds `isInStock`, prefer it; fallback to reading_status === 'in_stock'
      isInStock: Boolean(b.isInStock ?? b.is_in_stock ?? normStatus(b.readingStatus || b.reading_status) === "in_stock"),
    }));

    const read = all.filter((b) => normStatus(b.readingStatus) === "finished");
    const wishlist = all.filter((b) => normStatus(b.readingStatus) === "wishlist");
    const stock = all.filter((b) => b.isInStock && normStatus(b.readingStatus) !== "finished");
    const other = all.filter((b) => !read.includes(b) && !wishlist.includes(b) && !stock.includes(b));

    return { all, read, wishlist, stock, other };
  }, [items]);

  const activeList = useMemo(() => {
    const base =
      tab === "wishlist" ? groups.wishlist :
      tab === "stock" ? groups.stock :
      tab === "all" ? groups.all :
      groups.read;

    const needle = q.trim().toLowerCase();
    if (!needle) return base;

    return base.filter((b) => String(b.title || "").toLowerCase().includes(needle));
  }, [tab, q, groups]);

  const counts = {
    read: groups.read.length,
    wishlist: groups.wishlist.length,
    stock: groups.stock.length,
    all: groups.all.length,
  };

  return (
    <section className="zr-section zr-author" aria-busy={loading ? "true" : "false"}>
      <div className="zr-author__top">
        <button className="zr-btn2 zr-btn2--ghost" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <Link className="zr-btn2 zr-btn2--ghost" to="/top-authors">
          Top authors
        </Link>

        {/* “Explore” links (need routes/pages to exist) */}
        <div style={{ flex: 1 }} />
        <Link className="zr-btn2 zr-btn2--ghost" to="/region/himalaya">
          Himalaya
        </Link>
        <Link className="zr-btn2 zr-btn2--ghost" to="/bookthemes?q=bergsteigen">
          Bergsteigen
        </Link>
        <Link className="zr-btn2 zr-btn2--ghost" to="/year/1996">
          1996
        </Link>
      </div>

      <h1 className="zr-author__title">{authorName}</h1>
      <p className="zr-lede">All books by this author (from your collection).</p>

      {err ? <div className="zr-alert zr-alert--error">{err}</div> : null}
      {loading ? <div className="zr-alert">Loading…</div> : null}

      {/* Tabs + Search */}
      <div className="zr-card" style={{ marginBottom: 12 }}>
        <div className="zr-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
          <button
            className={`zr-btn2 zr-btn2--sm ${tab === "read" ? "zr-btn2--primary" : "zr-btn2--ghost"}`}
            onClick={() => setTab("read")}
          >
            Read ({counts.read})
          </button>
          <button
            className={`zr-btn2 zr-btn2--sm ${tab === "wishlist" ? "zr-btn2--primary" : "zr-btn2--ghost"}`}
            onClick={() => setTab("wishlist")}
            title="Requires reading_status='wishlist' in DB"
          >
            Wishlist ({counts.wishlist})
          </button>
          <button
            className={`zr-btn2 zr-btn2--sm ${tab === "stock" ? "zr-btn2--primary" : "zr-btn2--ghost"}`}
            onClick={() => setTab("stock")}
          >
            In stock ({counts.stock})
          </button>
          <button
            className={`zr-btn2 zr-btn2--sm ${tab === "all" ? "zr-btn2--primary" : "zr-btn2--ghost"}`}
            onClick={() => setTab("all")}
          >
            All ({counts.all})
          </button>

          <div style={{ flex: 1 }} />
          <input
            className="zr-input"
            placeholder="Search title…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 220 }}
          />
        </div>
      </div>

      {!loading && activeList.length === 0 ? (
        <div className="zr-card">No books found for this selection.</div>
      ) : null}

      <div className="zr-author__grid">
        {activeList.map((b) => {
          const buy = b.purchaseUrl || buyFallback(authorName, b.title);

          return (
            <article key={b.id} className="zr-card zr-author__book">
              <Link className="zr-author__coverWrap" to={`/book/${encodeURIComponent(b.id)}`}>
                {b.cover ? (
                  <img
                    className="zr-author__cover"
                    src={b.cover}
                    alt={`${b.title} cover`}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const next = e.currentTarget.nextElementSibling;
                      if (next) next.style.display = "flex";
                    }}
                  />
                ) : null}
                <div className="zr-author__coverEmpty">No cover</div>
              </Link>

              <div className="zr-author__meta">
                <Link className="zr-author__bookTitle" to={`/book/${encodeURIComponent(b.id)}`}>
                  {b.title}
                </Link>

                {b.readingStatus ? (
                  <div className="zr-author__status">
                    {b.readingStatus}
                    {b.isInStock ? " · in stock" : ""}
                  </div>
                ) : null}

                <div className="zr-author__actions">
                  <Link className="zr-btn2 zr-btn2--ghost" to={`/book/${encodeURIComponent(b.id)}`}>
                    Details
                  </Link>
                  {buy ? (
                    <a
                      className="zr-btn2 zr-btn2--primary"
                      href={buy}
                      target="_blank"
                      rel="noreferrer noopener"
                      title="Opens in a new tab"
                    >
                      Buy ↗
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
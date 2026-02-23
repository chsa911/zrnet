import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listThemesSummary } from "../api/themes";
import "./BookThemesPage.css";

const HERO_IMG_PRIMARY = "/assets/images/allgemein/buecherschrank_ganz_offen.avif";
const HERO_IMG_FALLBACK = "/assets/images/allgemein/buecher_schrank.webp";
const TILE_FALLBACK_IMG = HERO_IMG_PRIMARY;

export default function BookThemesPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [themes, setThemes] = useState([]);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("order"); // order | count | alpha

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const tRes = await listThemesSummary();
        if (!alive) return;

        const tItems = Array.isArray(tRes) ? tRes : tRes?.items || tRes?.data || [];
        const cleaned = (tItems || [])
          // DB has NOT NULL for abbr/full_name, but keep this as a safety net
          .filter((t) => t?.abbr && t?.full_name)
          .map((t) => ({
            abbr: String(t.abbr).trim(),
            full_name: String(t.full_name).trim(),
            image_path: t.image_path ? String(t.image_path).trim() : "",
            description: t.description ? String(t.description).trim() : "",
            sort_order: Number.isFinite(Number(t.sort_order)) ? Number(t.sort_order) : 100,
            book_count: Number.isFinite(Number(t.book_count)) ? Number(t.book_count) : 0,
          }));

        setThemes(cleaned);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || String(e));
        setThemes([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const totalTaggedBooks = useMemo(
    () => themes.reduce((sum, t) => sum + (Number.isFinite(t.book_count) ? t.book_count : 0), 0),
    [themes]
  );

  // Featured = first 4 by DB order
  const featuredThemes = useMemo(() => {
    const list = themes
      .slice()
      .sort((a, b) => (a.sort_order - b.sort_order) || a.full_name.localeCompare(b.full_name));
    return list.slice(0, 4);
  }, [themes]);

  const featuredAbbrSet = useMemo(() => new Set(featuredThemes.map((t) => t.abbr)), [featuredThemes]);

  const tileModels = useMemo(() => {
    const query = q.trim().toLowerCase();

    let list = themes.slice();

    // ✅ Prevent duplicates: when NOT searching, remove featured from main grid
    if (!query) {
      list = list.filter((t) => !featuredAbbrSet.has(t.abbr));
    }

    // search filter (applies in both cases)
    if (query) {
      list = list.filter((t) => {
        const hay = `${t.full_name} ${t.abbr} ${t.description || ""}`.toLowerCase();
        return hay.includes(query);
      });
    }

    // sorting
    list.sort((a, b) => {
      if (sort === "alpha") return a.full_name.localeCompare(b.full_name);
      if (sort === "count") return (b.book_count - a.book_count) || a.full_name.localeCompare(b.full_name);
      return (a.sort_order - b.sort_order) || a.full_name.localeCompare(b.full_name);
    });

    return list;
  }, [themes, q, sort, featuredAbbrSet]);

  if (loading) return <div className="zr-alert">Loading…</div>;

  if (err) {
    return (
      <div className="zr-alert zr-alert--error">
        {err}
        <div style={{ marginTop: 8, opacity: 0.8 }}>
          Tip: make sure your API exposes <b>/api/themes/summary</b> (and is connected to Postgres).
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="zr-hero">
        <div className="zr-hero__text">
          <h1>Book themes</h1>
          <p>Click a tile to open the list of books for that theme.</p>

          <div className="zr-toolbar">
            <input
              className="zr-input"
              placeholder="Search themes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <select className="zr-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="order">DB order</option>
              <option value="count">Most books</option>
              <option value="alpha">A–Z</option>
            </select>
          </div>

          {/* Featured tiles under search/select */}
          {featuredThemes.length ? (
            <div className="bt-featuredCard">
              <div className="bt-featuredTitle">Featured</div>
              <div className="bt-featuredGrid">
                {featuredThemes.map((t) => (
                  <button
                    key={`feat-${t.abbr}`}
                    type="button"
                    className="bt-featuredTile"
                    onClick={() => navigate(`/bookthemes/${encodeURIComponent(t.abbr)}`)}
                    title={t.description || t.full_name}
                  >
                    <img
                      className="bt-featuredImg"
                      src={t.image_path || TILE_FALLBACK_IMG}
                      alt={t.full_name}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.src = TILE_FALLBACK_IMG;
                      }}
                    />
                    <div className="bt-featuredOverlay" />
                    <div className="bt-featuredLabel">
                      <div className="bt-featuredName">{t.full_name}</div>
                      <div className="bt-featuredCount">{t.book_count}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="zr-hero__media">
          <img
            className="zr-heroImg"
            src={HERO_IMG_PRIMARY}
            alt="Bookshelf"
            onError={(e) => {
              e.currentTarget.src = HERO_IMG_FALLBACK;
            }}
          />

          <div className="zr-proof">
            <div className="zr-proof__title">Overview</div>
            <div className="zr-proof__row">
              <span>Themes</span>
              <strong>{themes.length}</strong>
            </div>
            <div className="zr-proof__row">
              <span>Tagged books (sum)</span>
              <strong>{totalTaggedBooks}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="zr-section">
        <div className="bt-grid">
          {tileModels.map((t) => (
            <button
              key={t.abbr}
              type="button"
              className="bt-tile"
              onClick={() => navigate(`/bookthemes/${encodeURIComponent(t.abbr)}`)}
              title={t.description || t.full_name}
            >
              <img
                className="bt-img"
                src={t.image_path || TILE_FALLBACK_IMG}
                alt={t.full_name}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.src = TILE_FALLBACK_IMG;
                }}
              />
              <div className="bt-overlay" />
              <div className="bt-content">
                <div className="bt-top">
                  <div className="bt-title">{t.full_name}</div>
                  <div className="bt-count">{t.book_count}</div>
                </div>
                {t.description ? <div className="bt-sub">{t.description}</div> : null}
                <div className="bt-cta">Show books →</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
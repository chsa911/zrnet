import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { listBooks } from "../api/books";
import { listThemesSummary } from "../api/themes";
import BergsteigenCard from "../components/themes/BergsteigenCard";
import "./BookThemesPage.css";

const HERO_IMG_PRIMARY = "/assets/images/allgemein/buecherschrank_ganz_offen.avif";
const HERO_IMG_FALLBACK = "/assets/images/allgemein/buecher_schrank.webp";
const TILE_FALLBACK_IMG = HERO_IMG_PRIMARY;

function norm(s) {
  return String(s || "").toLowerCase().trim();
}

export default function BookThemesPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [themes, setThemes] = useState([]); // from /api/themes/summary

  const [activeAbbr, setActiveAbbr] = useState(null);
  const [activeBooksRaw, setActiveBooksRaw] = useState([]);
  const [activeBooksLoading, setActiveBooksLoading] = useState(false);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("order"); // order | count | alpha
  const [bookQ, setBookQ] = useState("");

  // Load themes summary (fast: counts are computed server-side)
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
          .filter((t) => t?.abbr && t?.full_name)
          .map((t) => ({
            abbr: String(t.abbr).trim(),
            full_name: String(t.full_name).trim(),
            image_path: t.image_path ? String(t.image_path).trim() : "",
            description: t.description ? String(t.description).trim() : "",
            sort_order: Number.isFinite(Number(t.sort_order)) ? Number(t.sort_order) : 100,
            book_count: Number.isFinite(Number(t.book_count)) ? Number(t.book_count) : 0,
            top_titles: Array.isArray(t.top_titles) ? t.top_titles.filter(Boolean).slice(0, 3) : [],
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

  // Sync active theme with URL: /bookthemes?theme=bergsteigen
  useEffect(() => {
    if (!themes.length) return;

    const sp = new URLSearchParams(location.search || "");
    const themeParam = norm(sp.get("theme"));

    if (!themeParam) {
      // If URL has no theme, close the detail panel.
      if (activeAbbr) {
        setActiveAbbr(null);
        setBookQ("");
      }
      return;
    }

    const found = themes.find((t) => norm(t.abbr) === themeParam);
    if (found && found.abbr !== activeAbbr) {
      setActiveAbbr(found.abbr);
      setBookQ("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, themes]);

  async function fetchBooksForTheme(abbr) {
    // paginate /api/books?theme=...
    const all = [];
    const LIMIT = 200;
    let page = 1;
    let total = Infinity;

    while (all.length < total && page < 999) {
      const res = await listBooks({ page, limit: LIMIT, sortBy: "BEind", order: "desc", theme: abbr });
      const items = res?.items || [];
      total = Number(res?.total ?? total);
      all.push(...items);
      if (items.length < LIMIT) break;
      page += 1;
    }

    return all;
  }

  // Load books only for the active theme (no more downloading ALL books)
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!activeAbbr) {
        setActiveBooksRaw([]);
        return;
      }

      setActiveBooksLoading(true);
      try {
        const items = await fetchBooksForTheme(activeAbbr);
        if (!alive) return;
        setActiveBooksRaw(Array.isArray(items) ? items : []);
      } catch (e) {
        if (!alive) return;
        setActiveBooksRaw([]);
        // keep the themes grid visible, but show the error in the detail panel
        console.error("fetchBooksForTheme error", e);
      } finally {
        if (!alive) return;
        setActiveBooksLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [activeAbbr]);

  const totalTaggedBooks = useMemo(
    () => themes.reduce((sum, t) => sum + (Number.isFinite(t.book_count) ? t.book_count : 0), 0),
    [themes]
  );

  const tileModels = useMemo(() => {
    const query = q.trim().toLowerCase();

    let list = themes.slice();

    if (query) {
      list = list.filter((t) => {
        const hay = `${t.full_name} ${t.abbr} ${t.description || ""}`.toLowerCase();
        return hay.includes(query);
      });
    }

    list.sort((a, b) => {
      if (sort === "alpha") return a.full_name.localeCompare(b.full_name);
      if (sort === "count") return (b.book_count - a.book_count) || a.full_name.localeCompare(b.full_name);
      return (a.sort_order - b.sort_order) || a.full_name.localeCompare(b.full_name);
    });

    return list;
  }, [themes, q, sort]);

  const activeTheme = useMemo(() => {
    if (!activeAbbr) return null;
    return themes.find((t) => t.abbr === activeAbbr) || null;
  }, [activeAbbr, themes]);

  const activeBooks = useMemo(() => {
    const query = bookQ.trim().toLowerCase();
    if (!query) return activeBooksRaw;

    return activeBooksRaw.filter((b) => {
      const title = (b?.full_title || b?.title_display || b?.title_en || "").toLowerCase();
      const author = (b?.author_display || b?.BAutor || b?.author || "").toLowerCase();
      return `${title} ${author}`.includes(query);
    });
  }, [activeBooksRaw, bookQ]);

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
          <p>
            Tiles come from DB table <code>public.themes</code>. Counts are computed server-side.
          </p>

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
            <div className="zr-proof__note">
              Tip: set <code>themes.image_path</code> to show custom pictures per tile.
            </div>
          </div>
        </div>
      </section>

      <section className="zr-section">
        <div className="bt-layout">
          <aside className="bt-side">
            <BergsteigenCard />
            <div className="bt-sideTip">
              Lege dein Bild hier ab: <code>public/assets/images/themen/bergsteigen.avif</code>
            </div>
          </aside>

          <div className="bt-main">
            <div className="bt-grid">
              {tileModels.map((t) => {
                const isActive = activeAbbr === t.abbr;

                return (
                  <button
                    key={t.abbr}
                    type="button"
                    className={`bt-tile ${isActive ? "bt-tile--active" : ""}`}
                    onClick={() => {
                      setBookQ("");

                      if (isActive) {
                        setActiveAbbr(null);
                        navigate("/bookthemes", { replace: false });
                        return;
                      }

                      setActiveAbbr(t.abbr);
                      navigate(`/bookthemes?theme=${encodeURIComponent(t.abbr)}`, { replace: false });
                    }}
                  >
                    <img
                      className="bt-img"
                      src={t.image_path || TILE_FALLBACK_IMG}
                      alt=""
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

                      {t.top_titles?.length ? (
                        <div className="bt-sub" style={{ opacity: 0.95 }}>
                          {t.top_titles.map((name, idx) => (
                            <div key={`${t.abbr}-${idx}`} className="bt-mini" title={name || ""}
                            >
                              {name || "—"}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="bt-cta">{isActive ? "Hide list" : "Show books →"}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeTheme ? (
              <div className="zr-card bt-detail">
                <div className="bt-detail__head">
                  <div>
                    <div className="bt-detail__title">{activeTheme.full_name}</div>
                    <div className="bt-detail__meta">{activeTheme.book_count} books</div>
                  </div>
                  <button
                    className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                    onClick={() => {
                      setActiveAbbr(null);
                      navigate("/bookthemes", { replace: false });
                    }}
                    type="button"
                  >
                    Close
                  </button>
                </div>

                <div className="zr-toolbar" style={{ marginTop: 12 }}>
                  <input
                    className="zr-input"
                    placeholder="Search books in this theme…"
                    value={bookQ}
                    onChange={(e) => setBookQ(e.target.value)}
                  />
                </div>

                {activeBooksLoading ? <div className="zr-alert" style={{ marginTop: 12 }}>Loading books…</div> : null}

                <div className="bt-detail__list">
                  {activeBooks.map((b) => {
                    const authorName =
                      b?.author_display ||
                      b?.BAutor ||
                      b?.author_name_display ||
                      b?.author ||
                      "";

                    return (
                      <div key={b.id} className="bt-detail__item">
                        <div className="bt-detail__itemTitle">{b.title_display || "—"}</div>
                        <div className="bt-detail__itemAuthor">{authorName}</div>
                        {b.purchase_url ? (
                          <a href={b.purchase_url} target="_blank" rel="noreferrer">
                            Details
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                  {!activeBooksLoading && activeBooks.length === 0 ? (
                    <div className="zr-alert">No matching books.</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

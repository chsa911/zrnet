import React, { useEffect, useMemo, useState } from "react";
import { listBooks } from "../api/books";
import { listThemes } from "../api/themes";
import "./BookThemesPage.css";

const FALLBACK_IMG = "/assets/images/allgemein/buecherschrank_ganz_offen.avif";

function splitTokens(s) {
  return String(s || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

export default function BookThemesPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [themes, setThemes] = useState([]); // from DB table public.themes
  const [books, setBooks] = useState([]);   // from /api/books
  const [activeAbbr, setActiveAbbr] = useState(null);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("order"); // order | count | alpha

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");

      try {
        const [tRes, bRes] = await Promise.all([
          listThemes(),
          fetchAllBooks(),
        ]);

        if (!alive) return;

        const tItems = Array.isArray(tRes) ? tRes : (tRes?.items || tRes?.data || []);
        const cleanedThemes = (tItems || [])
          .filter(t => t?.abbr && t?.full_name)
          .map(t => ({
            abbr: t.abbr,
            full_name: t.full_name,
            image_path: t.image_path || "",
            description: t.description || "",
            sort_order: Number.isFinite(Number(t.sort_order)) ? Number(t.sort_order) : 100,
          }));

        setThemes(cleanedThemes);
        setBooks(bRes);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || String(e));
        setThemes([]);
        setBooks([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  async function fetchAllBooks() {
    // paginate /api/books
    const all = [];
    const LIMIT = 500;
    let page = 1;
    let total = Infinity;

    while (all.length < total && page < 999) {
      const res = await listBooks({ page, limit: LIMIT, sortBy: "registered_at", order: "desc" });
      const items = res?.items || [];
      total = Number(res?.total ?? total);
      all.push(...items);
      if (items.length < LIMIT) break;
      page += 1;
    }
    return all;
  }

  // build a quick lookup: themeAbbrLower -> books[]
  const booksByTheme = useMemo(() => {
    const map = new Map();
    const norm = (s) => String(s || "").toLowerCase();

    for (const t of themes) map.set(norm(t.abbr), []);

    for (const b of books) {
      const tokens = splitTokens(b?.themes);
      if (!tokens.length) continue;

      for (const tok of tokens) {
        const key = norm(tok);
        if (map.has(key)) map.get(key).push(b);
      }
    }
    return map;
  }, [themes, books]);

  const tileModels = useMemo(() => {
    const query = q.trim().toLowerCase();

    let list = themes.map(t => {
      const arr = booksByTheme.get(String(t.abbr).toLowerCase()) || [];
      return {
        ...t,
        count: arr.length,
        top: arr.slice(0, 3),
      };
    });

    if (query) {
      list = list.filter(t => {
        const hay = `${t.full_name} ${t.abbr} ${t.description}`.toLowerCase();
        return hay.includes(query);
      });
    }

    list.sort((a, b) => {
      if (sort === "alpha") return a.full_name.localeCompare(b.full_name);
      if (sort === "count") return (b.count - a.count) || a.full_name.localeCompare(b.full_name);
      // default: DB order
      return (a.sort_order - b.sort_order) || a.full_name.localeCompare(b.full_name);
    });

    return list;
  }, [themes, booksByTheme, q, sort]);

  const activeTheme = useMemo(() => {
    if (!activeAbbr) return null;
    return themes.find(t => t.abbr === activeAbbr) || null;
  }, [activeAbbr, themes]);

  const activeBooks = useMemo(() => {
    if (!activeTheme) return [];
    return booksByTheme.get(String(activeTheme.abbr).toLowerCase()) || [];
  }, [activeTheme, booksByTheme]);

  if (loading) return <div className="zr-alert">Loading…</div>;

  if (err) {
    return (
      <div className="zr-alert zr-alert--error">
        {err}
        <div style={{ marginTop: 8, opacity: 0.8 }}>
          Tip: make sure your API exposes <b>/api/themes</b> and returns JSON.
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="zr-hero">
        <div className="zr-hero__text">
          <h1>Book themes</h1>
          <p>Tiles come from DB table <code>public.themes</code>. Books are matched via <code>books.themes</code>.</p>

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
      </section>

      <section className="zr-section">
        <div className="bt-grid">
          {tileModels.map(t => {
            const isActive = activeAbbr === t.abbr;
            return (
              <button
                key={t.abbr}
                type="button"
                className={`bt-tile ${isActive ? "bt-tile--active" : ""}`}
                onClick={() => setActiveAbbr(isActive ? null : t.abbr)}
              >
                <img
                  className="bt-img"
                  src={t.image_path || FALLBACK_IMG}
                  alt=""
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                />
                <div className="bt-overlay" />
                <div className="bt-content">
                  <div className="bt-top">
                    <div className="bt-title">{t.full_name}</div>
                    <div className="bt-count">{t.count}</div>
                  </div>

                  {t.description ? <div className="bt-sub">{t.description}</div> : null}

                  <div className="bt-sub" style={{ opacity: 0.95 }}>
                    {t.top.map(b => (
                      <div key={b.id} className="bt-mini" title={b.full_title || ""}>
                        {b.full_title || "—"}
                      </div>
                    ))}
                  </div>

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
                <div className="bt-detail__meta">{activeBooks.length} books</div>
              </div>
              <button className="zr-btn2 zr-btn2--ghost zr-btn2--sm" onClick={() => setActiveAbbr(null)} type="button">
                Close
              </button>
            </div>

            <div className="bt-detail__list">
              {activeBooks.map(b => (
                <div key={b.id} className="bt-detail__item">
                  <div className="bt-detail__itemTitle">{b.full_title || "—"}</div>
                  <div className="bt-detail__itemAuthor">{b.author_display || ""}</div>
                  {b.purchase_url ? (
                    <a href={b.purchase_url} target="_blank" rel="noreferrer">Details</a>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}
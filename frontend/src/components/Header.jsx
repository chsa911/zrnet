// frontend/src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import "../styles/css/zr_header.css";
import { useI18n } from "../context/I18nContext";

function pick(obj, keys) {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) return v;
  }
  return null;
}

export default function Header({ year = 2026 }) {
  const { pathname } = useLocation();
  const showStats = pathname === "/";

  const { locale, setLocale, t, supported } = useI18n();

  const [stats, setStats] = useState({
    instock: "—",
    finished: "—",
    abandoned: "—",
    top: "—",
  });
  const [note, setNote] = useState(t("stats_loading"));
  const [error, setError] = useState("");

  // ✅ only change: make stat segments clickable
  const statsHref = (type) => `/stats/${type}?year=${encodeURIComponent(year)}`;
  const statLinkStyle = { textDecoration: "none", color: "inherit" };

  // Load icon sets once (optional)
  useEffect(() => {
    const ensureLink = (href) => {
      const existing = Array.from(document.querySelectorAll("link[rel='stylesheet']")).find(
        (l) => l.href === href || l.getAttribute("href") === href
      );
      if (existing) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    };

    ensureLink("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css");
    ensureLink("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css");
  }, []);

  // keep translated note when locale changes
  useEffect(() => {
    if (!showStats) return;
    if (!note && !error) return;

    if (!error) {
      if (note.includes("live") || note.includes("DB")) setNote(t("stats_live_db"));
      else setNote(t("stats_loading"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // Fetch stats
  useEffect(() => {
    if (!showStats) return;

    const ac = new AbortController();

    async function load() {
      setError("");
      setNote(t("stats_loading"));

      try {
        const resp = await fetch(`/api/public/books/stats?year=${encodeURIComponent(year)}`, {
          headers: { Accept: "application/json" },
          signal: ac.signal,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        const instock = pick(data, [
          "books_with_barcode",
          "booksWithBarcode",
          "barcodeCount",
          "barcode_count",
          "in_stock",
          "inStock",
          "instock",
        ]);

        const abandoned = pick(data, ["abandoned", "abandoned_count", "abandonedCount"]);
        const top = pick(data, ["top", "top_count", "topCount"]);

        let finished = pick(data, ["finished_books", "finishedBooks", "finishedBookCount", "finished_book_count"]);
        const finishedRaw = pick(data, ["finished", "finished_count", "finishedCount"]);
        if (finished == null && finishedRaw != null) {
          const n = Number(finishedRaw);
          finished = Number.isFinite(n) && n <= 600 ? n : null;
        }

        setStats({
          instock: instock == null ? "—" : String(instock),
          finished: finished == null ? "—" : String(finished),
          abandoned: abandoned == null ? "—" : String(abandoned),
          top: top == null ? "—" : String(top),
        });

        setNote(t("stats_live_db"));
      } catch (e) {
        if (ac.signal.aborted) return;
        setStats({ instock: "—", finished: "—", abandoned: "—", top: "—" });
        setNote("");
        setError(t("stats_error", { error: e?.message || String(e) }));
      }
    }

    load();
    return () => ac.abort();
  }, [showStats, year, t]);

  const navItems = [
    { to: "/ueber_mich.html", key: "nav_about" },
    { to: "/", key: "nav_home", end: true },
    { to: "/analytics", key: "nav_readingdiary" },
    { to: "/kontaktformular.html", key: "nav_contact" },
    { to: "/newsletter.html", key: "nav_newsletter" },
    { to: "/merchandise.html", key: "nav_shop" },
    { to: "/faq.html", key: "nav_faq" },
    { to: "/impressum.html", key: "nav_impressum" },
  ];

  return (
    <div className="zr-header-block">
      <div className="zr-top">
        <div className="zr-brand">
          <Link className="zr-logo" to="/">
            <img
              src="/assets/images/allgemein/logo.jpeg"
              alt="Zenreader logo"
              width="48"
              height="48"
              decoding="async"
              loading="eager"
            />
          </Link>
        </div>

        <form className="zr-search" action="/public/books/" method="get">
          <input type="text" name="q" placeholder={t("search_placeholder")} />
          <button type="submit" aria-label="Search">
            🔎
          </button>
        </form>

        <nav className="zr-nav" aria-label="Main navigation">
          {navItems.map((it, idx) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={!!it.end}
              className={`zr-btn ${idx % 2 === 0 ? "alt-a" : "alt-b"}`}
            >
              {t(it.key)}
            </NavLink>
          ))}

          <a className="zr-btn alt-b" href="https://admin.zenreader.net/">
            {t("nav_login")}
          </a>
          <a
            className="zr-btn zr-youtube"
            href="https://www.youtube.com/@zenreader2026"
            target="_blank"
            rel="noreferrer"
          >
            {t("nav_youtube")}
          </a>
          <a
            className="zr-btn zr-tiktok"
            href="https://www.tiktok.com/@zenreader26"
            target="_blank"
            rel="noreferrer"
          >
            {t("nav_tiktok")}
          </a>
          <a
            className="zr-btn alt-a zr-instagram"
            href="https://www.instagram.com/zenreader26/"
            target="_blank"
            rel="noreferrer"
          >
            {t("nav_instagram")}
          </a>
        </nav>

        <div className="zr-lang">
          <label className="zr-lang-label" htmlFor="zr-lang-select">
            {t("lang_label")}
          </label>
          <select
            id="zr-lang-select"
            className="zr-lang-select"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            aria-label={t("lang_label")}
          >
            {supported.map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showStats ? (
        <div className="zr-mid" aria-label="Header stats">
          <div className="zr-quote-under">{t("intro_quote")}</div>

          <div className="zr-stats" aria-label="Stats">
            <div className="zr-stats-head">
              <div className="zr-stats-title">
                {t("stats_books_in")} <span className="zr-year-badge">{year}</span>
              </div>
              <span className="zr-stats-note">{note}</span>
            </div>

            <div className="zr-stats-bar" role="group" aria-label="Stats">
              <Link to={statsHref("stock")} className="zr-stat-seg zr-stat-link" style={statLinkStyle}>
                <div className="zr-stat-label">{t("stats_in_stock")}</div>
                <div className="zr-stat-value">{stats.instock}</div>
              </Link>

              <Link to={statsHref("finished")} className="zr-stat-seg zr-stat-link" style={statLinkStyle}>
                <div className="zr-stat-label">{t("stats_finished")}</div>
                <div className="zr-stat-value">{stats.finished}</div>
              </Link>

              <Link to={statsHref("abandoned")} className="zr-stat-seg zr-stat-link" style={statLinkStyle}>
                <div className="zr-stat-label">{t("stats_abandoned")}</div>
                <div className="zr-stat-value">{stats.abandoned}</div>
              </Link>

              <Link to={statsHref("top")} className="zr-stat-seg zr-stat-link" style={statLinkStyle}>
                <div className="zr-stat-label">{t("stats_top")}</div>
                <div className="zr-stat-value">{stats.top}</div>
              </Link>
            </div>

            {error ? <div className="zr-stats-error">{error}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
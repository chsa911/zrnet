import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef } from "react";
import "./topbar.css";
import { useI18n } from "../context/I18nContext";

const LANGS = [
  { locale: "en", label: "EN", bg: "#00C27A", fg: "#0b1a12" }, // green (default)
  { locale: "de", label: "DE", bg: "#dc2626", fg: "#ffffff" }, // red
  { locale: "es", label: "ES", bg: "#facc15", fg: "#111827" }, // yellow
  { locale: "fr", label: "FR", bg: "#2563eb", fg: "#ffffff" }, // blue
  { locale: "pt-BR", label: "PT-BR", bg: "#000000", fg: "#ffffff" }, // black
];

function normalizeLocale(input) {
  const l = String(input || "").trim();
  if (!l) return "en";
  // treat any pt-* as pt-BR for now
  if (l.toLowerCase().startsWith("pt")) return "pt-BR";
  return l.includes("-") ? l.split("-")[0] : l;
}

function metaForLocale(locale) {
  const n = normalizeLocale(locale);
  return LANGS.find((x) => x.locale.toLowerCase() === n.toLowerCase()) || LANGS[0];
}

export default function TopBar() {
  const moreRef = useRef(null);
  const langRef = useRef(null);
  const { locale, setLocale } = useI18n();

  const activeLang = useMemo(() => metaForLocale(locale), [locale]);

  useEffect(() => {
    const onPointerDown = (e) => {
      const more = moreRef.current;
      if (more?.open && !more.contains(e.target)) more.open = false;

      const lang = langRef.current;
      if (lang?.open && !lang.contains(e.target)) lang.open = false;
    };

    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      const more = moreRef.current;
      if (more?.open) more.open = false;
      const lang = langRef.current;
      if (lang?.open) lang.open = false;
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const closeMore = () => {
    if (moreRef.current?.open) moreRef.current.open = false;
  };

  const closeLang = () => {
    if (langRef.current?.open) langRef.current.open = false;
  };

  const onPickLocale = (l) => {
    setLocale(l);
    closeLang();
  };

  return (
    <header className="zr-topbar">
      <div className="zr-topbar__inner">
        {/* LOGO LEFT */}
        <Link to="/" className="zr-brand" aria-label="ZenReader Home">
          PagesInLine
        </Link>

        {/* BUTTONS RIGHT */}
        <nav className="zr-nav" aria-label="Main navigation">
          <Link className="zr-nav__link" to="/technik.html">Technique</Link>
          <Link className="zr-nav__link" to="/analytics">Diary</Link>
          <Link className="zr-nav__link" to="/faq.html">FAQ</Link>

          {/* ALL OTHER PAGES UNDER "MORE" */}
          <details ref={moreRef} className="zr-more">
            <summary className="zr-nav__link">More</summary>

            <div
              className="zr-more__menu"
              role="menu"
              onClick={(e) => {
                // close when user clicks any menu item
                if (e.target.closest?.("a")) closeMore();
              }}
            >
              <Link to="/ueber_mich.html">About</Link>
             {/* <Link to="/newsletter.html">Newsletter</Link>
             // <Link to="/merchandise.html">Shop</Link>
             // <Link to="/kontaktformular.html">Contact</Link>*/}
              <Link to="/login">Admin / Login</Link>
              <Link to="/impressum.html">Imprint</Link>
            {/*  <Link to="/bookthemes">Book themes</Link> */}
              <Link to="/ausruestung.html">Equipment</Link>
              <Link to="/beschaffung.html">Getting books</Link>
              <Link to="/autoren_meistgelesen.html">Top authors</Link>
            </div>
          </details>

          {/* Language switcher (replaces Start button) */}
          <details ref={langRef} className="zr-langmenu">
            <summary
              className="zr-btn zr-langbtn"
              aria-label="Language"
              style={{ background: activeLang.bg, color: activeLang.fg }}
            >
              {activeLang.label}
            </summary>

            <div className="zr-langmenu__menu" role="menu">
              {LANGS.filter((l) => l.locale !== activeLang.locale).map((l) => (
                <button
                  key={l.locale}
                  type="button"
                  role="menuitem"
                  className="zr-langmenu__item"
                  onClick={() => onPickLocale(l.locale)}
                  style={{ background: l.bg, color: l.fg }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}
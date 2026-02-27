import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef } from "react";
import "./topbar.css";
import { useI18n } from "../context/I18nContext";

// Language "identity" colors (used as font + dot color in the dropdown,
// and as font color on the green button for non-EN).
// NOTE: Pure yellow text is hard to read on light backgrounds, so ES uses a darker gold.
const LANGS = [
  { locale: "en", label: "EN", accent: "#00C27A" }, // green (default)
  { locale: "de", label: "DE", accent: "#dc2626" }, // red
  { locale: "es", label: "ES", accent: "#B8860B" }, // golden yellow (legible)
  { locale: "fr", label: "FR", accent: "#2563eb" }, // blue
  { locale: "pt-BR", label: "PT-BR", accent: "#111111" }, // black
];

const BUTTON_BG = "#00C27A"; // keep button background always green (like the Start button)

function normalizeLocale(input) {
  const l = String(input || "").trim();
  if (!l) return "en";
  if (l.toLowerCase().startsWith("pt")) return "pt-BR";
  return l.includes("-") ? l.split("-")[0] : l;
}

function metaForLocale(locale) {
  const n = normalizeLocale(locale);
  return (
    LANGS.find((x) => x.locale.toLowerCase() === n.toLowerCase()) || LANGS[0]
  );
}

export default function TopBar() {
  const moreRef = useRef(null);
  const langRef = useRef(null);
  const { locale, setLocale, t } = useI18n();

  const activeLang = useMemo(() => metaForLocale(locale), [locale]);

  // Button font rule:
  // - EN => black on green
  // - otherwise => language accent color (PT-BR accent is already black)
  const buttonTextColor = useMemo(() => {
    const n = normalizeLocale(locale).toLowerCase();
    if (n === "en") return "#111111";
    return activeLang.accent;
  }, [locale, activeLang.accent]);

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
          <Link className="zr-nav__link" to="/info/technik">
            {t("nav_technique")}
          </Link>
          <Link className="zr-nav__link" to="/analytics">
            {t("nav_diary")}
          </Link>
          <Link className="zr-nav__link" to="/info/faq">
            {t("nav_faq")}
          </Link>

          {/* ALL OTHER PAGES UNDER "MORE" */}
          <details ref={moreRef} className="zr-more">
            <summary className="zr-nav__link">{t("nav_more")}</summary>

            <div
              className="zr-more__menu"
              role="menu"
              onClick={(e) => {
                if (e.target.closest?.("a")) closeMore();
              }}
            >
              <Link to="/info/ueber_mich">{t("nav_about")}</Link>
              <Link to="/login">{t("nav_admin_login")}</Link>
              <Link to="/info/impressum">{t("nav_impressum")}</Link>
              <Link to="/info/ausruestung">{t("nav_equipment")}</Link>
              <Link to="/info/beschaffung">{t("nav_getting_books")}</Link>
              <Link to="/bookthemes">{t("nav_bookthemes")}</Link>
              <Link to="/top-authors">{t("nav_top_authors")}</Link>
           <Link to="/authors">{t("nav_authors_overview")}</Link>
            </div>
          </details>

          {/* Language switcher (replaces Start button) */}
          <details ref={langRef} className="zr-langmenu">
            <summary
              className="zr-btn zr-langbtn"
              aria-label={t("lang_label")}
              style={{
                background: BUTTON_BG,
                color: buttonTextColor,
                borderColor: "rgba(0,0,0,0.12)",
              }}
            >
              <span
                className="zr-langdot"
                aria-hidden="true"
                style={{ background: buttonTextColor }}
              />
              {activeLang.label}
            </summary>

            <div className="zr-langmenu__menu" role="menu">
              {LANGS.map((l) => {
                const isActive =
                  l.locale.toLowerCase() === activeLang.locale.toLowerCase();

                return (
                  <button
                    key={l.locale}
                    type="button"
                    role="menuitem"
                    className={`zr-langmenu__item${isActive ? " is-active" : ""}`}
                    onClick={() => (isActive ? closeLang() : onPickLocale(l.locale))}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <span
                      className="zr-langdot"
                      aria-hidden="true"
                      style={{ background: l.accent }}
                    />
                    <span className="zr-langlabel" style={{ color: l.accent }}>
                      {l.label}
                    </span>
                    {isActive ? (
                      <span className="zr-langcheck" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}
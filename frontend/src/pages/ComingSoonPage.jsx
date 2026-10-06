import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { formatEta } from "../utils/comingSoon";
import "./home_minimal.css";

/**
 * Friendly placeholder for pages that are linked but not finished.
 * Used automatically for paths listed in utils/comingSoon.js, and as the 404 page (notFound).
 * Can also be rendered directly as a route element: <ComingSoonPage eta="2026-12" />
 */
export default function ComingSoonPage({ eta = null, titleKey = "", notFound = false }) {
  const { t, locale } = useI18n();
  const when = formatEta(eta, locale);

  const eyebrow = notFound ? t("coming_soon.nf_eyebrow") : t("coming_soon.eyebrow");
  const title = notFound
    ? t("coming_soon.nf_title")
    : (titleKey && t(titleKey) !== titleKey ? t(titleKey) : t("coming_soon.title"));
  const text = notFound
    ? t("coming_soon.nf_text")
    : when
      ? t("coming_soon.text_eta", { when })
      : t("coming_soon.text");

  return (
    <section className="zr-section" style={{ maxWidth: 720, margin: "48px auto", padding: "0 16px" }}>
      <div className="pil-visionBox" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="pil-eyebrow" style={{ alignSelf: "flex-start" }}>{eyebrow}</div>
        <h1 style={{ margin: 0 }}>{title}</h1>
        <p className="pil-lede" style={{ margin: 0 }}>{text}</p>
        {!notFound ? <p style={{ margin: 0 }}>{t("coming_soon.meanwhile")}</p> : null}
        <div className="pil-actions">
          <Link className="zr-btn2 zr-btn2--primary" to="/">
            {t("coming_soon.home")}
          </Link>
          <Link className="zr-btn2 zr-btn2--ghost" to="/titles">
            {t("home_cta_favorites")}
          </Link>
          {!notFound ? (
            <a className="zr-btn2 zr-btn2--ghost" href="mailto:christopher@christopherspages.com">
              {t("coming_soon.notify")}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
 
const SOCIALS = [
  { key: "nav_youtube", href: "https://www.youtube.com/@pagesinline" },
  { key: "nav_tiktok", href: "https://www.tiktok.com/@pagesinline" },
  { key: "nav_instagram", href: "https://www.instagram.com/zenreader26/" },
];

export default function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="zr-footer">
      <div className="zr-footer__inner">
        <div className="zr-footer__left">
          <div className="zr-footer__copy">© {year} ZenReader</div>
          <div className="zr-footer__disclaimer">
            <strong>{t("footer_disclaimer_label")}</strong> {t("footer_disclaimer_text")}
          </div>
        </div>

        <div className="zr-footer__right">
          <nav className="zr-footer__links" aria-label={t("footer_links_label")}>
            <Link to="/info/ueber_mich">{t("nav_about")}</Link>
            <Link to="/merch">{t("nav_shop")}</Link>
           {/* <Link to="/kontaktformular.html">{t("nav_contact")}</Link>*/}
            <Link to="/info/faq">{t("nav_faq")}</Link>
            <Link to="/info/impressum">{t("nav_impressum")}</Link>
          </nav>

          <nav className="zr-footer__social" aria-label={t("footer_social_label")}>
            {SOCIALS.map((s) => (
              <a key={s.key} href={s.href} target="_blank" rel="noreferrer noopener">
                {t(s.key)}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

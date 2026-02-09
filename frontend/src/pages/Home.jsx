import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

export default function Home() {
  const { t } = useI18n();

  const year = 2026;

  return (
    <>
      <section className="zr-hero">
        <div className="zr-hero__text">
          <h1>{t("home_hero_title")}</h1>
          <p>{t("home_hero_lede")}</p>

          <div className="zr-hero__ctas">
            <a className="zr-btn2 zr-btn2--primary" href="#start">
              {t("home_cta_start")}
            </a>
            <Link className="zr-btn2 zr-btn2--ghost" to="/technik.html">
              {t("home_cta_technique")}
            </Link>
          </div>

          <ul className="zr-bullets">
            <li>{t("home_bullet_1")}</li>
            <li>{t("home_bullet_2")}</li>
            <li>{t("home_bullet_3")}</li>
            <li>{t("home_bullet_4")}</li>
          </ul>
        </div>

        <div className="zr-hero__media">
          <img
            className="zr-heroImg"
            src="/assets/images/allgemein/hosentasche_link.jpeg"
            alt={t("home_img_alt_pocket")}
          />

          <div className="zr-proof">
            {/* Title (clickable -> stock authors) */}
            <Link className="zr-proof__title zr-proof__titleLink" to={`/stats/stock?year=${year}`}>
              {t("home_stats_title")}
            </Link>

            {/* In Stock -> most represented authors in store */}
            <Link className="zr-proof__row zr-proof__rowLink" to={`/stats/stock?year=${year}`}>
              <span>{t("home_stats_in_stock")}</span>
              <strong>2933</strong>
            </Link>

            {/* Finished (2026) -> finished books in 2026 */}
            <Link className="zr-proof__row zr-proof__rowLink" to={`/stats/finished?year=${year}`}>
              <span>{t("home_stats_finished_2026")}</span>
              <strong>15</strong>
            </Link>

            {/* Top (2026) -> top books in 2026 */}
            <Link className="zr-proof__row zr-proof__rowLink" to={`/stats/top?year=${year}`}>
              <span>{t("home_stats_top")}</span>
              <strong>11</strong>
            </Link>

            <div className="zr-proof__note">{t("home_stats_note")}</div>
          </div>
        </div>
      </section>

      <section className="zr-section">
        <h2>{t("home_how_title")}</h2>
        <ol className="zr-steps">
          <li>{t("home_how_1")}</li>
          <li>{t("home_how_2")}</li>
          <li>{t("home_how_3")}</li>
          <li>{t("home_how_4")}</li>
          <li>{t("home_how_5")}</li>
        </ol>
      </section>

      <section className="zr-section" id="start">
        <h2>{t("home_start_title")}</h2>
        <p className="zr-lede">{t("home_start_lede")}</p>

        <div className="zr-startbox">
          <div className="zr-startbox__step">
            <strong>1</strong> {t("home_start_step_1")}
          </div>
          <div className="zr-startbox__step">
            <strong>2</strong> {t("home_start_step_2")}
          </div>
          <div className="zr-startbox__step">
            <strong>3</strong> {t("home_start_step_3")}
          </div>
        </div>
      </section>
    </>
  );
}
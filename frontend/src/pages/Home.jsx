import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import "./home_minimal.css";

export default function Home() {
  const { t } = useI18n();
  const year = 2026;

  const FALLBACK_IMG = "/assets/images/allgemein/hosentasche_link.jpeg";

  const [hl, setHl] = useState(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/public/home-highlights", { signal: ac.signal });
        const data = await res.json();
        setHl(data);
      } catch {
        setHl(null);
      }
    })();
    return () => ac.abort();
  }, []);

  const finished = hl?.finished || {};
  const received = hl?.received || {};

  // Home teaser image preferred; fallback to full cover; fallback to pocket image
  const pickCover = (x) => x?.cover_home || x?.cover_full || x?.cover || FALLBACK_IMG;

  // Link to internal book page; only pass buy if present
  const buildLink = (x) => {
    if (!x?.id) return "/";
    const sp = new URLSearchParams();
    if (x.buy) sp.set("buy", x.buy);
    const qs = sp.toString();
    return `/book/${encodeURIComponent(x.id)}${qs ? `?${qs}` : ""}`;
  };

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

            <Link className="zr-btn2 zr-btn2--ghost" to="/info/technik">
              {t("home_cta_technique")}
            </Link>

            <Link className="zr-btn2 zr-btn2--ghost" to="/merch">
              {t("nav_shop")}
            </Link>

            {/** Admin / Login moved to Topbar → More **/}
          </div>

          <ul className="zr-bullets">
            <li>{t("home_bullet_1")}</li>
            <li>{t("home_bullet_2")}</li>
            <li>{t("home_bullet_3")}</li>
            <li>{t("home_bullet_4")}</li>
          </ul>
        </div>

        <div className="zr-hero__media">
          <img className="zr-heroImg" src={FALLBACK_IMG} alt={t("home_img_alt_pocket")} />

          <div className="zr-proof">
            <Link className="zr-proof__title zr-proof__titleLink" to={`/stats/stock?year=${year}`}>
              {t("home_stats_title")}
            </Link>

            <Link className="zr-proof__row zr-proof__rowLink" to={`/stats/stock?year=${year}`}>
              <span>{t("home_stats_in_stock")}</span>
              <strong>2933</strong>
            </Link>

            <Link className="zr-proof__row zr-proof__rowLink" to={`/stats/finished?year=${year}`}>
              <span>{t("home_stats_finished_2026")}</span>
              <strong>15</strong>
            </Link>

            <Link className="zr-proof__row zr-proof__rowLink" to={`/stats/top?year=${year}`}>
              <span>{t("home_stats_top")}</span>
              <strong>11</strong>
            </Link>

            <div className="zr-proof__note">{t("home_stats_note")}</div>
          </div>

          {/* ✅ Split highlights: Home uses teaser images */}
          <div className="zr-splitHighlight">
            <Link
              className="zr-splitHighlight__half zr-splitHighlight__half--left"
              to={buildLink(finished)}
              style={{
                backgroundImage: `url(${pickCover(finished)})`,
                backgroundSize: "cover", // teaser feel (adjust to taste)
                backgroundPosition: "center",
              }}
            >
              <div className="zr-splitHighlight__overlay zr-splitHighlight__overlay--top">
                <div className="zr-splitHighlight__badge">Top Finished</div>
                <div className="zr-splitHighlight__value">
                  <strong>{finished.authorNameDisplay || "—"}</strong>
                  <div>{finished.titleDisplay || "—"}</div>
                </div>
              </div>
            </Link>

            <Link
              className="zr-splitHighlight__half zr-splitHighlight__half--right"
              to={buildLink(received)}
              style={{
                backgroundImage: `url(${pickCover(received)})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="zr-splitHighlight__overlay zr-splitHighlight__overlay--top">
                <div className="zr-splitHighlight__badge">Top Received</div>
                <div className="zr-splitHighlight__value">
                  <strong>{received.authorNameDisplay || "—"}</strong>
                  <div>{received.titleDisplay || "—"}</div>
                </div>
              </div>
            </Link>
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

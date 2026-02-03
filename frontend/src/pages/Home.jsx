import React from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import "./HomeIntro.css";

export default function Home() {
  const { t } = useI18n();

  return (
    <div className="zr-home-content">
      <div className="zr-separator" />

      <section className="zr-intro" aria-label="Introduction">
        <p className="zr-lead">{t("intro_lead")}</p>

        <p className="zr-kicker">{t("intro_explore")}</p>

        <ul className="zr-links">
          <li>
            <span>{t("li1_prefix")} </span>
            <Link to="/technik.html">{t("li1_link")}</Link>
            <img src="/assets/images/allgemein/hosentasche_link.jpeg" alt={t("li1_img_alt")} />
          </li>

          <li>
            <span>{t("li2_prefix1")} </span>
            <Link to="/ausruestung.html">{t("li2_link_equipment")}</Link>
            <span> {t("li2_suffix1")} </span>
            <img src="/assets/images/allgemein/buecherschrank_link.jpeg" alt={t("li2_img1_alt")} />
            <span> {t("li2_mid")} </span>
            <a href="/entdeckungen/2024/oktober.html">{t("nav_home")}</a>
            <img src="/assets/images/allgemein/schatzkiste.jpeg" alt={t("li2_img2_alt")} />
          </li>

          <li>
            <span>{t("li3_prefix")} </span>
            <Link to="/autoren_meistgelesen.html">{t("li3_link_authors")}</Link>
            <span> {t("li3_suffix")}</span>
            <img src="/assets/images/allgemein/autoren_link.jpeg" alt={t("li3_img_alt")} />
          </li>

          <li>
            <span>{t("li4_prefix")} </span>
            <Link to="/links.html">{t("li4_link_sources")}</Link>
            <span> {t("li4_mid")} </span>
            <Link to="/beschaffung.html">{t("li4_link_books")}</Link>
          </li>

          <li>
            <span>{t("li5_prefix")} </span>
            <a href="https://podcasters.spotify.com/pod/show/chris-san1/episodes/mobile-reading-in-daily-live-e2qltnu">
              {t("li5_link_podcast")}
            </a>
            <span> {t("li5_mid")} </span>
            <a href="https://www.youtube.com/watch?v=GoRloM7Td5A&t=7s">
              {t("li5_link_bookdeckel")}
            </a>
          </li>
        </ul>

        <p className="zr-note" dangerouslySetInnerHTML={{ __html: t("note_html") }} />
      </section>

      <div className="zr-separator" />
    </div>
  );
}
import React from "react";
import { Link } from "react-router-dom";

import { useI18n } from "../context/I18nContext";
import "./CoachingPage.css";

export default function CoachingPage() {
  const { t } = useI18n();

  const audience = [
    t("coaching.audience_1"),
    t("coaching.audience_2"),
    t("coaching.audience_3"),
  ];

  const benefits = [
    t("coaching.benefit_1"),
    t("coaching.benefit_2"),
    t("coaching.benefit_3"),
  ];

  const features = [
    {
      tag: t("coaching.feature_1.tag"),
      title: t("coaching.feature_1.title"),
      text: t("coaching.feature_1.text"),
    },
    {
      tag: t("coaching.feature_2.tag"),
      title: t("coaching.feature_2.title"),
      text: t("coaching.feature_2.text"),
    },
    {
      tag: t("coaching.feature_3.tag"),
      title: t("coaching.feature_3.title"),
      text: t("coaching.feature_3.text"),
    },
  ];

  const mailHref = t("coaching.mail_href");

  return (
    <div className="coaching-page">
      <div className="coaching-shell">
        <section className="coaching-hero">
          <div className="coaching-hero__copy">
            <div className="coaching-badge">{t("coaching.badge")}</div>
            <h1>{t("coaching.title")}</h1>
            <p className="coaching-lede">{t("coaching.lede")}</p>

            <div className="coaching-actions">
              <a className="zr-btn2 zr-btn2--primary" href="#coaching-signup">
                {t("coaching.primary_cta")}
              </a>
              <a className="zr-btn2 zr-btn2--ghost" href="#coaching-features">
                {t("coaching.secondary_cta")}
              </a>
            </div>
          </div>

          <aside className="coaching-hero__aside">
            <div className="coaching-hero__asideLabel">{t("coaching.status_title")}</div>
            <p>{t("coaching.status_text")}</p>
          </aside>
        </section>

        <section className="coaching-grid coaching-grid--two">
          <article className="coaching-panel">
            <div className="coaching-panel__eyebrow">{t("coaching.benefits_eyebrow")}</div>
            <h2>{t("coaching.benefits_title")}</h2>
            <ul className="zr-bullets coaching-bullets">
              {benefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="coaching-panel">
            <div className="coaching-panel__eyebrow">{t("coaching.audience_eyebrow")}</div>
            <h2>{t("coaching.audience_title")}</h2>
            <ul className="zr-bullets coaching-bullets">
              {audience.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="coaching-section" id="coaching-features">
          <div className="coaching-section__head">
            <div className="coaching-panel__eyebrow">{t("coaching.features_eyebrow")}</div>
            <h2>{t("coaching.features_title")}</h2>
          </div>

          <div className="coaching-grid coaching-grid--three">
            {features.map((feature) => (
              <article className="coaching-panel coaching-panel--feature" key={feature.title}>
                <span className="coaching-featureTag">{feature.tag}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="coaching-cta" id="coaching-signup">
          <div className="coaching-cta__copy">
            <div className="coaching-panel__eyebrow">{t("coaching.cta_eyebrow")}</div>
            <h2>{t("coaching.signup_title")}</h2>
            <p>{t("coaching.signup_text")}</p>
          </div>

          <div className="coaching-cta__actions">
            <div className="coaching-cta__mail">Christopher@pagesinline.com</div>
            <a className="zr-btn2 zr-btn2--primary" href={mailHref}>
              {t("coaching.mail_label")}
            </a>
            <Link className="zr-btn2 zr-btn2--ghost" to="/">
              {t("coaching.back_home")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

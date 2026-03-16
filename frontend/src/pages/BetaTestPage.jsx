import React from "react";
import { Link } from "react-router-dom";

import { useI18n } from "../context/I18nContext";
import "./BetaTestPage.css";

export default function BetaTestPage() {
  const { t } = useI18n();

  const audience = [
    t("beta.audience_1"),
    t("beta.audience_2"),
    t("beta.audience_3"),
  ];

  const benefits = [
    t("beta.benefit_1"),
    t("beta.benefit_2"),
    t("beta.benefit_3"),
  ];

  const features = [
    {
      tag: t("beta.feature_1.tag"),
      title: t("beta.feature_1.title"),
      text: t("beta.feature_1.text"),
    },
    {
      tag: t("beta.feature_2.tag"),
      title: t("beta.feature_2.title"),
      text: t("beta.feature_2.text"),
    },
    {
      tag: t("beta.feature_3.tag"),
      title: t("beta.feature_3.title"),
      text: t("beta.feature_3.text"),
    },
  ];

  const mailHref = t("beta.mail_href");

  return (
    <div className="beta-page">
      <div className="beta-shell">
        <section className="beta-hero">
          <div className="beta-hero__copy">
            <div className="beta-badge">{t("beta.badge")}</div>
            <h1>{t("beta.title")}</h1>
            <p className="beta-lede">{t("beta.lede")}</p>

            <div className="beta-actions">
              <a className="zr-btn2 zr-btn2--primary" href="#beta-signup">
                {t("beta.primary_cta")}
              </a>
              <a className="zr-btn2 zr-btn2--ghost" href="#beta-features">
                {t("beta.secondary_cta")}
              </a>
            </div>
          </div>

          <aside className="beta-hero__aside">
            <div className="beta-hero__asideLabel">{t("beta.status_title")}</div>
            <p>{t("beta.status_text")}</p>
          </aside>
        </section>

        <section className="beta-grid beta-grid--two">
          <article className="beta-panel">
            <div className="beta-panel__eyebrow">{t("beta.benefits_eyebrow")}</div>
            <h2>{t("beta.benefits_title")}</h2>
            <ul className="zr-bullets beta-bullets">
              {benefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="beta-panel">
            <div className="beta-panel__eyebrow">{t("beta.audience_eyebrow")}</div>
            <h2>{t("beta.audience_title")}</h2>
            <ul className="zr-bullets beta-bullets">
              {audience.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="beta-section" id="beta-features">
          <div className="beta-section__head">
            <div className="beta-panel__eyebrow">{t("beta.features_eyebrow")}</div>
            <h2>{t("beta.features_title")}</h2>
          </div>

          <div className="beta-grid beta-grid--three">
            {features.map((feature) => (
              <article className="beta-panel beta-panel--feature" key={feature.title}>
                <span className="beta-featureTag">{feature.tag}</span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="beta-cta" id="beta-signup">
          <div className="beta-cta__copy">
            <div className="beta-panel__eyebrow">{t("beta.cta_eyebrow")}</div>
            <h2>{t("beta.signup_title")}</h2>
            <p>{t("beta.signup_text")}</p>
          </div>

          <div className="beta-cta__actions">
            <div className="beta-cta__mail">christian@pagesinline.com</div>
            <a className="zr-btn2 zr-btn2--primary" href={mailHref}>
              {t("beta.mail_label")}
            </a>
            <Link className="zr-btn2 zr-btn2--ghost" to="/">
              {t("beta.back_home")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

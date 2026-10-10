import React, { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

import { useI18n } from "../context/I18nContext";
import NEWS from "../data/news";
import "./NewsPage.css";
import { useSeo } from "../utils/seo";

function pickLocale(entry, locale) {
  return entry[locale] || entry[String(locale || "").split("-")[0]] || entry.en || entry.de || {};
}

function formatDate(iso, locale) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale || "de", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

export default function NewsPage() {
  const { t, locale } = useI18n();
  const { hash } = useLocation();
  useSeo({ title: t("news.title"), path: "/news" });

  const items = useMemo(
    () =>
      [...NEWS]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .map((entry) => ({ ...entry, copy: pickLocale(entry, locale) })),
    [locale]
  );

  // Jump to /news#<id> after render (links from other pages).
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  return (
    <div className="news-page">
      <div className="news-shell">
        <section className="news-hero">
          <div className="news-badge">{t("news.badge")}</div>
          <h1>{t("news.title")}</h1>
          <p className="news-lede">{t("news.lede")}</p>
        </section>

        <section className="news-list" aria-label={t("news.title")}>
          {items.length === 0 ? (
            <p className="news-empty">{t("news.empty")}</p>
          ) : (
            items.map(({ id, date, link, copy }) => {
              const paragraphs = Array.isArray(copy.text) ? copy.text : [copy.text].filter(Boolean);
              return (
                <article className="news-item" id={id} key={id}>
                  <div className="news-item__meta">
                    <time dateTime={date}>{formatDate(date, locale)}</time>
                    {copy.tag ? <span className="news-tag">{copy.tag}</span> : null}
                  </div>
                  <h2>{copy.title}</h2>
                  {paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                  {link && copy.linkLabel ? (
                    <div className="news-item__actions">
                      {link.to ? (
                        <Link className="zr-btn2 zr-btn2--ghost" to={link.to}>
                          {copy.linkLabel}
                        </Link>
                      ) : (
                        <a className="zr-btn2 zr-btn2--ghost" href={link.href}>
                          {copy.linkLabel}
                        </a>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>

        <section className="news-cta">
          <div className="news-cta__copy">
            <h2>{t("news.cta_title")}</h2>
            <p>{t("news.cta_text")}</p>
          </div>
          <div className="news-cta__actions">
            <a
              className="zr-btn2 zr-btn2--primary"
              href="mailto:christopher@christopherspages.com?subject=Christophers%20Pages%20News"
            >
              {t("news.mail_label")}
            </a>
            <Link className="zr-btn2 zr-btn2--ghost" to="/">
              {t("news.back_home")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

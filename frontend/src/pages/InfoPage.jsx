import React from "react";
import { Link, Navigate, useParams } from "react-router-dom";

import { useI18n } from "../context/I18nContext";
import { INFO_PAGES } from "./infoPages";
import "./InfoPage.css";

function Block({ block, t }) {
  switch (block.type) {
    case "lede":
      return <p className="zr-info__lede">{t(block.key)}</p>;
    case "p":
      return <p className="zr-info__p">{t(block.key)}</p>;
    case "callout":
      return <div className="zr-info__callout">{t(block.key)}</div>;
    case "h2":
      return <h2 className="zr-info__h2">{t(block.key)}</h2>;
    case "img":
      return (
        <figure className="zr-info__figure">
          <img className="zr-info__img" src={block.src} alt={t(block.altKey)} />
          {block.captionKey ? (
            <figcaption className="zr-info__caption">{t(block.captionKey)}</figcaption>
          ) : null}
        </figure>
      );
    case "lines":
      return (
        <div className="zr-info__lines">
          {block.keys.map((k) => (
            <div key={k}>{t(k)}</div>
          ))}
        </div>
      );
    case "cards":
      return (
        <div className="zr-info__grid zr-info__grid--cards">
          {block.items.map((item) => (
            <article key={item.titleKey} className="zr-info__panel">
              {item.eyebrowKey ? <div className="zr-info__panelEyebrow">{t(item.eyebrowKey)}</div> : null}
              <h2 className="zr-info__panelTitle">{t(item.titleKey)}</h2>
              <p className="zr-info__panelText">{t(item.textKey)}</p>
            </article>
          ))}
        </div>
      );
    case "qa":
      return (
        <div className="zr-info__grid zr-info__grid--faq">
          {block.items.map((it) => (
            <article key={it.qKey} className="zr-info__qaItem">
              <h2 className="zr-info__q">{t(it.qKey)}</h2>
              <p className="zr-info__a">{t(it.aKey)}</p>
            </article>
          ))}
        </div>
      );
    case "actions":
      return (
        <div className="zr-info__actions">
          {block.items.map((a) => (
            <Link key={a.to} to={a.to} className="zr-info__btn">
              {t(a.labelKey)}
            </Link>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export default function InfoPage() {
  const { slug } = useParams();
  const { t } = useI18n();

  const resolvedSlug = slug === "so-funktionierts" ? "technik" : slug;
const page = INFO_PAGES[resolvedSlug];
if (!page) return <Navigate to="/" replace />;
  const isLegal = resolvedSlug === "impressum" || resolvedSlug === "datenschutz";
  if (isLegal) {
    return (
      <div className={`zr-info zr-info--${slug}`}>
        <div className="zr-info__card">
          <h1 className="zr-info__title">{t(page.titleKey)}</h1>

          <div className="zr-info__content">
            {page.blocks.map((b, i) => (
              <Block key={i} block={b} t={t} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`zr-info zr-info--${slug}`}>
      <div className="zr-info__shell">
        <section className="zr-infoHero">
          <div className="zr-infoHero__copy">
            {page.eyebrowKey ? <div className="zr-infoBadge">{t(page.eyebrowKey)}</div> : null}
            <h1 className="zr-infoHero__title">{t(page.titleKey)}</h1>
            {page.ledeKey ? <p className="zr-infoHero__lede">{t(page.ledeKey)}</p> : null}
          </div>

          {page.sideNoteKey ? (
            <aside className="zr-infoHero__aside">
              {page.sideLabelKey ? (
                <div className="zr-infoHero__asideLabel">{t(page.sideLabelKey)}</div>
              ) : null}
              <p>{t(page.sideNoteKey)}</p>
            </aside>
          ) : null}
        </section>

        <div className="zr-info__content">
          {page.blocks.map((b, i) => (
            <Block key={i} block={b} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}

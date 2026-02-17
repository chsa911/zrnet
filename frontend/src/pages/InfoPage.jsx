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
    case "qa":
      return (
        <div className="zr-info__qa">
          {block.items.map((it, idx) => (
            <div key={idx} className="zr-info__qaItem">
              <div className="zr-info__q">{t(it.qKey)}</div>
              <div className="zr-info__a">{t(it.aKey)}</div>
            </div>
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

  const page = INFO_PAGES[slug];
  if (!page) return <Navigate to="/" replace />;

  return (
    <div className="zr-info">
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

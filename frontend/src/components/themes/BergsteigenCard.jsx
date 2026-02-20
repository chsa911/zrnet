import React from "react";
import { Link } from "react-router-dom";
import "./BergsteigenCard.css";

const DEFAULT_IMG = "/assets/images/themen/bergsteigen.avif";
const FALLBACK_IMG = "/assets/images/allgemein/buecherschrank_link.avif";

export default function BergsteigenCard({ theme }) {
  const abbr = theme?.abbr ?? "bergsteigen";
  const title = theme?.full_name ?? "Bergsteigen";
  const img = theme?.image_path ?? DEFAULT_IMG;

  return (
    <Link
      to={`/bookthemes?theme=${encodeURIComponent(abbr)}`}
      className="berg-card"
      aria-label={`Open theme ${title}`}
    >
      <div className="berg-card__media" aria-hidden="true">
        <img
          className="berg-card__img"
          src={img}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => (e.currentTarget.src = FALLBACK_IMG)}
        />
        <div className="berg-card__overlay" />
      </div>

      <div className="berg-card__body">
        <div className="berg-card__kicker">Theme</div>
        <div className="berg-card__title">{title}</div>
        <div className="berg-card__cta">Alle Bücher anzeigen →</div>
      </div>
    </Link>
  );
}
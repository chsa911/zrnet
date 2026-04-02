import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import "./home_minimal.css";

function toIntOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function HighlightCard({ item, label, to, pickCover, fallbackImg }) {
  const [imgSrc, setImgSrc] = useState(pickCover(item));

  useEffect(() => {
    setImgSrc(pickCover(item));
  }, [item, pickCover]);

  return (
    <Link className="zr-splitHighlight__half" to={to}>
      <div className="zr-splitHighlight__copy">
        <div className="zr-splitHighlight__badge">{label}</div>

        <div className="zr-splitHighlight__value">
          <strong>{item?.authorNameDisplay || "—"}</strong>
          <div>{item?.titleDisplay || "—"}</div>
        </div>
      </div>

      <div className="zr-splitHighlight__art">
        <img
          src={imgSrc}
          alt={item?.titleDisplay || item?.authorNameDisplay || ""}
          loading="lazy"
          onError={() => {
            if (imgSrc !== fallbackImg) setImgSrc(fallbackImg);
          }}
        />
      </div>
    </Link>
  );
}

export default function Home() {
  const { t } = useI18n();
  const year = 2026;
  const FALLBACK_IMG = "/assets/images/allgemein/hosentasche_link.jpeg";

  const [hl, setHl] = useState(null);
  const [stats, setStats] = useState({
    in_stock: null,
    finished: null,
    top: null,
  });

  const heroParagraphs = useMemo(
    () => [t("home_hero_p1"), t("home_hero_p2"), t("home_hero_p3")].filter(Boolean),
    [t]
  );

  const bullets = useMemo(
    () =>
      [
        t("home_bullet_1"),
        t("home_bullet_2"),
        t("home_bullet_3"),
        t("home_bullet_4"),
      ].filter(Boolean),
    [t]
  );

  const proofStats = useMemo(
    () => [
      {
        key: "in_stock",
        label: t("home_proof_in_stock_label"),
        meta: t("home_proof_in_stock_meta"),
        to: "/stats/stock",
      },
      {
        key: "finished",
        label: t("home_proof_finished_label"),
        meta: t("home_proof_finished_meta"),
        to: "/stats/finished",
      },
      {
        key: "top",
        label: t("home_proof_top_label"),
        meta: t("home_proof_top_meta"),
        to: "/stats/top",
      },
    ],
    [t]
  );

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/public/home-highlights", {
          signal: ac.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setHl(data);
      } catch {
        setHl(null);
      }
    })();

    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();

    async function load() {
      try {
        const res = await fetch(`/api/public/books/stats?year=${year}&_=${Date.now()}`, {
          signal: ac.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setStats({
          in_stock: toIntOrNull(data.in_stock ?? data.inStock ?? data.instock ?? data.stock),
          finished: toIntOrNull(data.finished ?? data.finished_books ?? data.finishedBooks),
          top: toIntOrNull(data.top ?? data.top_books ?? data.topBooks),
        });
      } catch {
        // keep previous values
      }
    }

    load();
    const id = setInterval(load, 60_000);

    return () => {
      clearInterval(id);
      ac.abort();
    };
  }, [year]);

  const finished = hl?.finished || {};
  const received = hl?.received || {};

  const pickCover = useMemo(
    () => (x) => x?.cover_home || x?.cover_full || x?.cover || FALLBACK_IMG,
    [FALLBACK_IMG]
  );

  const buildLink = (x) => {
    if (!x?.id) return "/";
    const sp = new URLSearchParams();
    if (x.buy) sp.set("buy", x.buy);
    const qs = sp.toString();
    return `/book/${encodeURIComponent(x.id)}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <section className="pil-hero">
        <div className="pil-hero__content">
          <div className="pil-eyebrow">{t("home_eyebrow")}</div>
          <h1>{t("home_title")}</h1>

          <div className="pil-heroText">
            {heroParagraphs.map((text, index) => (
              <p key={`${index}-${text}`} className={index === 0 ? "pil-lede" : undefined}>
                {text}
              </p>
            ))}
          </div>

          <div className="pil-actions">
            <Link className="zr-btn2 zr-btn2--primary" to="/beta-test#beta-signup">
              {t("home_secondary_cta")}
            </Link>
          </div>

          <ul className="zr-bullets pil-bullets">
            {bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="pil-hero__media">
          <img className="pil-hero__image" src={FALLBACK_IMG} alt={t("home_hero_image_alt")} />
        </div>
      </section>

      <section className="pil-proofStrip" aria-label={t("home_proof_title")}>
        <div className="pil-proofStrip__head">
          <div className="pil-eyebrow pil-eyebrow--muted">{t("home_proof_label")}</div>
          <h2>{t("home_proof_title")}</h2>
        </div>

        <div className="pil-proofGrid">
          {proofStats.map((item) => (
            <div key={item.key} className="pil-proofCard" aria-label={item.label}>
              <span className="pil-proofCard__label">{item.label}</span>
              {item.meta ? <span className="pil-proofCard__meta">{item.meta}</span> : null}
              <strong className="pil-proofCard__value">{stats[item.key] ?? "—"}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="zr-section pil-highlights">
        <div className="pil-sectionHead">
          <div className="pil-eyebrow pil-eyebrow--muted">{t("home_highlight_title")}</div>
        </div>

        <div className="zr-splitHighlight">
          <HighlightCard
            item={finished}
            label={t("home_highlight_left")}
            to={buildLink(finished)}
            pickCover={pickCover}
            fallbackImg={FALLBACK_IMG}
          />

          <HighlightCard
            item={received}
            label={t("home_highlight_right")}
            to={buildLink(received)}
            pickCover={pickCover}
            fallbackImg={FALLBACK_IMG}
          />
        </div>
      </section>
    </>
  );
}
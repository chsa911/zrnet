import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { apiUrl } from "../api/apiRoot";
import "./home_minimal.css";
import HomeLiveBlock from "../components/HomeLiveBlock";
import { coverHomeUrl } from "../utils/covers";
import { useSeo } from "../utils/seo";

function toIntOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function HighlightCard({ item, label, to, bgImage, left = false }) {
  return (
    <Link
      className={`zr-splitHighlight__half ${left ? "zr-splitHighlight__half--left" : ""}`}
      to={to}
      style={bgImage ? { backgroundImage: `url(${bgImage})` } : undefined}
    >
      <div className="zr-splitHighlight__overlay zr-splitHighlight__overlay--top">
        <div className="zr-splitHighlight__badge">{label}</div>

        <div className="zr-splitHighlight__value">
          <strong>{item?.authorNameDisplay || "—"}</strong>
          <div>{item?.titleDisplay || "—"}</div>
        </div>
      </div>
    </Link>
  );
}
export default function Home() {
  const { t, locale } = useI18n();
  useSeo({
    title: t("seo.home.title"),
    description: t("seo.home.desc"),
    path: "/", // also used by /youtube and /tiktok
    image: "/assets/images/allgemein/hosentasche_link.jpeg",
  });
  const year = 2026;
  const HERO_IMG = "/assets/images/allgemein/hosentasche_link.jpeg";
  const HIGHLIGHT_FALLBACK = "";

  const [hl, setHl] = useState(null);
  const [stats, setStats] = useState({
    total_books: null,
    finished: null,
    abandoned: null,
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

  // Story + 3-R sections stay hidden until their texts are filled in the i18n files
  // (home_story_p2 / home_3r_1_title … home_3r_3_text), so no placeholders go live.
  const storyParagraphs = useMemo(
    () => [t("home_story_p1"), t("home_story_p2"), t("home_story_p3")].filter(Boolean),
    [t]
  );
  const showStory = Boolean(t("home_story_p2"));

  const threeR = useMemo(
    () =>
      [1, 2, 3].map((n) => ({
        no: `R${n}`,
        title: t(`home_3r_${n}_title`),
        text: t(`home_3r_${n}_text`),
      })),
    [t]
  );
  const showThreeR = threeR.every((r) => r.title && r.text);

  const proofStats = useMemo(
    () => [
      {
        key: "total_books",
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
        key: "abandoned",
        label: t("home_proof_abandoned_label"),
        meta: t("home_proof_abandoned_meta"),
        to: "/stats/abandoned",
      },
    ],
    [t]
  );

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch(apiUrl(`/public/home-highlights?lang=${encodeURIComponent(locale || "")}`), {
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
  }, [locale]);

  useEffect(() => {
    const ac = new AbortController();

    async function load() {
      try {
        const res = await fetch(apiUrl(`/public/books/stats?year=${year}&_=${Date.now()}`), {
          signal: ac.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setStats({
          total_books: toIntOrNull(
            data.total_books ??
              data.totalBooks ??
              data.registered ??
              data.total ??
              data.books_total ??
              data.in_stock ??
              data.inStock ??
              data.instock ??
              data.stock
          ),
          finished: toIntOrNull(data.finished ?? data.finished_books ?? data.finishedBooks),
          abandoned: toIntOrNull(data.abandoned ?? data.abandoned_books ?? data.abandonedBooks),
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
  () => (x) => coverHomeUrl(x) || HIGHLIGHT_FALLBACK,
  []
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
            <Link className="zr-btn2 zr-btn2--primary" to="/titles">
              {t("home_cta_favorites")}
            </Link>
            {showThreeR ? (
              <a className="zr-btn2 zr-btn2--ghost" href="#technik">
                {t("home_cta_technique")}
              </a>
            ) : (
              <Link className="zr-btn2 zr-btn2--ghost" to="/info/so-funktionierts">
                {t("home_cta_technique")}
              </Link>
            )}
            <Link className="zr-btn2 zr-btn2--ghost" to="/news#testzugang">
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
          <img className="pil-hero__image" src={HERO_IMG} alt={t("home_hero_image_alt")} />
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

      {showStory ? (
        <section className="zr-section" id="geschichte">
          <div className="pil-sectionHead">
            <div className="pil-eyebrow pil-eyebrow--muted">{t("home_story_eyebrow")}</div>
            <h2>{t("home_story_title")}</h2>
          </div>
          <div className="pil-heroText">
            {storyParagraphs.map((text, index) => (
              <p key={`${index}-${text}`}>{text}</p>
            ))}
          </div>
        </section>
      ) : null}

      {showThreeR ? (
        <section className="zr-section" id="technik">
          <div className="pil-sectionHead">
            <div className="pil-eyebrow pil-eyebrow--muted">{t("home_3r_eyebrow")}</div>
            <h2>{t("home_3r_title")}</h2>
            <p className="pil-lede">{t("home_3r_lede")}</p>
          </div>
          <div className="pil-grid pil-grid--three">
            {threeR.map((r) => (
              <article key={r.no} className="pil-card pil-card--step">
                <span className="pil-stepNo">{r.no}</span>
                <h3>{r.title}</h3>
                <p>{r.text}</p>
              </article>
            ))}
          </div>
          <div className="pil-actions">
            <Link className="zr-btn2 zr-btn2--primary" to="/coaching">
              {t("home_3r_cta")}
            </Link>
            <span>{t("home_3r_cta_note")}</span>
          </div>
        </section>
      ) : null}

      <section className="zr-section pil-highlights">
        <div className="pil-sectionHead pil-sectionHead--split">
  <div className="pil-eyebrow pil-eyebrow--muted">
    {t("home_highlight_title")}
  </div>

  <Link className="pil-historyLink" to="/titles">
    Highlight History
  </Link>
</div>

<div className="pil-proofStrip__head">
  <h2>{t("home_highlight_heading")}</h2>
</div>

<div className="zr-splitHighlight">
  <HighlightCard
    item={finished}
    label={t("home_highlight_left")}
    to={buildLink(finished)}
    bgImage={pickCover(finished)}
    left
  />

  <HighlightCard
    item={received}
    label={t("home_highlight_right")}
    to={buildLink(received)}
    bgImage={pickCover(received)}
  />
</div>
      </section>

      <section className="zr-section" id="sammlung">
        <div className="pil-visionBox">
          <div className="pil-eyebrow pil-eyebrow--muted">{t("home_collection_eyebrow")}</div>
          <h2>{t("home_collection_title")}</h2>
          <p>{t("home_collection_text")}</p>
          <div className="pil-actions">
            <Link className="zr-btn2 zr-btn2--primary" to="/collection">
              {t("home_collection_cta")}
            </Link>
          </div>
        </div>
      </section>

      <section className="zr-section" id="kontakt">
        <div className="pil-sectionHead">
          <h2>{t("home_contact_title")}</h2>
          <p className="pil-lede">{t("home_contact_text")}</p>
        </div>
        <div className="pil-actions">
          <a className="zr-btn2 zr-btn2--primary" href="mailto:christopher@christopherspages.com">
            {t("home_contact_cta")}
          </a>
          <a className="zr-btn2 zr-btn2--ghost" href="https://www.youtube.com/@pagesinline" target="_blank" rel="noreferrer">
            YouTube
          </a>
          <a className="zr-btn2 zr-btn2--ghost" href="https://www.tiktok.com/@christopherspages" target="_blank" rel="noreferrer">
            TikTok
          </a>
        </div>
      </section>
    </>
  );
}

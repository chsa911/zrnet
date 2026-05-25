import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { apiUrl } from "../api/apiRoot";

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

export default function HomeLiveBlock() {
  const { t } = useI18n();
  const year = 2026;
  const HIGHLIGHT_FALLBACK = "";

  const [hl, setHl] = useState(null);
  const [stats, setStats] = useState({
    total_books: null,
    finished: null,
    top: null,
  });

  const proofStats = useMemo(
    () => [
      {
        key: "total_books",
        label: t("home_proof_in_stock_label"),
        meta: t("home_proof_in_stock_meta"),
      },
      {
        key: "finished",
        label: t("home_proof_finished_label"),
        meta: t("home_proof_finished_meta"),
      },
      {
        key: "top",
        label: t("home_proof_top_label"),
        meta: t("home_proof_top_meta"),
      },
    ],
    [t]
  );

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch(apiUrl("/public/home-highlights"), {
          signal: ac.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setHl(await res.json());
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
    () => (x) => x?.cover_home || x?.cover_full || x?.cover || HIGHLIGHT_FALLBACK,
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
    </>
  );
}
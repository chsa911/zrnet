// frontend/src/pages/ReadingDiaryPage.jsx
// Öffentliche Seite "Lesetagebuch": Wochenzahlen live aus der Datenbank.
// Daten: GET /api/public/books/reading-diary?weeks=12 (Woche = Mo–So, Europe/Berlin)
import React, { useEffect, useState } from "react";
import { getReadingDiary } from "../api/books";
import { useI18n } from "../context/I18nContext";
import { useSeo } from "../utils/seo";
import "./home_minimal.css";
import "./ReadingDiaryPage.css";

const WEEKS = 12;

// Reihenfolge der Kacheln und Tabellenspalten
const METRICS = [
  ["finished", "rd_finished"],
];

// "2026-10-12" als lokales Datum (ohne Zeitzonen-Verschiebung)
function parseDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export default function ReadingDiaryPage() {
  const { t, locale } = useI18n();
  useSeo({ title: t("rd_title"), description: t("rd_lede"), path: "/reading-diary" });

  const [weeks, setWeeks] = useState([]);
  const [sel, setSel] = useState(0); // 0 = aktuelle Woche
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErr("");
    getReadingDiary({ weeks: WEEKS, signal: ac.signal })
      .then((items) => {
        if (!ac.signal.aborted) setWeeks(items);
      })
      .catch((e) => {
        if (!ac.signal.aborted) setErr(e?.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  const fmtNum = (n) =>
    n === null || n === undefined || !Number.isFinite(Number(n))
      ? "–"
      : new Intl.NumberFormat(locale || "de").format(Number(n));

  const fmtRange = (w) => {
    const a = parseDay(w?.week_start);
    const b = parseDay(w?.week_end);
    if (!a || !b) return "";
    try {
      const f = new Intl.DateTimeFormat(locale || "de", { day: "numeric", month: "short" });
      return f.formatRange ? f.formatRange(a, b) : `${f.format(a)} – ${f.format(b)}`;
    } catch {
      return `${w.week_start} – ${w.week_end}`;
    }
  };

  const weekName = (w, i) => (i === 0 ? t("rd_this_week") : t("rd_week", { week: w.iso_week }));

  const cur = weeks[sel];
  const totals = METRICS.map(([k]) =>
    weeks.some((w) => w[k] === null) ? null : weeks.reduce((s, w) => s + (w[k] || 0), 0)
  );

  return (
    <div className="rd" aria-busy={loading ? "true" : "false"}>
      <section className="rd-hero">
        <div className="pil-eyebrow">{t("rd_eyebrow")}</div>
        <h1>{t("rd_title")}</h1>
        <p className="pil-lede">{t("rd_lede")}</p>
      </section>

      {err ? <p className="rd-error">{t("rd_error")}</p> : null}

      <section className="rd-week" aria-live="polite">
        <div className="rd-weekbar">
          <button
            type="button"
            className="zr-btn2 zr-btn2--ghost"
            onClick={() => setSel((s) => Math.min(s + 1, weeks.length - 1))}
            disabled={!cur || sel >= weeks.length - 1}
            aria-label={t("rd_prev")}
          >
            ←
          </button>
          <div className="rd-weekname">
            <strong>{cur ? weekName(cur, sel) : loading ? t("rd_loading") : "–"}</strong>
            {cur ? <span>{fmtRange(cur)}</span> : null}
          </div>
          <button
            type="button"
            className="zr-btn2 zr-btn2--ghost"
            onClick={() => setSel((s) => Math.max(s - 1, 0))}
            disabled={!cur || sel === 0}
            aria-label={t("rd_next")}
          >
            →
          </button>
        </div>

        <div className="rd-tiles">
          {METRICS.map(([k, label]) => (
            <div key={k} className={`rd-tile rd-tile--${k}`}>
              <div className="rd-num">{cur ? fmtNum(cur[k]) : "–"}</div>
              <div className="rd-label">{t(label)}</div>
            </div>
          ))}
        </div>
      </section>

      {weeks.length ? (
        <section className="rd-history">
          <h2>{t("rd_history", { n: weeks.length })}</h2>
          <div className="rd-tablewrap">
            <table className="rd-table">
              <thead>
                <tr>
                  <th scope="col">{t("rd_th_week")}</th>
                  {METRICS.map(([k, label]) => (
                    <th key={k} scope="col">{t(label)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((w, i) => (
                  <tr
                    key={w.week_start}
                    className={i === sel ? "is-active" : undefined}
                    onClick={() => setSel(i)}
                  >
                    <th scope="row">
                      <button type="button" className="rd-rowbtn" onClick={() => setSel(i)}>
                        {weekName(w, i)}
                        <small>{fmtRange(w)}</small>
                      </button>
                    </th>
                    {METRICS.map(([k]) => (
                      <td key={k}>{fmtNum(w[k])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{t("rd_total")}</th>
                  {totals.map((n, i) => (
                    <td key={METRICS[i][0]}>{fmtNum(n)}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="rd-note">{t("rd_note")}</p>
        </section>
      ) : null}
    </div>
  );
}

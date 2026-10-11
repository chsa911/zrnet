import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listAuthorReadingStats } from "../api/books";
import { useI18n } from "../context/I18nContext";
import { useSeo } from "../utils/seo";
import "./home_minimal.css";
import "./AuthorReadingStatsPage.css";

const PAGE_SIZE = 60;

// sortable columns; "first" = direction on first click
const COLUMNS = [
  { key: "author", label: "ars_th_author", first: "asc" },
  { key: "top_books", label: "ars_th_top", first: "desc" },
  { key: "finished", label: "ars_th_finished", first: "desc" },
  { key: "abandoned", label: "ars_th_abandoned", first: "desc" },
  { key: "read_total", label: "ars_th_read_total", first: "desc" },
  { key: "last_activity", label: "ars_th_activity", first: "desc" },
];

const QUICK = [
  ["author", "asc", "ars_sort_name"],
  ["read_total", "desc", "ars_sort_read"],
  ["last_activity", "desc", "ars_sort_activity"],
];

function authorHref(name, tab) {
  const base = `/author/${encodeURIComponent(name)}`;
  return tab ? `${base}?tab=${tab}` : base;
}

const nameKey = (r) => String(r.last_name || r.author || "").toLocaleLowerCase("de");
const ts = (r) => (r.last_activity ? Date.parse(r.last_activity) : 0);

function relativeDate(iso, locale) {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  const days = Math.round((then.getTime() - Date.now()) / 86400000);
  try {
    const rtf = new Intl.RelativeTimeFormat(locale || "de", { numeric: "auto" });
    if (Math.abs(days) < 31) return rtf.format(days, "day");
    if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), "month");
    return rtf.format(Math.round(days / 365), "year");
  } catch {
    return then.toLocaleDateString();
  }
}

export default function AuthorReadingStatsPage() {
  const { t, locale } = useI18n();
  useSeo({ title: t("ars_title"), description: t("ars_lede"), path: "/author-stats" });

  const [sp, setSp] = useSearchParams();
  const sortRaw = sp.get("sort") || "author_asc";
  const [sortCol, sortDir] = (() => {
    const m = /^(.+)_(asc|desc)$/.exec(sortRaw);
    if (m && COLUMNS.some((c) => c.key === m[1])) return [m[1], m[2]];
    return ["author", "asc"];
  })();

  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErr("");
    listAuthorReadingStats({ signal: ac.signal })
      .then((items) => {
        if (ac.signal.aborted) return;
        setRows(
          items.map((r) => ({
            ...r,
            top_books: r.top_books || 0,
            finished: r.finished || 0,
            abandoned: r.abandoned || 0,
            read_total: (r.finished || 0) + (r.abandoned || 0),
          }))
        );
      })
      .catch((e) => {
        if (!ac.signal.aborted) setErr(e?.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  // reset paging when the view changes
  useEffect(() => setShown(PAGE_SIZE), [q, sortCol, sortDir]);

  const visible = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("de");
    const list = needle
      ? rows.filter((r) => String(r.author || "").toLocaleLowerCase("de").includes(needle))
      : [...rows];
    const byName = (a, b) => nameKey(a).localeCompare(nameKey(b), "de");
    const val = (r) => (sortCol === "last_activity" ? ts(r) : r[sortCol]);
    const sign = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) =>
      sortCol === "author" ? sign * byName(a, b) : sign * (val(a) - val(b)) || byName(a, b)
    );
    return list;
  }, [rows, q, sortCol, sortDir]);

  const setSort = (col, dir) => {
    const p = new URLSearchParams(sp);
    const v = `${col}_${dir}`;
    if (v === "author_asc") p.delete("sort");
    else p.set("sort", v);
    setSp(p, { replace: true });
  };

  const toggleSort = (col) => {
    const c = COLUMNS.find((x) => x.key === col);
    const nextDir = sortCol === col ? (sortDir === "asc" ? "desc" : "asc") : c.first;
    setSort(col, nextDir);
  };

  const arrow = (col) => (sortCol !== col ? "↕" : sortDir === "asc" ? "↑" : "↓");
  const ariaSort = (col) =>
    sortCol !== col ? "none" : sortDir === "asc" ? "ascending" : "descending";

  const fmtNum = (n) => new Intl.NumberFormat(locale || "de").format(n);
  const fmtDate = (v) => {
    if (!v) return "";
    try {
      return new Date(v).toLocaleDateString(locale || "de", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const page = visible.slice(0, shown);

  return (
    <div className="ars" aria-busy={loading ? "true" : "false"}>
      <section className="ars-hero">
        <div className="pil-eyebrow">{t("ars_eyebrow")}</div>
        <h1>{t("ars_title")}</h1>
        <p className="pil-lede">{t("ars_lede")}</p>
      </section>

      <section className="ars-listSection">
        <div className="ars-toolbar">
          <div className="ars-quick" role="group" aria-label={t("ars_sort_label")}>
            {QUICK.map(([col, dir, label]) => {
              const active = sortCol === col && sortDir === dir;
              return (
                <button
                  key={col}
                  type="button"
                  className={`zr-btn2 ${active ? "zr-btn2--primary" : "zr-btn2--ghost"}`}
                  aria-pressed={active}
                  onClick={() => setSort(col, dir)}
                >
                  {t(label)}
                </button>
              );
            })}
          </div>
          <div className="ars-searchWrap">
            <input
              className="ars-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("ars_search")}
              aria-label={t("ars_search")}
            />
            <span className="ars-count">
              {t("ars_count", { n: fmtNum(visible.length), total: fmtNum(rows.length) })}
            </span>
          </div>
        </div>

        <div className="ars-list" role="table" aria-label={t("ars_title")}>
          <div className="ars-row ars-row--head" role="row">
            <span className="ars-rank" aria-hidden="true">#</span>
            {COLUMNS.map((c) => (
              <button
                key={c.key}
                type="button"
                role="columnheader"
                aria-sort={ariaSort(c.key)}
                className={`ars-th ars-col-${c.key}${sortCol === c.key ? " is-active" : ""}`}
                onClick={() => toggleSort(c.key)}
              >
                {t(c.label)} <b aria-hidden="true">{arrow(c.key)}</b>
              </button>
            ))}
          </div>

          {err ? <div className="ars-msg ars-msg--error">{err}</div> : null}
          {loading ? <div className="ars-msg">{t("ars_loading")}</div> : null}

          {!loading &&
            page.map((r, i) => {
              const fPct = r.read_total ? (r.finished / r.read_total) * 100 : 0;
              const rel = relativeDate(r.last_activity, locale);
              return (
                <div className="ars-row" role="row" key={r.id}>
                  <span className="ars-rank" aria-hidden="true">{i + 1}</span>

                  <div className="ars-col-author" role="cell">
                    <Link className="ars-name" to={authorHref(r.author)}>
                      {r.author}
                    </Link>
                    {r.read_total ? (
                      <div
                        className="ars-bar"
                        title={`${r.finished} ${t("ars_th_finished")} · ${r.abandoned} ${t("ars_th_abandoned")}`}
                        aria-hidden="true"
                      >
                        <span className="ars-bar__fin" style={{ width: `${fPct}%` }} />
                      </div>
                    ) : null}
                  </div>

                  <div className="ars-col-top_books" role="cell" data-label={t("ars_th_top")}>
                    {r.top_books ? (
                      <Link className="ars-chip ars-chip--top" to={authorHref(r.author, "top")}>
                        ★ {r.top_books}
                      </Link>
                    ) : (
                      <span className="ars-zero">–</span>
                    )}
                  </div>

                  <div className="ars-col-finished" role="cell" data-label={t("ars_th_finished")}>
                    {r.finished ? (
                      <Link className="ars-num ars-num--fin" to={authorHref(r.author, "finished")}>
                        {r.finished}
                      </Link>
                    ) : (
                      <span className="ars-zero">0</span>
                    )}
                  </div>

                  <div className="ars-col-abandoned" role="cell" data-label={t("ars_th_abandoned")}>
                    {r.abandoned ? (
                      <Link className="ars-num ars-num--ab" to={authorHref(r.author, "abandoned")}>
                        {r.abandoned}
                      </Link>
                    ) : (
                      <span className="ars-zero">0</span>
                    )}
                  </div>

                  <div className="ars-col-read_total" role="cell" data-label={t("ars_th_read_total")}>
                    <strong className="ars-total">{r.read_total}</strong>
                  </div>

                  <div className="ars-col-last_activity" role="cell" data-label={t("ars_th_activity")}>
                    {rel ? (
                      <time dateTime={r.last_activity} title={fmtDate(r.last_activity)} className="ars-when">
                        {rel}
                      </time>
                    ) : (
                      <span className="ars-zero">–</span>
                    )}
                  </div>
                </div>
              );
            })}

          {!loading && !err && visible.length === 0 ? (
            <div className="ars-msg">{t("ars_empty")}</div>
          ) : null}
        </div>

        {!loading && visible.length > shown ? (
          <div className="ars-more">
            <button
              type="button"
              className="zr-btn2 zr-btn2--ghost"
              onClick={() => setShown((n) => n + PAGE_SIZE)}
            >
              {t("ars_show_more", { n: fmtNum(Math.min(PAGE_SIZE, visible.length - shown)) })}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

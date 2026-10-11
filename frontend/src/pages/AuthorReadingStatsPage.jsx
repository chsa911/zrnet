import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listAuthorReadingStats } from "../api/books";
import { useI18n } from "../context/I18nContext";
import { useSeo } from "../utils/seo";
import "./AuthorsIndexPage.css";
import "./AuthorReadingStatsPage.css";

// column key -> default direction when first clicked
const COLUMNS = [
  { key: "author", label: "ars_th_author", first: "asc" },
  { key: "top_books", label: "ars_th_top", first: "desc" },
  { key: "finished", label: "ars_th_finished", first: "desc" },
  { key: "abandoned", label: "ars_th_abandoned", first: "desc" },
  { key: "read_total", label: "ars_th_read_total", first: "desc" },
  { key: "last_activity", label: "ars_th_activity", first: "desc" },
];

function authorHref(name, tab) {
  const base = `/author/${encodeURIComponent(name)}`;
  return tab ? `${base}?tab=${tab}` : base;
}

const nameKey = (r) => String(r.last_name || r.author || "").toLocaleLowerCase("de");
const ts = (r) => (r.last_activity ? Date.parse(r.last_activity) : 0);

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

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErr("");
    listAuthorReadingStats({ signal: ac.signal })
      .then((items) => {
        if (!ac.signal.aborted)
          setRows(items.map((r) => ({ ...r, read_total: (r.finished || 0) + (r.abandoned || 0) })));
      })
      .catch((e) => {
        if (!ac.signal.aborted) setErr(e?.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  const visible = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("de");
    const list = needle
      ? rows.filter((r) => String(r.author || "").toLocaleLowerCase("de").includes(needle))
      : [...rows];
    const byName = (a, b) => nameKey(a).localeCompare(nameKey(b), "de");
    const val = (r) => (sortCol === "last_activity" ? ts(r) : Number(r[sortCol]) || 0);
    const sign = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) =>
      sortCol === "author" ? sign * byName(a, b) : sign * (val(a) - val(b)) || byName(a, b)
    );
    return list;
  }, [rows, q, sortCol, sortDir]);

  const toggleSort = (col) => {
    const c = COLUMNS.find((x) => x.key === col);
    const nextDir = sortCol === col ? (sortDir === "asc" ? "desc" : "asc") : c.first;
    const p = new URLSearchParams(sp);
    const v = `${col}_${nextDir}`;
    if (v === "author_asc") p.delete("sort");
    else p.set("sort", v);
    setSp(p, { replace: true });
  };

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          top: acc.top + (r.top_books || 0),
          finished: acc.finished + (r.finished || 0),
          abandoned: acc.abandoned + (r.abandoned || 0),
        }),
        { top: 0, finished: 0, abandoned: 0 }
      ),
    [rows]
  );

  const arrow = (col) => (sortCol !== col ? "↕" : sortDir === "asc" ? "↑" : "↓");
  const ariaSort = (col) =>
    sortCol !== col ? "none" : sortDir === "asc" ? "ascending" : "descending";

  const fmtDate = (v) => {
    if (!v) return "—";
    try {
      return new Date(v).toLocaleDateString(locale || "de", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const num = (n, name, tab) =>
    n ? (
      <Link className="authors-cell authors-number" to={authorHref(name, tab)}>
        {n}
      </Link>
    ) : (
      <div className="authors-cell authors-number ars-zero">0</div>
    );

  return (
    <section className="authors-brutal-page ars" aria-busy={loading ? "true" : "false"}>
      <h1 className="ars-title">{t("ars_title")}</h1>
      <p className="zr-lede">{t("ars_lede")}</p>

      {!loading && rows.length ? (
        <dl className="ars-summary">
          <div>
            <dt>{t("ars_th_read_total")}</dt>
            <dd>{totals.finished + totals.abandoned}</dd>
          </div>
          <div>
            <dt>{t("ars_th_finished")}</dt>
            <dd>{totals.finished}</dd>
          </div>
          <div>
            <dt>{t("ars_th_abandoned")}</dt>
            <dd>{totals.abandoned}</dd>
          </div>
          <div>
            <dt>{t("ars_th_top")}</dt>
            <dd>{totals.top}</dd>
          </div>
        </dl>
      ) : null}

      <div className="ars-toolbar">
        <input
          className="ars-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("ars_search")}
          aria-label={t("ars_search")}
        />
        <div className="ars-quick" role="group" aria-label={t("ars_sort_label")}>
          {[
            ["author", "asc", "ars_sort_name"],
            ["read_total", "desc", "ars_sort_read"],
            ["last_activity", "desc", "ars_sort_activity"],
          ].map(([col, dir, label]) => {
            const active = sortCol === col && sortDir === dir;
            return (
              <button
                key={col}
                type="button"
                className={`ars-quick__btn${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => {
                  const p = new URLSearchParams(sp);
                  if (col === "author") p.delete("sort");
                  else p.set("sort", `${col}_${dir}`);
                  setSp(p, { replace: true });
                }}
              >
                {t(label)}
              </button>
            );
          })}
        </div>
        <span className="ars-count">
          {t("ars_count", { n: visible.length, total: rows.length })}
        </span>
      </div>

      <div className="authors-grid" role="table">
        <div className="authors-row ars-row authors-head" role="row">
          {COLUMNS.map((c) => (
            <button
              key={c.key}
              type="button"
              role="columnheader"
              aria-sort={ariaSort(c.key)}
              className={`authors-cell authors-head-btn ${
                c.key === "author" ? "authors-name" : "authors-number"
              } ${c.key === "last_activity" ? "ars-date" : ""}`}
              onClick={() => toggleSort(c.key)}
            >
              <span>{t(c.label)}</span> <b>{arrow(c.key)}</b>
            </button>
          ))}
        </div>

        {err ? <div className="authors-message authors-error">{err}</div> : null}
        {loading ? <div className="authors-message">{t("ars_loading")}</div> : null}

        {!loading &&
          visible.map((r) => (
            <div className="authors-row ars-row" role="row" key={r.id}>
              <Link className="authors-cell authors-name" to={authorHref(r.author)} title={r.author}>
                {r.author}
              </Link>
              {num(r.top_books, r.author, "top")}
              {num(r.finished, r.author, "finished")}
              {num(r.abandoned, r.author, "abandoned")}
              <div className="authors-cell authors-number ars-total">{r.read_total}</div>
              <div className="authors-cell authors-number ars-date">{fmtDate(r.last_activity)}</div>
            </div>
          ))}

        {!loading && !err && visible.length === 0 ? (
          <div className="authors-message">{t("ars_empty")}</div>
        ) : null}
      </div>
    </section>
  );
}

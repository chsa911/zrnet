import React, { useEffect, useMemo, useRef, useState } from "react";
import { getApiRoot } from "../api/apiRoot";
import { useI18n } from "../context/I18nContext";
import "./AuthorsIndexPage.css";

const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#0-9"];

function bucketFor(lastOrName) {
  const s = String(lastOrName || "").trim();
  if (!s) return "#0-9";

  // normalize diacritics: Ä -> A, É -> E, etc
  const c0 = s[0]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  if (/[0-9]/.test(c0)) return "#0-9";
  if (/^[A-Z]$/.test(c0)) return c0;
  return "#0-9";
}

export default function AuthorsIndexPage() {
  const { t } = useI18n();
  const topRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [activeLetter, setActiveLetter] = useState("A");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErr("");

    (async () => {
      try {
        const url = new URL(`${getApiRoot()}/public/authors/overview`, window.location.origin);
        url.searchParams.set("limit", "20000");
        url.searchParams.set("offset", "0");

        const res = await fetch(url.toString().replace(window.location.origin, ""), {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`overview_failed_${res.status}`);

        const json = await res.json();
        const items = Array.isArray(json?.items) ? json.items : [];
        setRows(items);
        setTotal(Number(json?.total ?? items.length) || items.length);
      } catch (e) {
        if (!ac.signal.aborted) {
          setErr(e?.message || String(e));
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;

    return rows.filter((a) => {
      const name = String(a.author || a.name_display || "").toLowerCase();
      const last = String(a.last || a.last_name || "").toLowerCase();
      const first = String(a.first || a.first_name || "").toLowerCase();
      return name.includes(qq) || last.includes(qq) || first.includes(qq);
    });
  }, [rows, q]);

  const groups = useMemo(() => {
    const g = Object.fromEntries(LETTERS.map((L) => [L, []]));
    for (const a of filtered) {
      const lastOrName = a.last || a.last_name || a.author || a.name_display;
      const b = bucketFor(lastOrName);
      (g[b] || (g[b] = [])).push(a);
    }
    return g;
  }, [filtered]);

  const counts = useMemo(() => {
    const c = {};
    for (const L of LETTERS) c[L] = (groups[L] || []).length;
    return c;
  }, [groups]);

  const title = t("ao_title");
  const lede = t("ao_lede");
  const searchLabel = t("ao_search");
  const searchPh = t("ao_search_ph");

  const h = t("ao_on_hand_short");      // H
  const f = t("ao_finished_short");     // F
  const nm = t("ao_not_match_short");   // NM
  const w = t("ao_wishlist_short");     // W

  return (
    <section className="zr-section ao" aria-busy={loading ? "true" : "false"}>
      <div ref={topRef} id="top" />

      <h1>{title}</h1>
      <p className="zr-lede">{lede}</p>

      <div className="zr-card ao-card">
        {err ? <div className="zr-alert zr-alert--error">{err}</div> : null}
        {loading ? <div className="zr-alert">{t("ao_loading")}</div> : null}

        <div className="ao-tools">
          <label className="ao-search">
            <div className="ao-search-label">{searchLabel}</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPh}
              className="ao-search-input"
            />
          </label>

          <div className="ao-count">
            {filtered.length} / {total} {t("ao_authors")}
          </div>
        </div>

        <div className="ao-letters" aria-label="Alphabet navigation">
          {LETTERS.map((L) => {
            const disabled = (counts[L] || 0) === 0;
            const href = L === "#0-9" ? "#letter-0-9" : `#letter-${L}`;

            if (disabled) {
              return (
                <span key={L} className="ao-letter ao-letter--disabled" aria-disabled="true">
                  {L}
                </span>
              );
            }

            return (
              <a
                key={L}
                className={`ao-letter${activeLetter === L ? " is-active" : ""}`}
                href={href}
                onClick={() => setActiveLetter(L)}
                title={`${counts[L]} ${t("ao_authors")}`}
              >
                {L}
              </a>
            );
          })}
        </div>

        <div className="ao-sections">
          {LETTERS.map((L) => {
            const list = groups[L] || [];
            if (!list.length) return null;

            const sectionId = L === "#0-9" ? "letter-0-9" : `letter-${L}`;

            return (
              <div key={L} id={sectionId} className="ao-section">
                <div className="ao-section-head">
                  <div className="ao-section-letter">{L}</div>
                  <a className="ao-backtop" href="#top">
                    {t("ao_back_to_top")}
                  </a>
                </div>

                <ul className="ao-list">
                  {list.map((a) => {
                    const id = a.id;
                    const name = a.author || a.name_display || "—";
                    const nat = a.nationality_abbr || a.nationality || null;

                    return (
                      <li key={id} className="ao-item">
                    <span className="ao-link">{name}</span>
                        <span className="ao-meta">
                          {nat ? <span className="ao-badge">{nat}</span> : null}
                          <span className="ao-badge">
                            {h}
                            {a.on_hand ?? 0}
                          </span>
                          <span className="ao-badge">
                            {f}
                            {a.finished ?? a.completed ?? 0}
                          </span>
                          <span className="ao-badge">
                            {nm}
                            {a.not_match ?? 0}
                          </span>
                          <span className="ao-badge">
                            {w}
                            {a.wishlist ?? 0}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {!loading && filtered.length === 0 ? (
            <div className="ao-empty">{t("ao_empty")}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
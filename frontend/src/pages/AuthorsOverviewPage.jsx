import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

function normKey(s) {
  return String(s || "").toLowerCase().trim();
}

export default function AuthorsOverviewPage() {
  const { t } = useI18n();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const acRef = useRef(null);

  useEffect(() => {
    if (acRef.current) acRef.current.abort();
    const ac = new AbortController();
    acRef.current = ac;

    setLoading(true);
    setErr("");

    fetch(`/api/public/authors/overview?_=${Date.now()}`, {
      headers: { Accept: "application/json" },
      signal: ac.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (ac.signal.aborted) return;
        setRows(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setErr(e?.message || String(e));
        setRows([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, []);

  const filtered = useMemo(() => {
    const needle = normKey(q);
    if (!needle) return rows;
    return (rows || []).filter((r) => {
      const hay = [r.last_name, r.first_name, r.name_display, r.id]
        .filter(Boolean)
        .map(normKey)
        .join(" ");
      return hay.includes(needle);
    });
  }, [rows, q]);

  return (
    <section className="zr-section" aria-busy={loading ? "true" : "false"}>
      <h1>{t("ao_title")}</h1>
      <p className="zr-lede">{t("ao_lede")}</p>

      <div className="zr-card">
        {err ? <div className="zr-alert zr-alert--error">{err}</div> : null}
        {loading ? <div className="zr-alert">{t("ao_loading")}</div> : null}

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 6 }}>
            {t("ao_search")}
            <input
              className="zr-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("ao_search_ph")}
              style={{ minWidth: 260 }}
            />
          </label>
          <div style={{ opacity: 0.8, paddingTop: 22 }}>
            {filtered.length} / {rows.length} {t("ao_authors")}
          </div>
        </div>

        <div style={{ overflow: "auto", marginTop: 12 }}>
          <table className="zr-table">
            <thead>
              <tr>
                <th>{t("ao_th_last")}</th>
                <th>{t("ao_th_first")}</th>
                <th>{t("ao_th_author")}</th>
                <th style={{ textAlign: "right" }}>{t("ao_th_completed")}</th>
                <th style={{ textAlign: "right" }}>{t("ao_th_not_match")}</th>
                <th style={{ textAlign: "right" }}>{t("ao_th_on_hand")}</th>
                <th style={{ textAlign: "right" }}>{t("ao_th_total")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const id = String(r.id || "");
                const last = r.last_name || "—";
                const first = r.first_name || "—";
                const name = r.name_display || `${first} ${last}`.trim() || "—";

                return (
                  <tr key={id || name}>
                    <td>{last}</td>
                    <td>{first}</td>
                    <td>
                      {id ? <Link to={`/author/${encodeURIComponent(id)}`}>{name}</Link> : name}
                    </td>
                    <td style={{ textAlign: "right" }}>{r.completed_books ?? 0}</td>
                    <td style={{ textAlign: "right" }}>{r.not_match_books ?? 0}</td>
                    <td style={{ textAlign: "right" }}>{r.on_hand_books ?? 0}</td>
                    <td style={{ textAlign: "right" }}>{r.total_books ?? 0}</td>
                  </tr>
                );
              })}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ opacity: 0.75 }}>
                    {t("ao_empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

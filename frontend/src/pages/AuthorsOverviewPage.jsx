import React, { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../context/I18nContext";

function normKey(s) {
  return String(s || "").toLowerCase().trim();
}

function num(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function getCount(row, keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null) return num(row[key]);
  }
  return 0;
}

function passesCountFilter(actualCount, filter) {
  if (!filter || filter.value === "") return true;

  const actual = num(actualCount);
  const expected = Number(filter.value);

  if (!Number.isFinite(expected)) return true;

  if (filter.op === "=") return actual === expected;
  if (filter.op === ">") return actual > expected;
  if (filter.op === ">=") return actual >= expected;
  if (filter.op === "<") return actual < expected;
  if (filter.op === "<=") return actual <= expected;

  return true;
}

function makeEmptyCountFilters(fields) {
  return Object.fromEntries(fields.map((field) => [field.key, { op: ">=", value: "" }]));
}

export default function AuthorsOverviewPage() {
  const { t } = useI18n();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const acRef = useRef(null);

  const countFilterFields = useMemo(
    () => [
      {
        key: "finished",
        label: t("ao_th_completed") || "Finished",
        keys: ["finished_books", "completed_books"],
      },
      {
        key: "abandoned",
        label: "Abandoned",
        keys: ["abandoned_books", "not_match_books"],
      },
      {
        key: "in_stock",
        label: t("ao_th_on_hand") || "In stock",
        keys: ["in_stock_books", "on_hand_books"],
      },
      {
        key: "in_progress",
        label: "In progress",
        keys: ["in_progress_books"],
      },
      {
        key: "total",
        label: t("ao_th_total") || "Total",
        keys: ["total_books"],
      },
    ],
    [t]
  );

  const emptyCountFilters = useMemo(
    () => makeEmptyCountFilters(countFilterFields),
    [countFilterFields]
  );

  const [countFilters, setCountFilters] = useState(() =>
    makeEmptyCountFilters([
      { key: "finished" },
      { key: "abandoned" },
      { key: "in_stock" },
      { key: "in_progress" },
      { key: "total" },
    ])
  );

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

  const activeCountFilters = useMemo(() => {
    return countFilterFields
      .map((field) => ({ field, filter: countFilters[field.key] }))
      .filter(({ filter }) => filter?.value !== "");
  }, [countFilterFields, countFilters]);

  const filtered = useMemo(() => {
    const needle = normKey(q);

    return (rows || []).filter((r) => {
      const hay = [r.last_name, r.first_name, r.name_display, r.id]
        .filter(Boolean)
        .map(normKey)
        .join(" ");

      const matchesSearch = !needle || hay.includes(needle);

      const matchesCounts = countFilterFields.every((field) =>
        passesCountFilter(getCount(r, field.keys), countFilters[field.key])
      );

      return matchesSearch && matchesCounts;
    });
  }, [rows, q, countFilterFields, countFilters]);

  function updateCountFilter(key, patch) {
    setCountFilters((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { op: ">=", value: "" }),
        ...patch,
      },
    }));
  }

  function clearSingleCountFilter(key) {
    updateCountFilter(key, { op: ">=", value: "" });
  }

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

          <button
            type="button"
            className="zr-button"
            onClick={() => setShowFilters((v) => !v)}
            style={{ marginTop: 22 }}
          >
            Filters{activeCountFilters.length ? ` (${activeCountFilters.length})` : ""}
          </button>

          <div style={{ opacity: 0.8, paddingTop: 22 }}>
            {filtered.length} / {rows.length} {t("ao_authors")}
          </div>
        </div>

        {activeCountFilters.length ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {activeCountFilters.map(({ field, filter }) => (
              <button
                key={field.key}
                type="button"
                onClick={() => clearSingleCountFilter(field.key)}
                title="Remove filter"
                style={{
                  border: "1px solid rgba(0,0,0,0.18)",
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.04)",
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {field.label} {filter.op} {filter.value} ×
              </button>
            ))}
          </div>
        ) : null}

        {showFilters ? (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 12,
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(120px, 1fr) 90px 130px",
                gap: 8,
                alignItems: "center",
                fontSize: 13,
                fontWeight: 700,
                opacity: 0.75,
              }}
            >
              <span>Metric</span>
              <span>Operator</span>
              <span>Number</span>
            </div>

            {countFilterFields.map((field) => (
              <div
                key={field.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(120px, 1fr) 90px 130px",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <strong>{field.label}</strong>

                <select
                  className="zr-input"
                  value={countFilters[field.key]?.op || ">="}
                  onChange={(e) => updateCountFilter(field.key, { op: e.target.value })}
                >
                  <option value="=">=</option>
                  <option value=">">&gt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<">&lt;</option>
                  <option value="<=">&lt;=</option>
                </select>

                <input
                  className="zr-input"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={countFilters[field.key]?.value || ""}
                  onChange={(e) => updateCountFilter(field.key, { value: e.target.value })}
                />
              </div>
            ))}

            <button
              type="button"
              className="zr-button"
              onClick={() => setCountFilters(emptyCountFilters)}
              style={{ justifySelf: "start" }}
            >
              Clear filters
            </button>
          </div>
        ) : null}

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
                    <td>{name}</td>
                    <td style={{ textAlign: "right" }}>{r.completed_books ?? r.finished_books ?? 0}</td>
                    <td style={{ textAlign: "right" }}>{r.not_match_books ?? r.abandoned_books ?? 0}</td>
                    <td style={{ textAlign: "right" }}>{r.on_hand_books ?? r.in_stock_books ?? 0}</td>
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

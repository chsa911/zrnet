  // frontend/src/pages/AuthorsIndexPage.jsx
  import React, { useEffect, useMemo, useState } from "react";
  import { Link } from "react-router-dom";
  import { getApiRoot } from "../api/apiRoot";
  import "./AuthorsIndexPage.css";

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function getAuthorName(a) {
    return (
      a?.name_display ||
      a?.author ||
      a?.name ||
      [a?.first_name || a?.first, a?.last_name || a?.last].filter(Boolean).join(" ") ||
      "—"
    );
  }

  function getFinished(a) {
    return num(a?.finished ?? a?.completed);
  }

  function getAbandoned(a) {
    return num(a?.abandoned ?? a?.not_match);
  }

  function getInStock(a) {
    return num(a?.in_stock ?? a?.notStarted ?? a?.not_started);
  }

  function getInProgress(a) {
    return num(a?.in_progress ?? a?.inProgress);
  }

  function getTotal(a) {
    return (
      num(a?.total) ||
      getFinished(a) + getAbandoned(a) + getInStock(a) + getInProgress(a) + num(a?.wishlist)
    );
  }

  function getYearCount(a, year) {
    return num(
      a?.[`entries_${year}`] ??
        a?.[`total_${year}`] ??
        a?.[`registered_${year}`] ??
        a?.years?.[year] ??
        a?.by_year?.[year]
    );
  }

  function searchUpdateUrl(authorId, status = "") {
    const p = new URLSearchParams();
    p.set("author_id", authorId);
    if (status) p.set("status", status);
    return `/search-update?${p.toString()}`;
  }

  export default function AuthorsIndexPage() {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [q, setQ] = useState("");
    const [sort, setSort] = useState("most_entries");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    useEffect(() => {
      const ac = new AbortController();

      async function loadAuthors() {
        setLoading(true);
        setErr("");

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
            setRows([]);
            setTotal(0);
            setErr(e?.message || "Failed to load authors");
          }
        } finally {
          if (!ac.signal.aborted) setLoading(false);
        }
      }

      loadAuthors();

      return () => ac.abort();
    }, []);

    const filtered = useMemo(() => {
      const needle = q.trim().toLowerCase();

      const list = !needle
        ? rows
        : rows.filter((a) => {
            const name = getAuthorName(a).toLowerCase();
            const last = String(a?.last || a?.last_name || "").toLowerCase();
            const first = String(a?.first || a?.first_name || "").toLowerCase();
            return name.includes(needle) || last.includes(needle) || first.includes(needle);
          });

      return list.slice().sort((a, b) => {
        const an = getAuthorName(a);
        const bn = getAuthorName(b);

        if (sort === "name") return an.localeCompare(bn, "de", { sensitivity: "base" });

        const diff =
          sort === "most_entries_2026"
            ? getYearCount(b, 2026) - getYearCount(a, 2026)
            : sort === "most_entries_2025"
              ? getYearCount(b, 2025) - getYearCount(a, 2025)
              : sort === "most_entries_2024"
                ? getYearCount(b, 2024) - getYearCount(a, 2024)
                : sort === "most_finished"
                  ? getFinished(b) - getFinished(a)
                  : sort === "most_abandoned"
                    ? getAbandoned(b) - getAbandoned(a)
                    : sort === "most_in_stock"
                      ? getInStock(b) - getInStock(a)
                      : sort === "most_in_progress"
                        ? getInProgress(b) - getInProgress(a)
                        : getTotal(b) - getTotal(a);

        return diff || an.localeCompare(bn, "de", { sensitivity: "base" });
      });
    }, [rows, q, sort]);

    return (
      <section className="zr-section ao-filter-index" aria-busy={loading ? "true" : "false"}>
        
        <div className="afi-grid">
          <div className="afi-filter-row">
            <div className="afi-cell">
              <input
                className="afi-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name"
                aria-label="Filter authors by name"
              />
            </div>

            <div className="afi-cell">
              <select
                className="afi-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort authors"
              >
                <option value="name">Name</option>
                <option value="most_entries">Most entries</option>
                <option value="most_entries_2026">Most entries 2026</option>
                <option value="most_entries_2025">Most entries 2025</option>
                <option value="most_entries_2024">Most entries 2024</option>
                <option value="most_finished">Most completed</option>
                <option value="most_abandoned">Most abandoned</option>
                <option value="most_in_stock">Most in stock</option>
                <option value="most_in_progress">Most in progress</option>
              </select>
            </div>

            <div className="afi-cell afi-count">{filtered.length} / {total}</div>
          </div>

          {err ? <div className="afi-alert afi-alert--error">{err}</div> : null}
          {loading ? <div className="afi-alert">Loading…</div> : null}

          {!loading && !err && filtered.length === 0 ? (
            <div className="afi-empty">No authors found.</div>
          ) : null}

          {!loading && !err
            ? filtered.map((a, index) => {
                const id = a?.id;
                const name = getAuthorName(a);
                const totalCount = getTotal(a);
                const finished = getFinished(a);
                const abandoned = getAbandoned(a);
                const inStock = getInStock(a);
                const inProgress = getInProgress(a);
                const key = id || `${name}-${index}`;

                if (!id) {
                  return (
                    <div className="afi-author-row" key={key}>
                      <span className="afi-cell afi-name afi-muted">{name}</span>
                      <span className="afi-cell afi-count-link">{totalCount}</span>
                      <span className="afi-cell afi-count-link">{finished}</span>
                      <span className="afi-cell afi-count-link">{abandoned}</span>
                      <span className="afi-cell afi-count-link">{inStock + inProgress}</span>
                    </div>
                  );
                }

                return (
                  <div className="afi-author-row" key={key}>
                    <Link className="afi-cell afi-name" to={searchUpdateUrl(id)} title="All entries">
                      {name}
                    </Link>

                    <Link className="afi-cell afi-count-link" to={searchUpdateUrl(id)} title="Total entries">
                       TEST {totalCount}
                    </Link>

                    <Link className="afi-cell afi-count-link" to={searchUpdateUrl(id, "finished")} title="Completed">
                      {finished}
                    </Link>

                    <Link className="afi-cell afi-count-link" to={searchUpdateUrl(id, "abandoned")} title="Abandoned">
                      {abandoned}
                    </Link>

                    <Link
                      className="afi-cell afi-count-link"
                      to={authorTitlesUrl(id, "in_stock,in_progress")}
                      title="In stock + in progress"
                    >
                      {inStock + inProgress}
                    </Link>
                  </div>
                );
              })
            : null}
        </div>
      </section>
    );
  }

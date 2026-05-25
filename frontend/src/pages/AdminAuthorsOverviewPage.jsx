    import React, { useEffect, useMemo, useRef, useState } from "react";
    import { getApiRoot } from "../api/apiRoot";
    import "./AuthorsIndexPage.css";
    import { Link } from "react-router-dom";
    import AdminAuthorAssignment from "../components/AdminAuthorAssignment";

    function num(v) {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }

    function getAuthorName(r) {
      return r?.name_display || r?.author || r?.name || "—";
    }

    function authorAdminUrl(authorId) {
      return `/admin/authors/${authorId}`;
    }

    function authorTitlesUrl(authorId, status = "") {
      const p = new URLSearchParams();
      if (status) p.set("status", status);
      const qs = p.toString();

      return `/admin/authors/${authorId}/titles${qs ? `?${qs}` : ""}`;
    }

    function authorTopBooksUrl(authorId) {
      return `/admin/authors/${authorId}/titles?top_book=1`;
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

    const COUNT_FILTER_FIELDS = [
      { key: "total", label: "Total" },
      { key: "top_books", label: "Top books" },
      { key: "completed", label: "Completed" },
      { key: "abandoned", label: "Not a match" },
      { key: "on_hand", label: "On hand" },
    ];

    const EMPTY_COUNT_FILTERS = Object.fromEntries(
      COUNT_FILTER_FIELDS.map((field) => [field.key, { op: ">=", value: "" }])
    );

    export default function AdminAuthorsOverviewPage() {
      const [rows, setRows] = useState([]);
      const [loading, setLoading] = useState(false);
      const [err, setErr] = useState("");
      const [sort, setSort] = useState("total_desc");
      const [q, setQ] = useState("");
      const [showFilters, setShowFilters] = useState(false);
      const [countFilters, setCountFilters] = useState(EMPTY_COUNT_FILTERS);
      const acRef = useRef(null);

      useEffect(() => {
        if (acRef.current) acRef.current.abort();

        const ac = new AbortController();
        acRef.current = ac;

        setLoading(true);
        setErr("");

        fetch(`${getApiRoot()}/admin/authors/overview`, {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        })
          .then(async (res) => {
            if (!res.ok) throw new Error(`Request failed (${res.status})`);
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

      const preparedRows = useMemo(() => {
        return rows.map((r) => ({
          ...r,
          _name: getAuthorName(r),
          _total: num(r.total),
          _top_books: num(r.top_books ?? r.topBooks),
          _completed: num(r.completed ?? r.finished),
          _abandoned: num(r.not_match ?? r.not_a_match ?? r.abandoned),
          _on_hand: num(r.on_hand),
        }));
      }, [rows]);

      const activeCountFilters = useMemo(() => {
        return COUNT_FILTER_FIELDS
          .map((field) => ({ field, filter: countFilters[field.key] }))
          .filter(({ filter }) => filter?.value !== "");
      }, [countFilters]);

      const filteredRows = useMemo(() => {
        const needle = String(q || "").toLowerCase().trim();

        return preparedRows.filter((r) => {
          const matchesSearch =
            !needle ||
            [r._name, r.id, r.author, r.name_display]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(needle);

          const matchesCounts =
            passesCountFilter(r._total, countFilters.total) &&
            passesCountFilter(r._top_books, countFilters.top_books) &&
            passesCountFilter(r._completed, countFilters.completed) &&
            passesCountFilter(r._abandoned, countFilters.abandoned) &&
            passesCountFilter(r._on_hand, countFilters.on_hand);

          return matchesSearch && matchesCounts;
        });
      }, [preparedRows, q, countFilters]);

      const sortedRows = useMemo(() => {
        return filteredRows.slice().sort((a, b) => {
          const an = a._name;
          const bn = b._name;

          if (sort === "author_asc") return an.localeCompare(bn, "de", { sensitivity: "base" });
          if (sort === "author_desc") return bn.localeCompare(an, "de", { sensitivity: "base" });

          if (sort === "top_books_desc") return b._top_books - a._top_books || an.localeCompare(bn);
          if (sort === "top_books_asc") return a._top_books - b._top_books || an.localeCompare(bn);

          if (sort === "completed_desc") return b._completed - a._completed || an.localeCompare(bn);
          if (sort === "completed_asc") return a._completed - b._completed || an.localeCompare(bn);

          if (sort === "abandoned_desc") return b._abandoned - a._abandoned || an.localeCompare(bn);
          if (sort === "abandoned_asc") return a._abandoned - b._abandoned || an.localeCompare(bn);

          if (sort === "on_hand_desc") return b._on_hand - a._on_hand || an.localeCompare(bn);
          if (sort === "on_hand_asc") return a._on_hand - b._on_hand || an.localeCompare(bn);

          if (sort === "total_asc") return a._total - b._total || an.localeCompare(bn);

          return b._total - a._total || an.localeCompare(bn);
        });
      }, [filteredRows, sort]);

      function toggleSort(column) {
        const map = {
          author: ["author_asc", "author_desc"],
          top_books: ["top_books_desc", "top_books_asc"],
          total: ["total_desc", "total_asc"],
          completed: ["completed_desc", "completed_asc"],
          abandoned: ["abandoned_desc", "abandoned_asc"],
          on_hand: ["on_hand_desc", "on_hand_asc"],
        };

        const [descOrAsc, opposite] = map[column];
        setSort((current) => (current === descOrAsc ? opposite : descOrAsc));
      }

      function arrow(column) {
        if (sort === `${column}_asc`) return "↑";
        if (sort === `${column}_desc`) return "↓";
        if (column === "top_books" && sort === "top_books_asc") return "↑";
        if (column === "top_books" && sort === "top_books_desc") return "↓";
        if (column === "abandoned" && sort === "abandoned_asc") return "↑";
        if (column === "abandoned" && sort === "abandoned_desc") return "↓";
        if (column === "on_hand" && sort === "on_hand_asc") return "↑";
        if (column === "on_hand" && sort === "on_hand_desc") return "↓";
        return "↕";
      }

      return (
        <section className="authors-brutal-page" aria-busy={loading ? "true" : "false"}>
          <AdminAuthorAssignment />

          <div
            className="authors-filterbar"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "end",
              flexWrap: "wrap",
              margin: "28px 0 14px",
            }}
          >
            <label style={{ display: "grid", gap: 6, fontWeight: 800 }}>
              Search authors
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search author..."
                style={{
                  minWidth: 260,
                  padding: "8px 10px",
                  border: "3px solid #555",
                  font: "inherit",
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              style={{
                padding: "9px 14px",
                border: "3px solid #555",
                background: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Filters {activeCountFilters.length ? `(${activeCountFilters.length})` : ""}
            </button>

            <div style={{ fontWeight: 800, opacity: 0.75, paddingBottom: 9 }}>
              {sortedRows.length} / {rows.length} authors
            </div>
          </div>

          {activeCountFilters.length ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {activeCountFilters.map(({ field, filter }) => (
                <button
                  key={field.key}
                  type="button"
                  onClick={() =>
                    setCountFilters((prev) => ({
                      ...prev,
                      [field.key]: { ...prev[field.key], value: "" },
                    }))
                  }
                  style={{
                    border: "2px solid #555",
                    background: "#eee",
                    padding: "5px 9px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                  title="Remove filter"
                >
                  {field.label} {filter.op} {filter.value} ×
                </button>
              ))}
            </div>
          ) : null}

          {showFilters ? (
            <div
              style={{
                marginBottom: 16,
                padding: 14,
                border: "4px solid #555",
                background: "#fff",
                display: "grid",
                gap: 10,
                maxWidth: 660,
              }}
            >
              {COUNT_FILTER_FIELDS.map((field) => (
                <div
                  key={field.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 90px 130px",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <strong>{field.label}</strong>

                  <select
                    value={countFilters[field.key]?.op || ">="}
                    onChange={(e) =>
                      setCountFilters((prev) => ({
                        ...prev,
                        [field.key]: {
                          ...(prev[field.key] || {}),
                          op: e.target.value,
                        },
                      }))
                    }
                    style={{ padding: 7, border: "3px solid #555", font: "inherit" }}
                  >
                    <option value="=">=</option>
                    <option value=">">&gt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&lt;=</option>
                  </select>

                  <input
                    type="number"
                    min="0"
                    value={countFilters[field.key]?.value || ""}
                    onChange={(e) =>
                      setCountFilters((prev) => ({
                        ...prev,
                        [field.key]: {
                          ...(prev[field.key] || {}),
                          value: e.target.value,
                        },
                      }))
                    }
                    placeholder="0"
                    style={{ padding: 7, border: "3px solid #555", font: "inherit" }}
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={() => setCountFilters(EMPTY_COUNT_FILTERS)}
                style={{
                  justifySelf: "start",
                  padding: "8px 12px",
                  border: "3px solid #555",
                  background: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Clear filters
              </button>
            </div>
          ) : null}

          <div className="authors-grid">
            <div className="authors-row authors-head">
              <button className="authors-cell authors-name authors-head-btn" onClick={() => toggleSort("author")}>
                <span>Author</span> <b>{arrow("author")}</b>
              </button>

              <button className="authors-cell authors-top-books authors-head-btn" onClick={() => toggleSort("top_books")}>
                <span>Top</span> <b>{arrow("top_books")}</b>
              </button>

              <button className="authors-cell authors-number authors-head-btn" onClick={() => toggleSort("total")}>
                <span>Total</span> <b>{arrow("total")}</b>
              </button>

              <button className="authors-cell authors-number authors-head-btn" onClick={() => toggleSort("completed")}>
                <span>Completed</span> <b>{arrow("completed")}</b>
              </button>

              <button className="authors-cell authors-number authors-head-btn" onClick={() => toggleSort("abandoned")}>
                <span>Not a match</span> <b>{arrow("abandoned")}</b>
              </button>

              <button className="authors-cell authors-number authors-head-btn" onClick={() => toggleSort("on_hand")}>
                <span>On hand</span> <b>{arrow("on_hand")}</b>
              </button>
            </div>

            {err ? <div className="authors-message authors-error">{err}</div> : null}
            {loading ? <div className="authors-message">Loading…</div> : null}

            {!loading && !err && sortedRows.map((r, index) => {
              const name = r._name;
              const completed = r._completed;
              const abandoned = r._abandoned;
              const onHand = r._on_hand;
              const total = r._total;
              const topBooks = r._top_books;
              const key = String(r.id || r.author || r.name_display || `${name}-${index}`);

              return (
                <div className="authors-row" key={key}>
                  <Link className="authors-cell authors-name" to={authorAdminUrl(r.id)} title={name}>
                    {name}
                  </Link>

                  <Link className="authors-cell authors-number" to={authorTopBooksUrl(r.id)} title="Top books">
                    {topBooks}
                  </Link>

                  <Link className="authors-cell authors-number" to={authorTitlesUrl(r.id)} title="Total entries">
                    {total}
                  </Link>

                  <Link className="authors-cell authors-number" to={authorTitlesUrl(r.id, "finished")} title="Completed">
                    {completed}
                  </Link>

                  <Link className="authors-cell authors-number" to={authorTitlesUrl(r.id, "abandoned")} title="Not a match">
                    {abandoned}
                  </Link>

                  <Link className="authors-cell authors-number" to={authorTitlesUrl(r.id, "in_stock,in_progress")} title="On hand">
                    {onHand}
                  </Link>
                </div>
              );
            })}

            {!loading && !err && sortedRows.length === 0 ? (
              <div className="authors-message">No authors match the current filters.</div>
            ) : null}
          </div>
        </section>
      );
    }

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getApiRoot } from "../api/apiRoot";
import "./AuthorsIndexPage.css";
import { Link } from "react-router-dom";

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
export default function AdminAuthorsOverviewPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sort, setSort] = useState("total_desc");
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

  const sortedRows = useMemo(() => {
    return rows.slice().sort((a, b) => {
      const an = getAuthorName(a);
      const bn = getAuthorName(b);

      const totalA = num(a.total);
      const totalB = num(b.total);
      const completedA = num(a.completed ?? a.finished);
      const completedB = num(b.completed ?? b.finished);
      const abandonedA = num(a.not_match ?? a.not_a_match ?? a.abandoned);
      const abandonedB = num(b.not_match ?? b.not_a_match ?? b.abandoned);
      const onHandA = num(a.on_hand);
      const onHandB = num(b.on_hand);

      if (sort === "author_asc") return an.localeCompare(bn, "de", { sensitivity: "base" });
      if (sort === "author_desc") return bn.localeCompare(an, "de", { sensitivity: "base" });

      if (sort === "completed_desc") return completedB - completedA || an.localeCompare(bn);
      if (sort === "completed_asc") return completedA - completedB || an.localeCompare(bn);

      if (sort === "abandoned_desc") return abandonedB - abandonedA || an.localeCompare(bn);
      if (sort === "abandoned_asc") return abandonedA - abandonedB || an.localeCompare(bn);

      if (sort === "on_hand_desc") return onHandB - onHandA || an.localeCompare(bn);
      if (sort === "on_hand_asc") return onHandA - onHandB || an.localeCompare(bn);

      if (sort === "total_asc") return totalA - totalB || an.localeCompare(bn);

      return totalB - totalA || an.localeCompare(bn);
    });
  }, [rows, sort]);

  function toggleSort(column) {
    const map = {
      author: ["author_asc", "author_desc"],
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
    if (column === "abandoned" && sort === "abandoned_asc") return "↑";
    if (column === "abandoned" && sort === "abandoned_desc") return "↓";
    if (column === "on_hand" && sort === "on_hand_asc") return "↑";
    if (column === "on_hand" && sort === "on_hand_desc") return "↓";
    return "↕";
  }

  return (
    <section className="authors-brutal-page" aria-busy={loading ? "true" : "false"}>
      <div className="authors-grid">
        <div className="authors-row authors-head">
          <button className="authors-cell authors-name authors-head-btn" onClick={() => toggleSort("author")}>
            <span>Author</span> <b>{arrow("author")}</b>
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
          const name = getAuthorName(r);
          const completed = num(r.completed ?? r.finished);
          const abandoned = num(r.not_match ?? r.not_a_match ?? r.abandoned);
          const onHand = num(r.on_hand);
          const total = num(r.total);
          const key = String(r.id || r.author || r.name_display || `${name}-${index}`);

          return (
         <div className="authors-row" key={key}>
  <Link className="authors-cell authors-name" to={authorAdminUrl(r.id)} title={name}>
  {name}
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
      </div>
    </section>
  );
}
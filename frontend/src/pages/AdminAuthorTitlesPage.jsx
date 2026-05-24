  import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { getApiRoot } from "../api/apiRoot";
import "./AuthorsIndexPage.css";

function fmt(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}

function titleForFilter(status, topBookOnly) {
  if (topBookOnly) return "Top books";
  if (status === "finished") return "Completed titles";
  if (status === "abandoned") return "Not a match titles";
  if (status === "in_stock,in_progress") return "On hand titles";
  return "All titles";
}

export default function AdminAuthorTitlesPage() {
  const { authorId } = useParams();
  const [searchParams] = useSearchParams();

  const status = searchParams.get("status") || "";
  const topBookOnly =
    searchParams.get("top_book") === "1" || searchParams.get("topBook") === "1";

  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const pageTitle = useMemo(
    () => titleForFilter(status, topBookOnly),
    [status, topBookOnly]
  );

  useEffect(() => {
    const ac = new AbortController();

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const url = new URL(
          `${getApiRoot()}/admin/authors/${authorId}/titles`,
          window.location.origin
        );

        if (status) url.searchParams.set("status", status);
        if (topBookOnly) url.searchParams.set("top_book", "1");

        const res = await fetch(url.toString().replace(window.location.origin, ""), {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });

        if (!res.ok) throw new Error(`Request failed (${res.status})`);

        const json = await res.json();
        setTitles(Array.isArray(json?.items) ? json.items : []);
      } catch (e) {
        if (!ac.signal.aborted) {
          setErr(e?.message || "Failed to load titles");
          setTitles([]);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => ac.abort();
  }, [authorId, status, topBookOnly]);

  return (
    <section className="authors-brutal-page">
      <p>
        <Link to="/admin/authors">← Back to authors</Link>
      </p>

      <h1 style={{ margin: "0 0 24px", fontSize: 42, fontWeight: 900 }}>
        {pageTitle}
      </h1>

      <div className="authors-grid">
        <div className="authors-row authors-head" style={{ gridTemplateColumns: "1fr 1.4fr" }}>
          <div className="authors-cell authors-name">Title</div>
          <div className="authors-cell authors-name">Reading history</div>
        </div>

        {err ? <div className="authors-message authors-error">{err}</div> : null}
        {loading ? <div className="authors-message">Loading…</div> : null}

        {!loading && !err && titles.length === 0 ? (
          <div className="authors-message">No titles found.</div>
        ) : null}

        {!loading &&
          !err &&
          titles.map((t, index) => (
            <div
              className="authors-row"
              style={{ gridTemplateColumns: "1fr 1.4fr" }}
              key={t.id || t.title_display || index}
            >
              <div className="authors-cell authors-name">
                {t.title_display || t.title || "—"}
              </div>

              <div className="authors-cell">
                {Array.isArray(t.reading_history) && t.reading_history.length ? (
                  <div>
                    {t.reading_history.map((h, i) => (
                      <div key={i}>
                        {h.status || h.action || "read"} —{" "}
                        {fmt(h.read_at || h.created_at || h.date)}
                      </div>
                    ))}
                  </div>
                ) : (
                  "—"
                )}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}

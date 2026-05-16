import React, { useEffect, useState } from "react";
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

export default function AdminAuthorTitlesPage() {
  const { authorId } = useParams();
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status") || "";

  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

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
  }, [authorId, status]);

  return (
    <section className="authors-brutal-page">
      <p>
        <Link to="/admin/authors">← Back to authors</Link>
      </p>

      <div className="authors-grid">
        <div className="authors-row authors-head">
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
                        {h.status || h.action || "read"} — {fmt(h.read_at || h.created_at || h.date)}
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
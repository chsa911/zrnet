import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listReceivedHighlights } from "../api/books";

export default function HighlightReceivedPage() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    listReceivedHighlights({ signal: ac.signal })
      .then((data) => setItems(data?.items || []))
      .catch((e) => setErr(e?.message || String(e)));
    return () => ac.abort();
  }, []);

  return (
    <section className="zr-section">
      <h1>Received Highlights</h1>
      {err ? <div className="zr-alert zr-alert--error">{err}</div> : null}

      <div className="zr-author__grid">
        {items.map((b) => (
          <article className="zr-card zr-author__book" key={b.id}>
            <Link to={`/book/${b.id}`}>
              <img src={b.cover} alt="" style={{ width: "100%" }} />
            </Link>
            <Link to={`/book/${b.id}`}>{b.title_display}</Link>
            <div>{b.reading_status}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
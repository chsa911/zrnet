import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listReceivedCandidates,
  makeHighlight,
  removeReceivedCandidate,
} from "../api/books";
import { coverUrl } from "../utils/covers";
function coverFor(id) {
  return id ? `/uploads/covers/${encodeURIComponent(id)}.jpg` : "";
}

export default function HighlightReceivedPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const data = await listReceivedCandidates();
      setItems(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Failed to load received candidates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function present(id) {
    try {
      setBusyId(id);
      await makeHighlight(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert(e?.message || "Could not present highlight");
    } finally {
      setBusyId("");
    }
  }

  async function remove(id) {
    try {
      setBusyId(id);
      await removeReceivedCandidate(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert(e?.message || "Could not remove candidate");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Received Candidates</h1>
      <p style={{ opacity: 0.75 }}>
        Books uploaded by the PWA. Present them as received highlights or remove them from this queue.
      </p>

      <div style={{ marginBottom: 16 }}>
        <button className="zr-btn2 zr-btn2--ghost" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? <div>Loading…</div> : null}
      {err ? <div style={{ color: "crimson" }}>{err}</div> : null}

      {!loading && !items.length ? (
        <div style={{ opacity: 0.75 }}>No received candidates.</div>
      ) : null}

      <div style={{ display: "grid", gap: 16 }}>
        {items.map((book) => {
          const id = book.id;
          const title = book.title_display || book.title_keyword || "Untitled upload";
          const disabled = busyId === id;

          return (
            <div
              key={id}
              className="zr-card"
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr",
                gap: 16,
                alignItems: "center",
              }}
            >
              <img
                src={coverFor(id)}
                alt=""
                style={{
                  width: 90,
                  height: 130,
                  objectFit: "cover",
                  borderRadius: 8,
                  background: "#eee",
                }}
              />

              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
                <div style={{ opacity: 0.7, fontSize: 13 }}>
                  {book.pages ? `${book.pages} pages · ` : ""}
                  {book.added_at ? new Date(book.added_at).toLocaleString() : ""}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <button
                    className="zr-btn2 zr-btn2--primary"
                    disabled={disabled}
                    onClick={() => present(id)}
                  >
                    Als Received Highlight präsentieren
                  </button>

                  <button
                    className="zr-btn2 zr-btn2--ghost"
                    disabled={disabled}
                    onClick={() => remove(id)}
                  >
                    Aus Kandidatenliste entfernen
                  </button>

                  <Link className="zr-btn2 zr-btn2--ghost" to={`/book/${id}`}>
                    Öffnen
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

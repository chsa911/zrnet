// frontend/src/components/UploadQueuePanel.jsx
import React from "react";

function fmtTime(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts || "");
  }
}

function labelForJob(job) {
  const p = job?.payload || {};
  const title = p.title_display || p.BKw || "";
  const author = p.name_display || p.BAutor || "";
  const isbn = p.isbn13 || p.isbn10 || p.isbn13_raw || "";
  const parts = [title, author].filter(Boolean).join(" — ");
  return parts || isbn || job.id;
}

export default function UploadQueuePanel({
  jobs = [],
  onClose,
  onProcessNow,
  onRetry,
  onRetryNoIsbn,
  onDelete,
}) {
  const sorted = [...jobs].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  return (
    <div
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        width: "min(520px, calc(100vw - 24px))",
        maxHeight: "70vh",
        overflow: "auto",
        background: "white",
        border: "1px solid rgba(0,0,0,0.18)",
        borderRadius: 14,
        boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
        padding: 12,
        zIndex: 9999,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 900, flex: 1 }}>Uploads (Warteschlange)</div>
        <button className="zr-btn2 zr-btn2--sm" type="button" onClick={onProcessNow}>
          Jetzt synchronisieren
        </button>
        <button className="zr-btn2 zr-btn2--ghost zr-btn2--sm" type="button" onClick={onClose}>
          Schließen
        </button>
      </div>

      <div style={{ marginTop: 10, opacity: 0.8, fontSize: 13 }}>
        Jobs bleiben lokal gespeichert, bis der Server erfolgreich bestätigt.
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {sorted.length === 0 ? (
          <div className="zr-card">Keine offenen Uploads.</div>
        ) : (
          sorted.map((job) => (
            <div key={job.id} className="zr-card">
              <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontWeight: 800, flex: 1 }}>{labelForJob(job)}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{fmtTime(job.createdAt)}</div>
              </div>

              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                Status: <b>{job.status}</b>
                {job.retries ? <> • Retries: <b>{job.retries}</b></> : null}
                {job.flow ? <> • Flow: <b>{job.flow}</b></> : null}
              </div>

              {job.lastError ? (
                <div style={{ marginTop: 6, fontSize: 13, color: "rgba(120,0,0,0.95)" }}>
                  Fehler: {job.lastError}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                <button className="zr-btn2 zr-btn2--sm" type="button" onClick={() => onRetry(job.id)}>
                  Retry
                </button>
                <button
                  className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                  type="button"
                  onClick={() => onRetryNoIsbn(job.id)}
                  title="Entfernt ISBN-Felder aus dem Upload und versucht erneut"
                >
                  Retry ohne ISBN
                </button>
                <button className="zr-btn2 zr-btn2--ghost zr-btn2--sm" type="button" onClick={() => onDelete(job.id)}>
                  Löschen
                </button>
              </div>

              {job.status === "blocked" ? (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                  Dieser Job ist “blocked” (zu oft fehlgeschlagen). Nutze “Retry ohne ISBN” oder lösche ihn.
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
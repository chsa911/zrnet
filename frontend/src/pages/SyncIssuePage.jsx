// frontend/src/pages/SyncIssuePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { listNeedsReview, resolveMobileIssue } from "../api/mobileSync";
import { listBooksByPages } from "../api/books";
import AdminNavRow from "../components/AdminNavRow";
function fmtTs(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function badge(text) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.15)",
        fontSize: 12,
        opacity: 0.85,
      }}
    >
      {text}
    </span>
  );
}

function BookPickList({ title, books, selectedId, onSelect, groupName }) {
  if (!books?.length) {
    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
        <div style={{ opacity: 0.7 }}>Keine Treffer.</div>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {books.map((b) => (
          <label
            key={b.id}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              background: selectedId === b.id ? "rgba(0,0,0,0.03)" : "transparent",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name={groupName || `pick-${title}`}
              checked={selectedId === b.id}
              onChange={() => onSelect(b.id)}
              style={{ marginTop: 3 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <strong>{b.barcode || "(kein Barcode)"}</strong>
                {b.pages != null ? badge(`${b.pages} Seiten`) : null}
                {b.reading_status ? badge(b.reading_status) : null}
                {b.top_book ? badge("Top") : null}
              </div>
              <div style={{ marginTop: 4, opacity: 0.9 }}>
                {b.title || "—"}
                {b.author ? ` · ${b.author}` : ""}
              </div>
              <div style={{ marginTop: 2, fontSize: 12, opacity: 0.65 }}>
                Registriert: {fmtTs(b.registered_at)}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

function normalizeBookForPick(b) {
  if (!b) return null;
  const id = b.id ?? b._id ?? null;
  if (!id) return null;

  const title =
    b.full_title ||
    b.title ||
    [b.BKw, b.BKw1, b.BKw2].filter(Boolean).join(" ").trim() ||
    "—";

  const author =
    b.author_display ||
    [b.author_firstname, b.author_lastname].filter(Boolean).join(" ").trim() ||
    b.BAutor ||
    b.author_lastname ||
    b.author ||
    "";

  return {
    id,
    barcode: b.barcode || b.BMarkb || b.BMark || null,
    pages: b.pages ?? b.BSeiten ?? null,
    reading_status: b.reading_status ?? b.status ?? null,
    top_book: b.top_book ?? b.BTop ?? null,
    registered_at: b.registered_at ?? b.createdAt ?? b.BEind ?? null,
    title,
    author,
  };
}

export default function SyncIssuePage() {
  const [q, setQ] = useState({ page: 1, limit: 20 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });

  const [expanded, setExpanded] = useState(() => new Set());
  const [picked, setPicked] = useState(() => new Map()); // issueId -> bookId
  const [noteByIssue, setNoteByIssue] = useState(() => new Map());
  const [busy, setBusy] = useState(() => new Set());

  // issueId -> { loading, err, items, total }
  const [samePagesByIssue, setSamePagesByIssue] = useState(() => new Map());

  const canPrev = useMemo(() => q.page > 1, [q.page]);
  const canNext = useMemo(() => q.page < (data.pages || 1), [q.page, data.pages]);

  function setBusyOn(issueId, on) {
    setBusy((prev) => {
      const n = new Set(prev);
      if (on) n.add(issueId);
      else n.delete(issueId);
      return n;
    });
  }

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const d = await listNeedsReview({ page: q.page, limit: q.limit });
      setData({
        items: Array.isArray(d?.items) ? d.items : [],
        total: Number.isFinite(d?.total) ? d.total : 0,
        pages: Number.isFinite(d?.pages) ? d.pages : 1,
      });
    } catch (e) {
      setData({ items: [], total: 0, pages: 1 });
      setErr(e?.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.page, q.limit]);

  async function ensureSamePages(issueId, pages) {
    if (!issueId || pages == null) return;
    const existing = samePagesByIssue.get(issueId);
    if (existing?.loading || existing?.items) return;

    setSamePagesByIssue((prev) => {
      const n = new Map(prev);
      n.set(issueId, { loading: true, err: "", items: null, total: 0 });
      return n;
    });

    try {
      const res = await listBooksByPages(pages, { limit: 200, page: 1 });
      const items = (res.items || []).map(normalizeBookForPick).filter(Boolean);
      setSamePagesByIssue((prev) => {
        const n = new Map(prev);
        n.set(issueId, { loading: false, err: "", items, total: res.total || items.length });
        return n;
      });
    } catch (e) {
      setSamePagesByIssue((prev) => {
        const n = new Map(prev);
        n.set(issueId, { loading: false, err: e?.message || "Fehler", items: [], total: 0 });
        return n;
      });
    }
  }

  function toggleExpanded(issueId, pages) {
    const willOpen = !expanded.has(issueId);
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(issueId)) n.delete(issueId);
      else n.add(issueId);
      return n;
    });
    if (willOpen) ensureSamePages(issueId, pages);
  }

  async function apply(issue) {
    const issueId = issue?.issue?.id;
    const bookId = picked.get(issueId);
    if (!issueId) return;
    if (!bookId) return alert("Bitte wähle ein Buch aus");

    setBusyOn(issueId, true);
    try {
      await resolveMobileIssue(issueId, {
        action: "apply",
        bookId,
        note: noteByIssue.get(issueId) || null,
      });

      setData((prev) => ({
        ...prev,
        items: prev.items.filter((x) => x?.issue?.id !== issueId),
        total: Math.max(0, (prev.total || 0) - 1),
      }));
      setExpanded((prev) => {
        const n = new Set(prev);
        n.delete(issueId);
        return n;
      });
    } catch (e) {
      alert(e?.message || "Resolve fehlgeschlagen");
    } finally {
      setBusyOn(issueId, false);
    }
  }

  async function discard(issue) {
    const issueId = issue?.issue?.id;
    if (!issueId) return;
    if (!window.confirm("Issue wirklich verwerfen?")) return;

    setBusyOn(issueId, true);
    try {
      await resolveMobileIssue(issueId, {
        action: "discard",
        note: noteByIssue.get(issueId) || null,
      });

      setData((prev) => ({
        ...prev,
        items: prev.items.filter((x) => x?.issue?.id !== issueId),
        total: Math.max(0, (prev.total || 0) - 1),
      }));
      setExpanded((prev) => {
        const n = new Set(prev);
        n.delete(issueId);
        return n;
      });
    } catch (e) {
      alert(e?.message || "Verwerfen fehlgeschlagen");
    } finally {
      setBusyOn(issueId, false);
    }
  }

  return (
    <section className="zr-section">
     <AdminNavRow />
      <h1>Sync Issues</h1>
      <p className="zr-lede">
        Mobile-Sync Einträge mit <strong>status=needs_review</strong>.
      </p>

      <div className="zr-card">
        <div className="zr-toolbar" style={{ alignItems: "center" }}>
          <div style={{ fontSize: 14, opacity: 0.85 }}>
            Seite <strong>{q.page}</strong> / <strong>{data.pages || 1}</strong> · Gesamt{" "}
            <strong>{data.total || 0}</strong>
          </div>

          <div className="zr-toolbar__grow" />

          <label style={{ fontSize: 12, opacity: 0.75 }}>
            Pro Seite
            <select
              className="zr-select"
              style={{ marginLeft: 8 }}
              value={q.limit}
              onChange={(e) => setQ((p) => ({ ...p, limit: Number(e.target.value) || 20, page: 1 }))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>

          <button
            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
            onClick={() => refresh()}
            disabled={loading}
          >
            Aktualisieren
          </button>

          <button
            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
            onClick={() => canPrev && setQ((p) => ({ ...p, page: p.page - 1 }))}
            disabled={!canPrev || loading}
          >
            ◀
          </button>
          <button
            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
            onClick={() => canNext && setQ((p) => ({ ...p, page: p.page + 1 }))}
            disabled={!canNext || loading}
          >
            ▶
          </button>
        </div>

        {err ? <div style={{ marginTop: 10, color: "#a00" }}>{err}</div> : null}
        {loading ? <div style={{ marginTop: 10, opacity: 0.75 }}>Lade…</div> : null}

        {!loading && !err && (data.items?.length || 0) === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>Keine offenen Sync-Issues 🎉</div>
        ) : null}

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {(data.items || []).map((it) => {
            const issueId = it?.issue?.id;
            const receipt = it?.receipt;
            const issue = it?.issue;
            const isOpen = expanded.has(issueId);
            const isBusy = busy.has(issueId);
            const pages = receipt?.pages ?? null;
            const samePages = samePagesByIssue.get(issueId);

            return (
              <div
                key={receipt?.id || issueId}
                style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 16, padding: 14 }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 16 }}>{receipt?.barcode || "(kein Barcode)"}</strong>
                  {pages != null ? badge(`${pages} Seiten`) : null}
                  {issue?.reason ? badge(issue.reason) : null}
                  {receipt?.received_at ? badge(`empfangen: ${fmtTs(receipt.received_at)}`) : null}
                  <div style={{ flex: 1 }} />
                  <button
                    className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                    onClick={() => toggleExpanded(issueId, pages)}
                  >
                    {isOpen ? "Details schließen" : "Details öffnen"}
                  </button>
                </div>

                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                  Incoming: status <strong>{receipt?.reading_status || "—"}</strong> · geändert am{" "}
                  <strong>{fmtTs(receipt?.reading_status_updated_at)}</strong>
                  {receipt?.top_book === true ? " · TopBook: true" : receipt?.top_book === false ? " · TopBook: false" : ""}
                </div>

                {isOpen ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <label style={{ display: "grid", gap: 6 }}>
                        Notiz (optional)
                        <input
                          className="zr-input"
                          value={noteByIssue.get(issueId) || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setNoteByIssue((prev) => {
                              const n = new Map(prev);
                              n.set(issueId, v);
                              return n;
                            });
                          }}
                          placeholder="z.B. richtiger Datensatz gewählt …"
                        />
                      </label>

                      {issue?.candidates?.length ? (
                        <BookPickList
                          title={`Kandidaten aus Barcode-Assignments (${issue.candidates.length})`}
                          books={issue.candidates}
                          selectedId={picked.get(issueId) || ""}
                          groupName={`pick-${issueId}`}
                          onSelect={(id) =>
                            setPicked((prev) => {
                              const n = new Map(prev);
                              n.set(issueId, id);
                              return n;
                            })
                          }
                        />
                      ) : null}

                      {pages != null ? (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>
                            Bücher mit {pages} Seiten
                            {samePages?.loading ? " (lade…)" : ""}
                            {!samePages?.loading && samePages?.items ? ` (${samePages.total || samePages.items.length})` : ""}
                          </div>

                          {samePages?.err ? (
                            <div style={{ color: "#a00", fontSize: 12 }}>{samePages.err}</div>
                          ) : null}

                          {!samePages?.loading && Array.isArray(samePages?.items) ? (
                            samePages.items.length ? (
                              <select
                                className="zr-select"
                                value={picked.get(issueId) || ""}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  setPicked((prev) => {
                                    const n = new Map(prev);
                                    n.set(issueId, id);
                                    return n;
                                  });
                                }}
                              >
                                <option value="">Bitte wählen…</option>
                                {samePages.items.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {(b.barcode || "—") + " · " + (b.title || "—") + (b.author ? " · " + b.author : "")}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div style={{ opacity: 0.7, fontSize: 12 }}>Keine Treffer.</div>
                            )
                          ) : null}
                        </div>
                      ) : null}

                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
                        <button className="zr-btn2 zr-btn2--sm" onClick={() => apply(it)} disabled={isBusy}>
                          Anwenden
                        </button>
                        <button className="zr-btn2 zr-btn2--ghost zr-btn2--sm" onClick={() => discard(it)} disabled={isBusy}>
                          Verwerfen
                        </button>
                        {isBusy ? <span style={{ fontSize: 12, opacity: 0.7 }}>…</span> : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
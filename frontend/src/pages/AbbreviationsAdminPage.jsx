import React, { useEffect, useMemo, useState } from "react";
import AdminNavRow from "../components/AdminNavRow";
import BookForm from "../components/BookForm";
import { getBook } from "../api/books";
import { getApiRoot } from "../api/apiRoot";

function apiPath(path) {
  const root = getApiRoot().replace(/\/$/, "");
  return `${root}${path.startsWith("/") ? path : `/${path}`}`;
}

async function apiGetJson(path) {
  const res = await fetch(apiPath(path), {
    credentials: "include",
    cache: "no-store",
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(data?.detail || data?.error || text || `HTTP ${res.status}`);
  }
  return data;
}

function authorLabel(item) {
  const abbr = item?.abbr_display || `${item?.abbr_norm || ""}.`;
  const name = item?.author_last_name || item?.last_name || "—";
  const count = Number(item?.title_count || item?.published_titles || 0);
  return `${abbr} ${name}, ${count}`;
}

function bookTitle(book) {
  return (
    book?.title_display ||
    book?.main_title_display ||
    book?.title_keyword ||
    book?.title_en ||
    "[ohne Titel]"
  );
}

function fmtDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return "—";
  }
}

function statusLabel(v) {
  const s = String(v || "").trim();
  if (!s) return "—";
  if (s === "in_progress") return "in progress";
  return s;
}

function modalCardStyle(width = 1080) {
  return {
    background: "#fff",
    borderRadius: 16,
    width: "min(96vw, " + width + "px)",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
    border: "1px solid rgba(0,0,0,0.12)",
  };
}

export default function AbbreviationsAdminPage() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [authorModalOpen, setAuthorModalOpen] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState(null);
  const [authorBooks, setAuthorBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksErr, setBooksErr] = useState("");

  const [editingBookId, setEditingBookId] = useState("");
  const [editingBook, setEditingBook] = useState(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [editorErr, setEditorErr] = useState("");

  async function loadAuthors(nextQ = q) {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({ limit: "1000" });
      if (nextQ) qs.set("q", nextQ);
      const data = await apiGetJson(`/admin/abbreviations?${qs.toString()}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setErr(e?.message || "Abkürzungen konnten nicht geladen werden.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAuthors("");
  }, []);

  async function openAuthor(item) {
    setSelectedAuthor(item);
    setAuthorModalOpen(true);
    setEditingBookId("");
    setEditingBook(null);
    setEditorErr("");
    setBooksLoading(true);
    setBooksErr("");
    try {
      const data = await apiGetJson(`/admin/authors/${encodeURIComponent(item.author_id)}/books`);
      setAuthorBooks(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setAuthorBooks([]);
      setBooksErr(e?.message || "Bücher konnten nicht geladen werden.");
    } finally {
      setBooksLoading(false);
    }
  }

  function closeAuthorModal() {
    setAuthorModalOpen(false);
    setSelectedAuthor(null);
    setAuthorBooks([]);
    setBooksErr("");
    setBooksLoading(false);
    setEditingBookId("");
    setEditingBook(null);
    setEditorErr("");
    setEditorLoading(false);
  }

  async function openBookEditor(book) {
    const id = String(book?.id || "").trim();
    if (!id) return;
    setEditingBookId(id);
    setEditingBook(null);
    setEditorLoading(true);
    setEditorErr("");
    try {
      const full = await getBook(id);
      setEditingBook(full && typeof full === "object" ? full : book);
    } catch (e) {
      setEditingBook(null);
      setEditorErr(e?.message || "Buch konnte nicht geladen werden.");
    } finally {
      setEditorLoading(false);
    }
  }

  async function refreshBooksAndAuthors() {
    if (selectedAuthor?.author_id) {
      try {
        const data = await apiGetJson(`/admin/authors/${encodeURIComponent(selectedAuthor.author_id)}/books`);
        setAuthorBooks(Array.isArray(data?.items) ? data.items : []);
      } catch {}
    }
    try {
      await loadAuthors(q);
    } catch {}
  }

  const totalTitles = useMemo(
    () => items.reduce((sum, item) => sum + Number(item?.title_count || 0), 0),
    [items]
  );

  return (
    <section className="zr-section">
      <AdminNavRow />
      <h1>Abbreviations</h1>
      <p className="zr-lede">
        Kompakte Autorenansicht. Klick auf einen Eintrag lädt die Bücher des Autors. Danach öffnet <strong>✎ Bearbeiten</strong> direkt den Editor.
      </p>

      <div className="zr-card">
        <div className="zr-toolbar" style={{ alignItems: "center" }}>
          <form
            className="zr-toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(qInput);
              loadAuthors(qInput);
            }}
          >
            <input
              className="zr-input"
              placeholder="Abkürzung oder Nachname suchen"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
            />
            <button type="submit" className="zr-btn2 zr-btn2--ghost zr-btn2--sm">
              Suchen
            </button>
            {qInput ? (
              <button
                type="button"
                className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                onClick={() => {
                  setQInput("");
                  setQ("");
                  loadAuthors("");
                }}
              >
                Leeren
              </button>
            ) : null}
          </form>

          <div className="zr-toolbar__grow" />

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Autoren <strong>{items.length}</strong> · Titel in DB <strong>{totalTitles}</strong>
          </div>
        </div>

        {err ? <div className="zr-alert zr-alert--error">{err}</div> : null}
        {loading ? <div className="zr-alert">Lade…</div> : null}
        {!loading && !err && items.length === 0 ? <div className="zr-alert">Keine Einträge gefunden.</div> : null}

        {!loading && !err && items.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
              marginTop: 12,
            }}
          >
            {items.map((item) => (
              <button
                key={item.author_id || item.abbr_norm}
                type="button"
                className="zr-btn2 zr-btn2--ghost"
                onClick={() => openAuthor(item)}
                title="Bücher dieses Autors laden"
                style={{
                  textAlign: "left",
                  justifyContent: "flex-start",
                  padding: "10px 12px",
                  minHeight: 52,
                  whiteSpace: "normal",
                  lineHeight: 1.3,
                }}
              >
                {authorLabel(item)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {authorModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAuthorModal();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.38)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div style={modalCardStyle(editingBookId ? 1200 : 980)}>
            <div style={{ padding: 16, borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{selectedAuthor ? authorLabel(selectedAuthor) : "Autor"}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {editingBookId ? "Buch bearbeiten" : "Bücher dieses Autors"}
                </div>
              </div>
              {editingBookId ? (
                <button
                  type="button"
                  className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                  onClick={() => {
                    setEditingBookId("");
                    setEditingBook(null);
                    setEditorErr("");
                  }}
                >
                  ← Zur Liste
                </button>
              ) : null}
              <button type="button" className="zr-btn2 zr-btn2--ghost zr-btn2--sm" onClick={closeAuthorModal}>
                Schließen
              </button>
            </div>

            {!editingBookId ? (
              <div style={{ padding: 16 }}>
                {booksErr ? <div className="zr-alert zr-alert--error">{booksErr}</div> : null}
                {booksLoading ? <div className="zr-alert">Lade Bücher…</div> : null}
                {!booksLoading && !booksErr && authorBooks.length === 0 ? (
                  <div className="zr-alert">Keine Bücher gefunden.</div>
                ) : null}

                {!booksLoading && !booksErr && authorBooks.length > 0 ? (
                  <div style={{ overflow: "auto" }}>
                    <table className="zr-table">
                      <thead>
                        <tr>
                          <th>Titel</th>
                          <th>Verlag</th>
                          <th>Seiten</th>
                          <th>Status</th>
                          <th>Barcode</th>
                          <th>Registriert</th>
                          <th>Aktion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {authorBooks.map((book) => (
                          <tr key={book.id}>
                            <td>
                              <button
                                type="button"
                                onClick={() => openBookEditor(book)}
                                className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                                style={{ justifyContent: "flex-start", textAlign: "left" }}
                                title="Direkt im Editor öffnen"
                              >
                                {bookTitle(book)}
                              </button>
                              {book?.subtitle_display ? (
                                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{book.subtitle_display}</div>
                              ) : null}
                            </td>
                            <td>{book?.publisher_name_display || "—"}</td>
                            <td>{book?.pages ?? "—"}</td>
                            <td>{statusLabel(book?.reading_status)}</td>
                            <td>{book?.barcode || "—"}</td>
                            <td>{fmtDate(book?.registered_at || book?.added_at)}</td>
                            <td>
                              <button
                                type="button"
                                onClick={() => openBookEditor(book)}
                                className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                              >
                                ✎ Bearbeiten
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={{ padding: 16 }}>
                {editorErr ? <div className="zr-alert zr-alert--error">{editorErr}</div> : null}
                {editorLoading ? <div className="zr-alert">Editor wird geladen…</div> : null}
                {!editorLoading && !editorErr && editingBook ? (
                  <div className="zr-card" style={{ margin: 0 }}>
                    <BookForm
                      mode="edit"
                      bookId={editingBookId}
                      initialBook={editingBook}
                      lockBarcode={true}
                      showUnknownFields={false}
                      excludeUnknownKeys={["reading_status"]}
                      submitLabel="Speichern"
                      onCancel={() => {
                        setEditingBookId("");
                        setEditingBook(null);
                        setEditorErr("");
                      }}
                      onSuccess={async ({ payload, saved }) => {
                        const merged = { ...(editingBook || {}), ...(saved || {}), ...(payload || {}) };
                        setEditingBook(merged);
                        setEditingBookId("");
                        await refreshBooksAndAuthors();
                      }}
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

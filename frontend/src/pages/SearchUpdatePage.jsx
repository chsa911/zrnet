import React, { useEffect, useMemo, useRef, useState } from "react";
import { listBooks, getBook, updateBook, deleteBook } from "../api/books";
import AdminNavRow from "../components/AdminNavRow";
import BookForm from "../components/BookForm";

const getBarcode = (b) => b?.barcode ?? "—";
const getAuthor = (b) => b?.name_display ?? b?.author_name_display ?? "—";
const getKeyword = (b) => b?.title_keyword ?? "—";
const getPublisher = (b) => b?.publisher_name_display ?? "—";
const getPages = (b) => (b?.pages ?? b?.pages === 0 ? b.pages : "—");

const getCreatedAt = (b) => {
  try {
    return b?.registered_at ? new Date(b.registered_at).toLocaleString() : "—";
  } catch {
    return "—";
  }
};

const getStatusChangedAt = (b) => {
  try {
    return b?.reading_status_updated_at
      ? new Date(b.reading_status_updated_at).toLocaleString()
      : "—";
  } catch {
    return "—";
  }
};

const getTop = (b) => !!b?.top_book;

export default function SearchUpdatePage() {
  const [q, setQ] = useState({
    q: "",
    page: 1,
    limit: 20,
    sortBy: "registered_at",
    order: "desc",
    status: "",
  });
  const [searchText, setSearchText] = useState("");

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [updating, setUpdating] = useState(() => new Set());
  const [refreshTick, setRefreshTick] = useState(0);

  const [editingBook, setEditingBook] = useState(null);
  const debounceRef = useRef(null);

  const canPrev = useMemo(() => q.page > 1, [q.page]);
  const canNext = useMemo(() => q.page * q.limit < total, [q.page, q.limit, total]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / q.limit)), [total, q.limit]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQ((p) => ({ ...p, q: searchText, page: 1 })), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await listBooks(q);
        if (cancelled) return;

        const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setItems(list);
        setTotal(Number.isFinite(data?.total) ? data.total : list.length);
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
          setErr(e?.message || "Fehler beim Laden");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [q.page, q.limit, q.sortBy, q.order, q.q, q.status, refreshTick]);

  const idOf = (b) => b?._id || b?.id || "";

  function setQuery(patch) {
    setQ((prev) => ({ ...prev, ...patch }));
  }

  function nextPage() {
    if (canNext) setQuery({ page: q.page + 1 });
  }

  function prevPage() {
    if (canPrev) setQuery({ page: q.page - 1 });
  }

  function patchRow(id, patch) {
    if (!id) return;
    setItems((prev) => prev.map((it) => (idOf(it) === id ? { ...it, ...patch } : it)));
  }

  function setUpdatingOn(id, on = true) {
    setUpdating((prev) => {
      const n = new Set(prev);
      if (!id) return n;
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  async function toggleTop(b, nextVal) {
    const id = idOf(b);
    if (!id) return alert("Kein Datensatz-ID gefunden.");

    setUpdatingOn(id, true);
    const revert = { top_book: getTop(b) };

    try {
      patchRow(id, { top_book: !!nextVal });
      await updateBook(id, { top_book: !!nextVal });
    } catch (e) {
      patchRow(id, revert);
      alert(e?.message || "Update Topbook fehlgeschlagen");
    } finally {
      setUpdatingOn(id, false);
    }
  }

  async function setStatus(b, nextStatus) {
    const id = idOf(b);
    if (!id) return alert("Kein Datensatz-ID gefunden.");

    setUpdatingOn(id, true);
    const revert = { reading_status: b?.reading_status ?? null };

    try {
      patchRow(id, { reading_status: nextStatus });
      await updateBook(id, { reading_status: nextStatus });
    } catch (e) {
      patchRow(id, revert);
      alert(e?.message || "Update Status fehlgeschlagen");
    } finally {
      setUpdatingOn(id, false);
    }
  }

  async function dropRow(b) {
    const id = idOf(b);
    if (!id) return alert("Kein Datensatz-ID gefunden.");

    if (!confirm("Buch wirklich löschen? (Barcode wird freigegeben)")) return;

    setUpdatingOn(id, true);
    try {
      await deleteBook(id);
      setItems((prev) => prev.filter((it) => idOf(it) !== id));
      setTotal((prev) => Math.max(0, (Number(prev) || 0) - 1));
      if (items.length === 1 && q.page > 1) setQuery({ page: q.page - 1 });
    } catch (e) {
      alert(e?.message || "Löschen fehlgeschlagen");
    } finally {
      setUpdatingOn(id, false);
    }
  }

  const statusOf = (b) => String(b?.reading_status || "").toLowerCase();

  async function openEditor(b) {
    const id = idOf(b);
    if (!id) return alert("Kein Datensatz-ID gefunden.");

    setUpdatingOn(id, true);
    try {
      const full = await getBook(id);
      setEditingBook(full && typeof full === "object" ? full : b);
      setTimeout(() => {
        try {
          document.getElementById("edit-book-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch {}
      }, 0);
    } catch (e) {
      alert(e?.message || "Buchdetails konnten nicht geladen werden.");
    } finally {
      setUpdatingOn(id, false);
    }
  }

  function closeEditor() {
    setEditingBook(null);
  }

  return (
    <section className="zr-section">
      <AdminNavRow />
      <h1>Bücher verwalten</h1>
      <p className="zr-lede">
        Seite <strong>{q.page}</strong> / <strong>{totalPages}</strong> · Pro Seite <strong>{q.limit}</strong> · Gesamt{" "}
        <strong>{total}</strong>
        {q.q ? (
          <>
            {" "}
            · Suche: <em>{q.q}</em>
          </>
        ) : null}
      </p>

      <div className="zr-card">
        <div className="zr-toolbar">
          <form
            className="zr-toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              setQ((p) => ({ ...p, q: searchText, page: 1 }));
            }}
          >
            <input
              className="zr-input"
              placeholder="Suche (Titel, Autor, Barcode …)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setQ((p) => ({ ...p, q: searchText, page: 1 }));
                }
              }}
            />
            <button type="submit" className="zr-btn2 zr-btn2--ghost zr-btn2--sm">
              Suchen
            </button>
            {searchText ? (
              <button type="button" className="zr-btn2 zr-btn2--ghost zr-btn2--sm" onClick={() => setSearchText("")}>
                Leeren
              </button>
            ) : null}
          </form>

          <div className="zr-toolbar__grow" />

          <label style={{ fontSize: 12, opacity: 0.75 }}>
            Sortieren
            <select
              className="zr-select"
              style={{ marginLeft: 8 }}
              value={q.sortBy}
              onChange={(e) => setQuery({ sortBy: e.target.value, page: 1 })}
            >
              <option value="registered_at">Registriert</option>
              <option value="author_name_display">Autor</option>
              <option value="publisher_name_display">Verlag</option>
              <option value="reading_status_updated_at">Status geändert</option>
            </select>
          </label>

          <label style={{ fontSize: 12, opacity: 0.75 }}>
            Status
            <select
              className="zr-select"
              style={{ marginLeft: 8 }}
              value={q.status || ""}
              onChange={(e) => {
                const v = e.target.value || "";
                if (v) {
                  setQuery({ status: v, page: 1, sortBy: "reading_status_updated_at", order: "desc" });
                } else {
                  setQuery({ status: "", page: 1 });
                }
              }}
            >
              <option value="">Alle</option>
              <option value="finished">Zuletzt Finished</option>
              <option value="abandoned">Zuletzt Abandoned</option>
              <option value="finished,abandoned">Zuletzt Finished + Abandoned</option>
            </select>
          </label>

          <label style={{ fontSize: 12, opacity: 0.75 }}>
            Ordnung
            <select
              className="zr-select"
              style={{ marginLeft: 8 }}
              value={q.order}
              onChange={(e) => setQuery({ order: e.target.value, page: 1 })}
            >
              <option value="desc">↓ absteigend</option>
              <option value="asc">↑ aufsteigend</option>
            </select>
          </label>

          <label style={{ fontSize: 12, opacity: 0.75 }}>
            Pro Seite
            <select
              className="zr-select"
              style={{ marginLeft: 8 }}
              value={q.limit}
              onChange={(e) => setQuery({ limit: Number(e.target.value), page: 1 })}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>

        {err ? <div className="zr-alert zr-alert--error">{err}</div> : null}
        {loading ? <div className="zr-alert">Lade…</div> : null}
        {!loading && !err && items.length === 0 ? <div className="zr-alert">Keine Einträge gefunden.</div> : null}

        {!loading && !err && items.length > 0 ? (
          <div style={{ overflow: "auto", marginTop: 12 }}>
            <table className="zr-table">
              <thead>
                <tr>
                  <th>Barcode</th>
                  <th>Autor</th>
                  <th>Stichwort</th>
                  <th>Verlag</th>
                  <th>Seiten</th>
                  <th>Topbook</th>
                  <th>Abandoned</th>
                  <th>Finished</th>
                  <th>Status geändert</th>
                  <th>Registriert</th>
                  <th>Aktionen</th>
                </tr>
              </thead>

              <tbody>
                {items.map((b, i) => {
                  const id = idOf(b) || String(i);
                  const isBusy = updating.has(id);
                  const status = statusOf(b);
                  const isAbandoned = status === "abandoned";
                  const isFinished = status === "finished";

                  return (
                    <tr key={id}>
                      <td>{getBarcode(b)}</td>
                      <td>{getAuthor(b)}</td>
                      <td>{getKeyword(b)}</td>
                      <td>{getPublisher(b)}</td>
                      <td>{getPages(b)}</td>
                      <td>{getTop(b) ? "✓" : "—"}</td>
                      <td>{isAbandoned ? "✓" : "—"}</td>
                      <td>{isFinished ? "✓" : "—"}</td>
                      <td>{isAbandoned || isFinished ? getStatusChangedAt(b) : "—"}</td>
                      <td>{getCreatedAt(b)}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <button
                            disabled={isBusy}
                            onClick={() => openEditor(b)}
                            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                            type="button"
                          >
                            ✎ Bearbeiten
                          </button>

                          <button
                            disabled={isBusy}
                            onClick={() => toggleTop(b, !getTop(b))}
                            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                            title={getTop(b) ? "Topbook entfernen" : "Als Topbook markieren"}
                            type="button"
                          >
                            {getTop(b) ? "★ Top entfernen" : "☆ Top setzen"}
                          </button>

                          <button
                            disabled={isBusy}
                            onClick={() => dropRow(b)}
                            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                            type="button"
                            title="Löschen"
                          >
                            🗑 Löschen
                          </button>

                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <label style={{ fontSize: 12, display: "inline-flex", gap: 6, alignItems: "center" }}>
                              <input
                                type="radio"
                                name={`status-${id}`}
                                disabled={isBusy}
                                checked={isAbandoned}
                                onChange={() => setStatus(b, "abandoned")}
                              />
                              Abandoned
                            </label>

                            <label style={{ fontSize: 12, display: "inline-flex", gap: 6, alignItems: "center" }}>
                              <input
                                type="radio"
                                name={`status-${id}`}
                                disabled={isBusy}
                                checked={isFinished}
                                onChange={() => setStatus(b, "finished")}
                              />
                              Finished
                            </label>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="zr-toolbar" style={{ marginTop: 12 }}>
          <button className="zr-btn2 zr-btn2--ghost zr-btn2--sm" onClick={prevPage} disabled={!canPrev} type="button">
            ← Zurück
          </button>

          <div className="zr-toolbar__grow" />

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Seite <strong>{q.page}</strong> / <strong>{totalPages}</strong>
          </div>

          <button className="zr-btn2 zr-btn2--ghost zr-btn2--sm" onClick={nextPage} disabled={!canNext} type="button">
            Weiter →
          </button>
        </div>

        {editingBook ? (
          <div id="edit-book-form" style={{ marginTop: 14 }}>
            <div className="zr-card">
              <BookForm
                mode="edit"
                bookId={idOf(editingBook)}
                initialBook={editingBook}
                lockBarcode={true}
                showUnknownFields={false}
                excludeUnknownKeys={["reading_status"]}
                submitLabel="Speichern"
                onCancel={closeEditor}
                onSuccess={({ payload, saved }) => {
                  const patch = saved && typeof saved === "object" ? saved : payload;
                  const currentId = idOf(editingBook);

                  patchRow(currentId, patch);
                  setEditingBook((prev) => ({ ...(prev || {}), ...patch }));
                  closeEditor();
                  setRefreshTick((n) => n + 1);
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// frontend/src/pages/SearchUpdatePage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { listBooks, updateBook } from "../api/books";
import AdminNavRow from "../components/AdminNavRow";
import BookForm from "../components/BookForm"; // <-- make sure this exists (shared form used by register + edit)

/* ---------- tolerant field picker ---------- */
// normalize: lower-case, strip non-alphanum
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function pick(b, aliases, joinArray = ", ") {
  if (!b || !aliases?.length) return undefined;
  const keyMap = new Map(Object.keys(b).map((k) => [norm(k), k]));
  for (const alias of aliases) {
    const k = keyMap.get(norm(alias));
    if (k != null) {
      const v = b[k];
      if (Array.isArray(v)) return v.filter(Boolean).join(joinArray);
      return v;
    }
  }
  return undefined;
}

// small helpers using pick + aliases
const getBarcodeRaw = (b) => pick(b, ["barcode", "BMarkb", "BMark", "code", "Barcode"]);
const getBarcode = (b) => getBarcodeRaw(b) ?? "—";
const getAuthor = (b) =>
  pick(b, ["name_display", "author_name_display", "author_display", "BAutor", "Autor", "author", "Author"]) ?? "—";
const getKeyword = (b) => pick(b, ["BKw", "Stichwort", "Schlagwort", "keyword", "keywords"]) ?? "—";
const getPublisher = (b) =>
  pick(b, ["publisher_name_display", "BVerlag", "Verlag", "publisher", "Publisher"]) ?? "—";
const getPages = (b) => {
  const raw = pick(b, ["BSeiten", "Seiten", "pages", "Pages", "Seite", "page_count"]);
  if (raw === undefined || raw === null || raw === "") return "—";
  const n = Number(raw);
  return Number.isFinite(n) ? n : String(raw);
};
const getCreatedAt = (b) => {
  const raw = pick(b, ["BEind", "createdAt", "CreatedAt", "created_on", "created"]);
  try {
    return raw ? new Date(raw).toLocaleString() : "—";
  } catch {
    return "—";
  }
};
const getTop = (b) => !!(pick(b, ["BTop", "top", "Topbook"]) ?? b?.BTop);

/* ------------------------------------------- */

export default function SearchUpdatePage() {
  const [q, setQ] = useState({ q: "", page: 1, limit: 20, sortBy: "BEind", order: "desc" });
  const [searchText, setSearchText] = useState("");

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [updating, setUpdating] = useState(() => new Set());

  // editor state (reuses the same form as register)
  const [editingBook, setEditingBook] = useState(null);
  const debounceRef = useRef(null);

  const canPrev = useMemo(() => q.page > 1, [q.page]);
  const canNext = useMemo(() => q.page * q.limit < total, [q.page, q.limit, total]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / q.limit)), [total, q.limit]);

  // debounce search input → query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQ((p) => ({ ...p, q: searchText, page: 1 })), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  // fetch when query changes
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
  }, [q.page, q.limit, q.sortBy, q.order, q.q]);

  const idOf = (b) => b?._id || b?.id || getBarcodeRaw(b) || b?.code || "";

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
    const revert = { BTop: getTop(b) };

    try {
      patchRow(id, { BTop: !!nextVal });
      await updateBook(id, { BTop: !!nextVal });
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
    const revert = { status: b?.status ?? null };

    try {
      patchRow(id, { status: nextStatus });
      await updateBook(id, { status: nextStatus });
    } catch (e) {
      patchRow(id, revert);
      alert(e?.message || "Update Status fehlgeschlagen");
    } finally {
      setUpdatingOn(id, false);
    }
  }

  const statusOf = (b) => String(b?.status || "").toLowerCase();

  function openEditor(b) {
    setEditingBook(b);
    setTimeout(() => {
      try {
        document
          .getElementById("edit-book-form")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {}
    }, 0);
  }

  function closeEditor() {
    setEditingBook(null);
  }

  return (
    <section className="zr-section">
      <AdminNavRow />
      <h1>Bücher verwalten</h1>
      <p className="zr-lede">
        Seite <strong>{q.page}</strong> / <strong>{totalPages}</strong> · Pro Seite{" "}
        <strong>{q.limit}</strong> · Gesamt <strong>{total}</strong>
        {q.q ? (
          <>
            {" "}
            · Suche: <em>{q.q}</em>
          </>
        ) : null}
      </p>

      <div className="zr-card">
        {/* Controls */}
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
              <button
                type="button"
                className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                onClick={() => setSearchText("")}
              >
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
              <option value="BEind">BEind</option>
              <option value="createdAt">Erstellt</option>
              <option value="BAutor">Autor</option>
              <option value="BVerlag">Verlag</option>
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
        {!loading && !err && items.length === 0 ? (
          <div className="zr-alert">Keine Einträge gefunden.</div>
        ) : null}

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
                  <th>Erstellt</th>
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

                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <label
                              style={{
                                fontSize: 12,
                                display: "inline-flex",
                                gap: 6,
                                alignItems: "center",
                              }}
                            >
                              <input
                                type="radio"
                                name={`status-${id}`}
                                disabled={isBusy}
                                checked={isAbandoned}
                                onChange={() => setStatus(b, "abandoned")}
                              />
                              Abandoned
                            </label>

                            <label
                              style={{
                                fontSize: 12,
                                display: "inline-flex",
                                gap: 6,
                                alignItems: "center",
                              }}
                            >
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

        {/* Pagination */}
        <div className="zr-toolbar" style={{ marginTop: 12 }}>
          <button
            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
            onClick={prevPage}
            disabled={!canPrev}
            type="button"
          >
            ← Zurück
          </button>

          <div className="zr-toolbar__grow" />

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Seite <strong>{q.page}</strong> / <strong>{totalPages}</strong>
          </div>

          <button
            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
            onClick={nextPage}
            disabled={!canNext}
            type="button"
          >
            Weiter →
          </button>
        </div>

        {/* Editor (shared form, barcode locked) */}
        {editingBook ? (
          <div id="edit-book-form" style={{ marginTop: 14 }}>
            <div className="zr-card">
              <BookForm
                mode="edit"
                bookId={idOf(editingBook)}
                initialBook={editingBook}
                lockBarcode={true}
                showUnknownFields={false}
                excludeUnknownKeys={["status"]} // keep your status radios as source of truth
                submitLabel="Speichern"
                onCancel={closeEditor}
                onSuccess={({ payload, saved }) => {
                  const patch = saved && typeof saved === "object" ? saved : payload;

                  patchRow(idOf(editingBook), patch);
                  setEditingBook((prev) => ({ ...(prev || {}), ...patch }));
                  closeEditor();
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
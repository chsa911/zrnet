import React, { useEffect, useMemo, useRef, useState } from "react";
import { listBooks, getBook, updateBook } from "../api/books";
import BookForm from "../components/BookFormSwitcher";

const getBarcode = (b) => b?.barcode ?? "—";

const getAuthor = (b) =>
  b?.name_display ?? b?.author_name_display ?? b?.author_name ?? "—";

const getKeyword = (b) =>
  b?.title_display ?? b?.title_keyword ?? b?.keyword ?? b?.title ?? "—";

const getPages = (b) => (b?.pages ?? b?.pages === 0 ? b.pages : "—");

const getGenreAbbr = (b) => b?.genre_abbr ?? b?.genre ?? "";

const getSubgenreAbbr = (b) =>
  b?.subgenre_abbr ?? b?.sub_genre_abbr ?? b?.sub ?? "";

const getGenreTitle = (b) =>
  b?.genre_name ?? b?.genre ?? b?.genre_abbr ?? b?.genre_code ?? "";

const getSubgenreTitle = (b) =>
  b?.subgenre_name ?? b?.subgenre ?? b?.subgenre_abbr ?? b?.subgenre_code ?? "";

const fmtDate = (v) => {
  if (!v) return "—";

  const d = new Date(v);

  return (
    <>
      {d.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })}
      <br />
      {d.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </>
  );
};

const fmtDateTitle = (v) => {
  if (!v) return "—";

  const d = new Date(v);

  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function InlineEditable({ value, disabled, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  async function save() {
    setEditing(false);
    await onSave(draft);
  }

  if (editing) {
    return (
      <input
        autoFocus
        className="su-inline-input"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setDraft(value || "");
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className="su-inline-edit"
      disabled={disabled}
      onClick={() => setEditing(true)}
    >
      {value || "—"}
    </button>
  );
}

export default function SearchUpdatePage() {
  const [q, setQ] = useState({
    q: "",
    page: 1,
    limit: 20,
    sortBy: "last_action_at",
    order: "desc",
    status: "",
  });

  const [searchText, setSearchText] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [updating, setUpdating] = useState(() => new Set());
  const [editingBook, setEditingBook] = useState(null);
  const [barcodeHistory, setBarcodeHistory] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const debounceRef = useRef(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / q.limit)),
    [total, q.limit]
  );

  const canPrev = q.page > 1;
  const canNext = q.page * q.limit < total;

  const idOf = (b) => b?._id || b?.id || "";
  const statusOf = (b) => String(b?.reading_status || "").toLowerCase();

  function searchPatch(value) {
    const trimmed = value.trim();
    const isPages = /^\d+$/.test(trimmed);

    return {
      q: isPages ? "" : trimmed,
      pages: isPages ? Number(trimmed) : undefined,
      page: 1,
    };
  }

  function setQuery(patch) {
    setQ((prev) => ({ ...prev, ...patch }));
  }

  function patchRow(id, patch) {
    if (!id) return;
    setItems((prev) =>
      prev.map((it) => (idOf(it) === id ? { ...it, ...patch } : it))
    );
  }

  function setUpdatingOn(id, on = true) {
    setUpdating((prev) => {
      const next = new Set(prev);
      if (!id) return next;
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setQ((prev) => ({ ...prev, ...searchPatch(searchText) }));
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;

    async function loadBooks() {
      setLoading(true);
      setErr("");

      try {
        const data = await listBooks(q);
        if (cancelled) return;

        const list = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

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
    }

    loadBooks();

    return () => {
      cancelled = true;
    };
  }, [q.page, q.limit, q.sortBy, q.order, q.q, q.pages, q.status, refreshTick]);

  async function saveInlineField(b, field, value) {
    const id = idOf(b);
    if (!id) return alert("Kein Datensatz-ID gefunden.");

    const oldValue =
  field === "genre_abbr"
    ? getGenreAbbr(b)
    : field === "sub_genre_abbr" || field === "subgenre_abbr"
      ? getSubgenreAbbr(b)
      : b?.[field] ?? "";
const nextValue = value.trim();

    if (nextValue === oldValue) return;

    setUpdatingOn(id, true);

    try {
      const now = new Date().toISOString();

      patchRow(id, {
  [field]: nextValue,
  ...(field === "subgenre_abbr"
  ? { sub_genre_abbr: nextValue, sub: nextValue }
  : {}),
  ...(field === "genre_abbr"
    ? { genre: nextValue }
    : {}),
  updated_at: now,
  last_action_at: now,
});
      await updateBook(id, { [field]: nextValue });
    } catch (e) {
      patchRow(id, { [field]: oldValue });
      alert(e?.message || "Update fehlgeschlagen");
    } finally {
      setUpdatingOn(id, false);
    }
  }

  async function setStatus(b, nextStatus) {
    const id = idOf(b);
    if (!id) return alert("Kein Datensatz-ID gefunden.");

    const oldStatus = b?.reading_status ?? null;
    const oldStatusUpdatedAt = b?.reading_status_updated_at ?? null;
    setUpdatingOn(id, true);

    try {
      const now = new Date().toISOString();

      patchRow(id, {
        reading_status: nextStatus,
        reading_status_updated_at: now,
        last_action_at: now,
      });

      await updateBook(id, { reading_status: nextStatus });
    } catch (e) {
      patchRow(id, {
        reading_status: oldStatus,
        reading_status_updated_at: oldStatusUpdatedAt,
      });
      alert(e?.message || "Update Status fehlgeschlagen");
    } finally {
      setUpdatingOn(id, false);
    }
  }

  async function setTopBook(b) {
    const id = idOf(b);
    if (!id) return alert("Kein Datensatz-ID gefunden.");

    const oldTopBook = !!b?.top_book;
    const oldTopBookSetAt = b?.top_book_set_at ?? null;

    const nextTopBook = !oldTopBook;
    const now = new Date().toISOString();

    setUpdatingOn(id, true);

    try {
      patchRow(id, {
        top_book: nextTopBook,
        top_book_set_at: nextTopBook ? now : null,
        last_action_at: now,
      });

      await updateBook(id, {
        top_book: nextTopBook,
        top_book_set_at: nextTopBook ? now : null,
      });
    } catch (e) {
      patchRow(id, {
        top_book: oldTopBook,
        top_book_set_at: oldTopBookSetAt,
      });
      alert(e?.message || "Update TopBook fehlgeschlagen");
    } finally {
      setUpdatingOn(id, false);
    }
  }

  async function openBarcodeHistory(barcode) {
    if (!barcode || barcode === "—") return;

    try {
      const res = await fetch(
        `/api/books/barcodes/${encodeURIComponent(barcode)}/history`
      );
      if (!res.ok) throw new Error("Barcode-History konnte nicht geladen werden");

      const data = await res.json();
      setBarcodeHistory({ barcode, items: data?.items || data || [] });
    } catch (e) {
      alert(e?.message || "Barcode-History fehlgeschlagen");
    }
  }

  async function openEditor(b) {
    const id = idOf(b);
    if (!id) return alert("Kein Datensatz-ID gefunden.");

    setUpdatingOn(id, true);

    try {
      const full = await getBook(id);
      setEditingBook(full && typeof full === "object" ? full : b);

      setTimeout(() => {
        document
          .getElementById("edit-book-form")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <style>{`
        .zr-section {
          max-width: none;
        }

        .su-heading {
          margin-bottom: 26px;
        }

        .su-heading h1 {
          margin-bottom: 10px;
        }

        .su-grid {
          width: 100%;
          border: 4px solid #666;
          border-bottom: 0;
          border-radius: 0;
          overflow: hidden;
          background: #fff;
        }

        .su-search-row,
        .su-book-row,
        .su-header-row {
          display: grid;
          grid-template-columns: 105px 120px minmax(0, 1fr) 76px 70px 70px 44px 44px 44px 44px;
          align-items: stretch;
        }

        .su-search-row {
          min-height: 86px;
          background: #f1f1f1;
          border-bottom: 4px solid #666;
        }

        .su-header-row {
          min-height: 34px;
          background: #111;
          border-bottom: 4px solid #666;
        }

        .su-book-row {
          min-height: 72px;
          background: #fff;
          border-bottom: 4px solid #666;
        }

        .su-book-row:nth-child(even) {
          background: #fafafa;
        }

        .su-book-row.is-finished {
          background: #f4f4f4;
        }

        .su-book-row.is-abandoned {
          background: #ededed;
        }

        .su-head {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
          padding: 0 6px;
          border-right: 4px solid #666;
          color: #fff;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .su-head:last-child {
          border-right: 0;
        }

        .su-cell {
          display: flex;
          align-items: center;
          min-width: 0;
          padding: 0 12px;
          border-right: 4px solid #666;
          color: #5f5f5f;
          font-size: clamp(24px, 3vw, 50px);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1;
          overflow: hidden;
        }

        .su-cell:last-child {
          border-right: 0;
        }

        .su-cell--search {
          grid-column: 1 / 4;
          background: #fff;
        }

        .su-cell--filters {
          grid-column: 4 / 11;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          background: #e9e9e9;
          padding: 12px;
        }

        .su-search-input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #111;
          font: inherit;
          line-height: 1;
          padding: 0;
        }

        .su-search-input::placeholder {
          color: #9a9a9a;
          opacity: 1;
        }

        .su-filter {
          height: 38px;
          border: 3px solid #666;
          border-radius: 0;
          background: #fff;
          color: #333;
          font-size: 15px;
          font-weight: 700;
          padding: 0 8px;
          max-width: 150px;
        }

        .su-text {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .su-inline-edit {
          all: unset;
          cursor: pointer;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .su-inline-edit:hover {
          background: #fff2a8;
        }

        .su-inline-input {
          width: 100%;
          min-width: 0;
          border: 3px solid #111;
          background: #fff;
          color: #111;
          font: inherit;
          font-weight: inherit;
          letter-spacing: inherit;
          padding: 4px 6px;
          box-sizing: border-box;
        }

        .su-sub {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #777;
          line-height: 1;
          letter-spacing: 0;
        }

        .su-code {
          color: #111;
          font-size: clamp(19px, 1.8vw, 34px);
          font-weight: 850;
          letter-spacing: -0.04em;
        }

        .su-code--clickable {
          cursor: pointer;
        }

        .su-code--clickable:hover {
          background: #111;
          color: #fff;
        }

        .su-code--clickable:hover .su-sub {
          color: #fff;
        }

        .su-author {
          color: #333;
          font-size: clamp(18px, 1.7vw, 30px);
          font-weight: 850;
          letter-spacing: -0.04em;
        }

        .su-title {
          color: #333;
          font-size: clamp(18px, 1.9vw, 34px);
          font-weight: 750;
          letter-spacing: -0.035em;
        }

        .su-pages {
          justify-content: flex-end;
          color: #555;
          font-size: clamp(18px, 1.7vw, 30px);
          font-weight: 750;
          letter-spacing: -0.035em;
        }

        .su-genre,
        .su-subgenre {
          justify-content: center;
          text-align: center;
          color: #333;
          font-size: clamp(17px, 1.5vw, 28px);
          font-weight: 850;
          letter-spacing: -0.035em;
          padding: 0 8px;
        }

        .su-genre .su-inline-edit,
        .su-subgenre .su-inline-edit {
          text-align: center;
        }

        .su-action {
          width: 44px;
          min-width: 44px;
          height: 100%;
          border: 0;
          border-right: 4px solid #666;
          border-radius: 0;
          background: #fff;
          color: #111;
          cursor: pointer;
          font-size: 24px;
          font-weight: 900;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .su-action:last-child {
          border-right: 0;
        }

        .su-action:hover {
          background: #eee;
        }

        .su-action--abandoned {
          border-color: #111;
          background: #fff;
          color: #111;
        }

        .su-action--abandoned.is-active {
          background: #e53935;
          color: #fff;
        }

        .su-action--finished.is-active {
          background: #2e7d32;
          color: #fff;
        }

        .su-action--top.is-active {
          background: #f9a825;
          color: #fff;
        }

        .su-action--edit {
          font-size: 22px;
        }

        .su-action:disabled {
          cursor: wait;
          opacity: 0.45;
        }

        .su-empty,
        .su-alert {
          border-bottom: 4px solid #666;
          padding: 24px;
          font-size: 26px;
          font-weight: 800;
          color: #666;
        }

        .su-alert--error {
          color: #8b1111;
          background: #fff3f3;
        }

        .su-pager {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: stretch;
          border: 4px solid #666;
          border-top: 0;
          min-height: 58px;
          background: #f1f1f1;
        }

        .su-pager button {
          border: 0;
          border-right: 4px solid #666;
          border-radius: 0;
          background: transparent;
          color: #111;
          cursor: pointer;
          font-size: 20px;
          font-weight: 850;
        }

        .su-pager button:last-child {
          border-right: 0;
          border-left: 4px solid #666;
        }

        .su-pager button:disabled {
          color: #aaa;
          cursor: default;
        }

        .su-pager-info {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 24px;
          font-size: 18px;
          font-weight: 800;
          color: #444;
        }

        .su-editor {
          margin-top: 28px;
          border: 4px solid #666;
          padding: 18px;
          background: #fff;
        }

        .su-history-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .su-history-title {
          margin: 0;
          font-size: 24px;
          font-weight: 850;
        }

        .su-history-close {
          border: 3px solid #666;
          background: #fff;
          color: #111;
          font-size: 16px;
          font-weight: 850;
          padding: 8px 12px;
          cursor: pointer;
        }

        .su-history-row {
          border-top: 3px solid #666;
          padding: 10px 0;
          font-size: 18px;
          font-weight: 750;
        }

        .su-history-sub {
          display: block;
          margin-top: 4px;
          color: #777;
          font-size: 13px;
          font-weight: 700;
        }

        @media (max-width: 1180px) {
          .su-search-row,
          .su-book-row,
          .su-header-row {
            grid-template-columns: 100px 100px minmax(0, 1fr) 70px 64px 64px 40px 40px 40px 40px;
          }

          .su-action {
            width: 40px;
            min-width: 40px;
            font-size: 22px;
          }
        }

        @media (max-width: 700px) {
          .su-search-row,
          .su-book-row,
          .su-header-row {
            grid-template-columns: 120px 64px minmax(0, 1fr) 40px 40px 40px 40px;
          }

          .su-cell--search,
          .su-cell--filters {
            grid-column: 1 / -1;
          }

          .su-cell--filters {
            border-top: 4px solid #666;
          }

          .su-header-row .su-head:nth-child(4),
          .su-book-row .su-pages {
            display: none;
          }

          .su-header-row .su-head:nth-child(5),
          .su-header-row .su-head:nth-child(6),
          .su-book-row .su-genre,
          .su-book-row .su-subgenre {
            display: none;
          }
        }

        @media (max-width: 620px) {
          .su-search-row,
          .su-book-row,
          .su-header-row {
            grid-template-columns: 92px minmax(0, 1fr) 34px 34px 34px 34px;
          }

          .su-header-row .su-head:nth-child(2),
          .su-book-row .su-author {
            display: none;
          }

          .su-action {
            width: 34px;
            min-width: 34px;
            font-size: 19px;
          }

          .su-filter {
            max-width: none;
            flex: 1 1 120px;
          }
        }
      `}</style>

      <div className="su-grid">
        <form
          className="su-search-row"
          onSubmit={(e) => {
            e.preventDefault();
            setQ((prev) => ({ ...prev, ...searchPatch(searchText) }));
          }}
        >
          <div className="su-cell su-cell--search">
            <input
              className="su-search-input"
              placeholder="Search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              aria-label="Search books"
            />
          </div>

          <div className="su-cell su-cell--filters">
            <select
              className="su-filter"
              value={q.sortBy}
              onChange={(e) => setQuery({ sortBy: e.target.value, page: 1 })}
              aria-label="Sortieren"
            >
              <option value="last_action_at">Letzte Aktion</option>
              <option value="registered_at">Registriert</option>
              <option value="author_name_display">Autor</option>
              <option value="reading_status_updated_at">Status</option>
              <option value="pages">Seiten</option>
              <option value="genre_abbr">Genre</option>
              <option value="subgenre_abbr">Subgenre</option>
            </select>

            <select
              className="su-filter"
              value={q.status || ""}
              onChange={(e) => {
                const v = e.target.value || "";
                if (v) {
                  setQuery({
                    status: v,
                    page: 1,
                    sortBy: "last_action_at",
                    order: "desc",
                  });
                } else {
                  setQuery({ status: "", page: 1 });
                }
              }}
              aria-label="Status"
            >
              <option value="">Alle</option>
              <option value="finished">Finished</option>
              <option value="abandoned">Abandoned</option>
              <option value="finished,abandoned">Finished + Abandoned</option>
            </select>

            <select
              className="su-filter"
              value={q.order}
              onChange={(e) => setQuery({ order: e.target.value, page: 1 })}
              aria-label="Ordnung"
            >
              <option value="desc">↓</option>
              <option value="asc">↑</option>
            </select>

            <select
              className="su-filter"
              value={q.limit}
              onChange={(e) => setQuery({ limit: Number(e.target.value), page: 1 })}
              aria-label="Pro Seite"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </form>

        <div className="su-header-row">
          <div className="su-head">Bookcode</div>
          <div className="su-head">Lastname</div>
          <div className="su-head">Title</div>
          <div className="su-head">Pages</div>
          <div className="su-head">Genre</div>
          <div className="su-head">Sub</div>
          <div className="su-head" title="Abandoned">✕</div>
          <div className="su-head" title="Finished">✓</div>
          <div className="su-head" title="Top Book">★</div>
          <div className="su-head" title="Edit">✎</div>
        </div>

        {err ? <div className="su-alert su-alert--error">{err}</div> : null}
        {loading ? <div className="su-alert">Lade…</div> : null}

        {!loading && !err && items.length === 0 ? (
          <div className="su-empty">Keine Einträge gefunden.</div>
        ) : null}

        {!loading && !err && items.length > 0
          ? items.map((b, i) => {
              const id = idOf(b) || String(i);
              const isBusy = updating.has(id);
              const status = statusOf(b);
              const isAbandoned = status === "abandoned";
              const isFinished = status === "finished";

              return (
                <div
                  className={`su-book-row ${
                    isFinished ? "is-finished" : isAbandoned ? "is-abandoned" : ""
                  }`}
                  key={id}
                >
                  <div
  className="su-cell su-code su-code--clickable"
  onClick={() => openBarcodeHistory(getBarcode(b))}
  title={
    b?.registered_at
      ? `Registered: ${fmtDateTitle(b.registered_at)}`
      : "Barcode-History anzeigen"
  }
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      openBarcodeHistory(getBarcode(b));
    }
  }}
>
  <span className="su-text">
    {getBarcode(b)}
  </span>
</div>
                  <div className="su-cell su-author" title={getAuthor(b)}>
                    <span className="su-text">
                      <InlineEditable
                        value={
                          b?.author_lastname ??
                          b?.author_last_name ??
                          b?.last_name ??
                          ""
                        }
                        disabled={isBusy}
                        onSave={(val) => saveInlineField(b, "author_lastname", val)}
                      />
                    </span>
                  </div>

                  <div className="su-cell su-title" title={b?.title_display || getKeyword(b)}>
                    <span className="su-text">
                      <InlineEditable
                        value={b?.title_display ?? ""}
                        disabled={isBusy}
                        onSave={(val) => saveInlineField(b, "title_display", val)}
                      />
                    </span>
                  </div>

                  <div
  className="su-cell su-pages"
  title={
    b?.added_at
      ? `Added: ${fmtDateTitle(b.added_at)}`
      : "Added: —"
  }
>
  <span className="su-text">
    {getPages(b)}
  </span>
</div>
                  <div className="su-cell su-genre" title={getGenreTitle(b)}>
                    <span className="su-text">
                      <InlineEditable
                        value={getGenreAbbr(b)}
                        disabled={isBusy}
                        onSave={(val) => saveInlineField(b, "genre_abbr", val)}
                      />
                    </span>
                  </div>

                  <div className="su-cell su-subgenre" title={getSubgenreTitle(b)}>
                    <span className="su-text">
                      <InlineEditable
                        value={getSubgenreAbbr(b)}
                        disabled={isBusy}
                     onSave={(val) => saveInlineField(b, "subgenre_abbr", val)}
                      />
                    </span>
                  </div>

                  <button
                    disabled={isBusy}
                    onClick={() => setStatus(b, "abandoned")}
                    className={`su-action su-action--abandoned ${
                      isAbandoned ? "is-active" : ""
                    }`}
                    title={
                      isAbandoned
                        ? `Abandoned: ${fmtDateTitle(b.reading_status_updated_at)}`
                        : "Set abandoned"
                    }
                    type="button"
                  >
                    ✕
                  </button>

                  <button
                    disabled={isBusy}
                    onClick={() => setStatus(b, "finished")}
                    className={`su-action su-action--finished ${
                      isFinished ? "is-active" : ""
                    }`}
                    title={
                      isFinished
                        ? `Finished: ${fmtDateTitle(b.reading_status_updated_at)}`
                        : "Set finished"
                    }
                    type="button"
                  >
                    ✓
                  </button>

                  <button
                    disabled={isBusy}
                    onClick={() => setTopBook(b)}
                    className={`su-action su-action--top ${
                      b?.top_book ? "is-active" : ""
                    }`}
                    title={
                      b?.top_book
                        ? `Top: ${fmtDateTitle(b.top_book_set_at)}`
                        : "Set top book"
                    }
                    type="button"
                  >
                    ★
                  </button>

                  <button
                    disabled={isBusy}
                    onClick={() => openEditor(b)}
                    className="su-action su-action--edit"
                    title={
                      b?.updated_at
                        ? `Edit · updated: ${fmtDateTitle(b.updated_at)}`
                        : "Edit"
                    }
                    type="button"
                  >
                    ✎
                  </button>
                </div>
              );
            })
          : null}
      </div>

      <div className="su-pager">
        <button
          onClick={() => canPrev && setQuery({ page: q.page - 1 })}
          disabled={!canPrev}
          type="button"
        >
          ← Zurück
        </button>

        <div className="su-pager-info">
          Seite <strong>&nbsp;{q.page}&nbsp;</strong> / <strong>&nbsp;{totalPages}</strong>
        </div>

        <button
          onClick={() => canNext && setQuery({ page: q.page + 1 })}
          disabled={!canNext}
          type="button"
        >
          Weiter →
        </button>
      </div>

      {barcodeHistory ? (
        <div className="su-editor">
          <div className="su-history-head">
            <h3 className="su-history-title">Barcode-History: {barcodeHistory.barcode}</h3>
            <button
              type="button"
              className="su-history-close"
              onClick={() => setBarcodeHistory(null)}
            >
              Schließen
            </button>
          </div>

          {barcodeHistory.items.length ? (
            barcodeHistory.items.map((h, i) => (
              <div className="su-history-row" key={h.id || h.book_id || i}>
                {h.title_display || h.title_keyword || h.book_title || h.book_id || "—"}
                <span className="su-history-sub">
                  {h.reading_status ? `${h.reading_status} · ` : ""}
                  {h.assigned_at ? "assigned " : ""}
                  {h.assigned_at ? fmtDate(h.assigned_at) : null}
                  {h.freed_at ? " · freed " : ""}
                  {h.freed_at ? fmtDate(h.freed_at) : null}
                </span>
              </div>
            ))
          ) : (
            <div className="su-history-row">Keine History gefunden.</div>
          )}
        </div>
      ) : null}

      {editingBook ? (
        <div id="edit-book-form" className="su-editor">
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
              const now = new Date().toISOString();
              const patch =
                saved && typeof saved === "object"
                  ? {
                      ...saved,
                      updated_at: saved.updated_at || now,
                      last_action_at: saved.last_action_at || now,
                    }
                  : {
                      ...(payload || {}),
                      updated_at: now,
                      last_action_at: now,
                    };
              const currentId = idOf(editingBook);

              patchRow(currentId, patch);
              closeEditor();
              setRefreshTick((n) => n + 1);
            }}
          />
        </div>
      ) : null}
    </section>
  );
}

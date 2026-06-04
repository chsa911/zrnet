import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listBooks,
  getBook,
  updateBook,
  highlightBook,
  uploadBookCover,
} from "../api/books";
import BookForm from "../components/BookFormSwitcher";
import { Link, useNavigate } from "react-router-dom";
import { coverUrl } from "../utils/covers";

const API_ROOT = import.meta.env.VITE_API_ROOT || "";

const getBarcode = (b) => b?.barcode ?? "—";
const getKauflink = (b) => b?.purchase_url ?? b.kauflink ?? "";

const getAuthor = (b) =>
  b?.author_first_name ??
  b?.author_name ??
  b?.author_lastname ??
  b?.author_last_name ??
  b?.last_name ??
  "—";

const getAuthorId = (b) =>
  b?.author_id ?? b?.authorId ?? b?.author_uuid ?? b?.author?.id ?? null;

const getPages = (b) => (b?.pages ?? b?.pages === 0 ? b.pages : "—");

const getFirstPublishYear = (b) => b?.year_first_published ?? "";

const getGenreAbbr = (b) => b?.genre_abbr ?? b?.genre ?? "";

const getSubgenreAbbr = (b) =>
  b?.subgenre_abbr ?? b?.sub_genre_abbr ?? b?.sub ?? "";

const getGenreTitle = (b) =>
  b?.genre_name ?? b?.genre ?? b?.genre_abbr ?? b?.genre_code ?? "";

const getSubgenreTitle = (b) =>
  b?.subgenre_name ?? b?.subgenre ?? b?.subgenre_abbr ?? b?.subgenre_code ?? "";

const REGION_OPTIONS = [
  { value: "0", label: "Asien" },
  { value: "1", label: "Südliches Afrika" },
  { value: "2", label: "Nordamerika" },
  { value: "3", label: "Südamerika" },
  { value: "4", label: "Mitteleuropa" },
  { value: "5", label: "Ostaustralien" },
  { value: "6", label: "Nordafrika" },
  { value: "7", label: "Westaustralien" },
  { value: "8", label: "Nordeuropa" },
  { value: "9", label: "Südeuropa" },
];

const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return (
    <>
      {d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
      <br />
      {d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
    </>
  );
};

const fmtDateTitle = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const formatPushedAt = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// ── Free-text inline edit ──────────────────────────────────────────────────
function InlineEditable({ value, disabled, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  useEffect(() => { setDraft(value || ""); }, [value]);

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
          if (e.key === "Escape") { setDraft(value || ""); setEditing(false); }
        }}
      />
    );
  }

  return (
    <button type="button" className="su-inline-edit" disabled={disabled} onClick={() => setEditing(true)}>
      {value || "—"}
    </button>
  );
}

// ── Dropdown inline select ─────────────────────────────────────────────────
function InlineSelect({ value, options, disabled, onSave }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    const found = options.find((o) => o.value === value);
    return (
      <button type="button" className="su-inline-edit" disabled={disabled} onClick={() => setEditing(true)}>
        {found?.label || value || "—"}
      </button>
    );
  }

  return (
    <select
      autoFocus
      className="su-inline-input"
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => { onSave(e.target.value); setEditing(false); }}
      onBlur={() => setEditing(false)}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Cover preview modal ────────────────────────────────────────────────────
function CoverPreviewModal({ bookId, url, onReplace, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", border: "4px solid #111",
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 0, maxWidth: "90vw", maxHeight: "90vh",
        }}
      >
        <img
          src={url}
          alt={`Cover for book ${bookId}`}
          style={{ display: "block", maxWidth: "80vw", maxHeight: "70vh", objectFit: "contain" }}
          onError={(e) => { e.target.style.display = "none"; }}
        />
        <div style={{ display: "flex", width: "100%", borderTop: "4px solid #111" }}>
          <button
            type="button"
            onClick={onReplace}
            style={{
              flex: 1, border: 0, borderRight: "4px solid #111", background: "#fff",
              color: "#111", fontWeight: 900, fontSize: 15, padding: "12px 0", cursor: "pointer",
            }}
          >
            Replace
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, border: 0, background: "#111",
              color: "#fff", fontWeight: 900, fontSize: 15, padding: "12px 0", cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cover upload button ────────────────────────────────────────────────────
function CoverImageButton({ book, bookId, isBusy, onUploaded }) {
  const inputRef = useRef(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const hasCover = !!book?.cover_available;
  const url = book?.cover_url || `/uploads/covers/normalized/${bookId}.jpg`;

  async function handleFile(file) {
    if (!file || !bookId) return;
    try {
      await uploadBookCover(bookId, file);
      onUploaded?.();
    } catch (e) {
      console.error(e);
      alert(e?.message || "Cover upload failed");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      {previewOpen && (
        <CoverPreviewModal
          bookId={bookId}
          url={url}
          onReplace={() => { setPreviewOpen(false); inputRef.current?.click(); }}
          onClose={() => setPreviewOpen(false)}
        />
      )}
      <button
        type="button"
        disabled={isBusy}
        className={`su-action su-action--cover ${hasCover ? "is-active" : ""}`}
        title={hasCover ? `Cover exists for book_id ${bookId}. Click to view/replace.` : `Upload cover for book_id ${bookId}`}
        onClick={() => {
          if (hasCover) { setPreviewOpen(true); return; }
          inputRef.current?.click();
        }}
      >
        {hasCover ? "✓" : "—"}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
    </>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function SearchUpdatePage() {
  const navigate = useNavigate();

  const [q, setQ] = useState({
    q: "", page: 1, limit: 20, sortBy: "last_action_at", order: "desc", status: "",
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
  const [highlighted, setHighlighted] = useState({});
  const [featureBusy, setFeatureBusy] = useState(null);
  const debounceRef = useRef(null);

  // Genre + SubGenre lists from DB
  const [genres, setGenres] = useState([]);       // { id, abbr, genre_display }
  const [subGenres, setSubGenres] = useState([]); // { id, genre_id, name, abbr, genre_abbr }

  useEffect(() => {
    fetch(`${API_ROOT}/api/public/sub-genres`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const genreMap = {};
        data.forEach((sg) => {
          if (!genreMap[sg.genre_id]) {
            genreMap[sg.genre_id] = { id: sg.genre_id, genre_display: sg.genre_name, abbr: sg.genre_abbr };
          }
        });
        setGenres(Object.values(genreMap));
        setSubGenres(data);
      })
      .catch(console.error);
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / q.limit)), [total, q.limit]);
  const canPrev = q.page > 1;
  const canNext = q.page * q.limit < total;

  const idOf = (b) => b?._id || b?.id || "";
  const statusOf = (b) => String(b?.reading_status || "").toLowerCase();

  async function handleHighlight(book, type) {
    if (featureBusy) return;
    const id = idOf(book);
    if (!id) return alert("Kein Datensatz-ID gefunden.");
    // Validierung: IMG und Kauflink müssen vorhanden sein
    if (!book?.cover_available) {
    return alert("Kein Cover vorhanden. Bitte zuerst ein Cover hochladen.");
  }
    if (!getKauflink(book)) {
    return alert("Kein Kauflink vorhanden. Bitte zuerst einen Kauflink eintragen.");
  }
    const now = new Date().toISOString();
    setFeatureBusy(type);
    setUpdatingOn(id, true);
    try {
      await highlightBook(id, type);
      setHighlighted(() => ({ [id]: type }));
      setItems((prev) =>
        prev.map((it) => {
          const rowId = idOf(it);
          if (rowId === id) return { ...it, home_featured_slot: type, ...(type === "finished" ? { home_featured_finished_at: now } : {}), ...(type === "received" ? { home_featured_received_at: now } : {}), updated_at: now, last_action_at: now };
          if (type === "finished" && it?.home_featured_slot === "finished") return { ...it, home_featured_slot: null };
          if (type === "received" && it?.home_featured_slot === "received") return { ...it, home_featured_slot: null };
          return it;
        })
      );
    } catch (e) {
      alert(e?.message || "Highlight failed");
    } finally {
      setUpdatingOn(id, false);
      setFeatureBusy(null);
    }
  }

  function searchPatch(value) {
    const trimmed = value.trim();
    const isPages = /^\d+$/.test(trimmed);
    return { q: isPages ? "" : trimmed, pages: isPages ? Number(trimmed) : undefined, page: 1 };
  }

  function setQuery(patch) { setQ((prev) => ({ ...prev, ...patch })); }

  function patchRow(id, patch) {
    if (!id) return;
    setItems((prev) => prev.map((it) => (idOf(it) === id ? { ...it, ...patch } : it)));
  }

  function setUpdatingOn(id, on = true) {
    setUpdating((prev) => {
      const next = new Set(prev);
      if (!id) return next;
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQ((prev) => ({ ...prev, ...searchPatch(searchText) }));
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;
    async function loadBooks() {
      setLoading(true);
      setErr("");
      try {
        const data = await listBooks(q);
        if (cancelled) return;
        const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setItems(list);
        setTotal(Number.isFinite(data?.total) ? data.total : list.length);
      } catch (e) {
        if (!cancelled) { setItems([]); setTotal(0); setErr(e?.message || "Fehler beim Laden"); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadBooks();
    return () => { cancelled = true; };
  }, [q.page, q.limit, q.sortBy, q.order, q.q, q.pages, q.status, refreshTick]);

  async function saveActionField(b, field, value) {
  const id = idOf(b);
  if (!id) return;
  setUpdatingOn(id, true);
  try {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((it) =>
      it?.title_display === b?.title_display && getAuthorId(it) === getAuthorId(b)
        ? { ...it, [field]: value, updated_at: now }
        : it
    ));
    await fetch(`${API_ROOT}/api/admin/books/by-title/action`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title_display: b?.title_display,
        author_id: getAuthorId(b),
        [field]: value,
      }),
    });
    setRefreshTick((n) => n + 1);
  } catch (e) {
    alert(e?.message || "Update fehlgeschlagen");
  } finally {
    setUpdatingOn(id, false);
  }
}

  async function saveGenre(b, abbr) {
    const id = idOf(b);
    if (!id) return alert("Kein Datensatz-ID gefunden.");
    const genre = genres.find((g) => g.abbr === abbr);
    setUpdatingOn(id, true);
    try {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((it) =>
        it?.title_display === b?.title_display && getAuthorId(it) === getAuthorId(b)
          ? { ...it, genre_abbr: abbr, genre_id: genre?.id ?? null, subgenre_abbr: null, sub_genre_id: null, updated_at: now }
          : it
      ));
      await fetch(`${API_ROOT}/api/admin/books/by-title/genre`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title_display: b?.title_display, author_id: getAuthorId(b), genre_abbr: abbr }),
      });
      setRefreshTick((n) => n + 1);
    } catch (e) {
      alert(e?.message || "Genre-Update fehlgeschlagen");
    } finally {
      setUpdatingOn(id, false);
    }
  }

  async function saveSubGenre(b, abbr) {
    const id = idOf(b);
    if (!id) return alert("Kein Datensatz-ID gefunden.");
    const sg = subGenres.find((s) => s.abbr === abbr);
    setUpdatingOn(id, true);
    try {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((it) =>
        it?.title_display === b?.title_display && getAuthorId(it) === getAuthorId(b)
          ? { ...it, subgenre_abbr: abbr, sub_genre_id: sg?.id ?? null, updated_at: now }
          : it
      ));
      await fetch(`${API_ROOT}/api/admin/books/by-title/genre`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title_display: b?.title_display, author_id: getAuthorId(b), sub_genre_abbr: abbr }),
      });
      setRefreshTick((n) => n + 1);
    } catch (e) {
      alert(e?.message || "Subgenre-Update fehlgeschlagen");
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
      patchRow(id, { reading_status: nextStatus, reading_status_updated_at: now, last_action_at: now });
      await updateBook(id, { reading_status: nextStatus });
    } catch (e) {
      patchRow(id, { reading_status: oldStatus, reading_status_updated_at: oldStatusUpdatedAt });
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
      patchRow(id, { top_book: nextTopBook, top_book_set_at: nextTopBook ? now : null, updated_at: now, last_action_at: now });
      await updateBook(id, { top_book: nextTopBook, top_book_set_at: nextTopBook ? now : null });
    } catch (e) {
      patchRow(id, { top_book: oldTopBook, top_book_set_at: oldTopBookSetAt });
      alert(e?.message || "Update TopBook fehlgeschlagen");
    } finally {
      setUpdatingOn(id, false);
    }
  }

  async function openBarcodeHistory(barcode) {
    if (!barcode || barcode === "—") return;
    try {
      const res = await fetch(`/api/books/barcodes/${encodeURIComponent(barcode)}/history`);
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
        document.getElementById("edit-book-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    } catch (e) {
      alert(e?.message || "Buchdetails konnten nicht geladen werden.");
    } finally {
      setUpdatingOn(id, false);
    }
  }

  function closeEditor() { setEditingBook(null); }

  return (
    <section className="zr-section">
      <style>{`
        .zr-section { max-width: none; }
        .su-grid { width: 100%; border: 4px solid #666; border-bottom: 0; border-radius: 0; overflow: hidden; background: #fff; }
        .su-search-row, .su-book-row, .su-header-row {
          display: grid;
          grid-template-columns: 105px 100px minmax(220px, 1fr) 64px 96px 40px 40px 40px 40px 40px 40px 40px 40px 40px 40px 40px 40px 40px 34px;
          align-items: stretch; width: 100%; min-width: 0;
        }
        .su-search-row { min-height: 86px; background: #f1f1f1; border-bottom: 4px solid #666; }
        .su-header-row { min-height: 34px; background: #111; border-bottom: 4px solid #666; }
        .su-book-row { min-height: 72px; background: #fff; border-bottom: 4px solid #666; }
        .su-book-row:nth-child(even) { background: #fafafa; }
        .su-book-row.is-finished { background: #f4f4f4; }
        .su-book-row.is-abandoned { background: #ededed; }
        .su-head { display: flex; align-items: center; justify-content: center; min-width: 0; padding: 0 6px; border-right: 4px solid #666; color: #fff; font-size: 13px; font-weight: 900; letter-spacing: 0; line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .su-head:last-child { border-right: 0; }
        .su-cell { display: flex; align-items: center; min-width: 0; padding: 0 12px; border-right: 4px solid #666; color: #5f5f5f; font-size: clamp(24px, 3vw, 50px); font-weight: 800; letter-spacing: -0.04em; line-height: 1; overflow: hidden; }
        .su-cell:last-child { border-right: 0; }
        .su-cell--search { grid-column: 1 / 4; background: #fff; }
        .su-cell--filters { grid-column: 4 / 19; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #e9e9e9; padding: 12px; }
        .su-search-input { width: 100%; border: 0; outline: 0; background: transparent; color: #111; font: inherit; line-height: 1; padding: 0; }
        .su-search-input::placeholder { color: #9a9a9a; opacity: 1; }
        .su-filter { height: 38px; border: 3px solid #666; border-radius: 0; background: #fff; color: #333; font-size: 15px; font-weight: 700; padding: 0 8px; max-width: 150px; }
        .su-text { display: flex; flex-direction: column; gap: 6px; min-width: 0; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .su-inline-edit { all: unset; cursor: pointer; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .su-inline-edit:hover { background: #fff2a8; }
        .su-inline-input { width: 100%; min-width: 0; border: 3px solid #111; background: #fff; color: #111; font: inherit; font-weight: inherit; letter-spacing: inherit; padding: 4px 6px; box-sizing: border-box; }
        .su-sub { display: block; font-size: 13px; font-weight: 700; color: #777; line-height: 1; letter-spacing: 0; }
        .su-code { color: #111; font-size: clamp(19px, 1.8vw, 34px); font-weight: 850; letter-spacing: -0.04em; }
        .su-code--clickable { cursor: pointer; }
        .su-code--clickable:hover { background: #111; color: #fff; }
        .su-code--clickable:hover .su-sub { color: #fff; }
        .su-author { color: #333; font-size: clamp(18px, 1.7vw, 30px); font-weight: 850; letter-spacing: -0.04em; }
        .su-title { color: #333; font-size: clamp(18px, 1.9vw, 34px); font-weight: 750; letter-spacing: -0.035em; }
        .su-pages { justify-content: flex-end; color: #555; font-size: clamp(18px, 1.7vw, 30px); font-weight: 750; letter-spacing: -0.035em; }
        .su-year { justify-content: flex-end; color: #555; font-size: clamp(18px, 1.7vw, 30px); font-weight: 750; letter-spacing: -0.035em; }
        .su-year .su-inline-edit { overflow: visible; text-overflow: unset; white-space: nowrap; }
        .su-genre, .su-subgenre { justify-content: center; text-align: center; color: #333; font-size: clamp(17px, 1.5vw, 28px); font-weight: 850; letter-spacing: -0.035em; padding: 0 8px; }
        .su-genre .su-inline-edit, .su-subgenre .su-inline-edit { text-align: center; }
        .su-genre select, .su-subgenre select { font-size: 13px; font-weight: 700; width: 100%; }
        .su-action { width: 44px; min-width: 44px; height: 100%; border: 0; border-right: 4px solid #666; border-radius: 0; background: #fff; color: #111; cursor: pointer; font-size: 24px; font-weight: 900; line-height: 1; display: flex; align-items: center; justify-content: center; }
        .su-action:last-child { border-right: 0; }
        .su-action:hover { background: #eee; }
        .su-action--edit { width: 34px; min-width: 34px; max-width: 34px; font-size: 16px; }
        .su-action--abandoned { border-color: #111; background: #fff; color: #111; }
        .su-action--abandoned.is-active { background: #e53935; color: #fff; }
        .su-action--finished.is-active { background: #2e7d32; color: #fff; }
        .su-action--top.is-active { background: #f9a825; color: #fff; }
        .su-action--highlight-finished.is-highlighted { background: #2e7d32; color: #fff; }
        .su-action--highlight-received.is-highlighted { background: #1565c0; color: #fff; }
        .su-action--cover { cursor: pointer; text-decoration: none; }
        .su-action--cover.is-active { background: #2e7d32; color: #fff; }
        .su-action:disabled { cursor: wait; opacity: 0.45; }
        .su-empty, .su-alert { border-bottom: 4px solid #666; padding: 24px; font-size: 26px; font-weight: 800; color: #666; }
        .su-alert--error { color: #8b1111; background: #fff3f3; }
        .su-pager { display: grid; grid-template-columns: auto 1fr auto 1fr auto; align-items: stretch; border: 4px solid #666; border-top: 0; min-height: 58px; background: #f1f1f1; }
        .su-pager button { border: 0; border-right: 4px solid #666; border-radius: 0; background: transparent; color: #111; cursor: pointer; font-size: 20px; font-weight: 850; padding: 0 16px; }
        .su-pager button:last-child { border-right: 0; border-left: 4px solid #666; }
        .su-pager button:disabled { color: #aaa; cursor: default; }
        .su-pager button.su-pager-first { font-size: 15px; font-weight: 700; }
        .su-pager button.su-pager-last { font-size: 15px; font-weight: 700; }
        .su-pager-info { display: flex; align-items: center; justify-content: center; padding: 0 24px; font-size: 18px; font-weight: 800; color: #444; }
        .su-editor { margin-top: 28px; border: 4px solid #666; padding: 18px; background: #fff; }
        .su-history-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
        .su-history-title { margin: 0; font-size: 24px; font-weight: 850; }
        .su-history-close { border: 3px solid #666; background: #fff; color: #111; font-size: 16px; font-weight: 850; padding: 8px 12px; cursor: pointer; }
        .su-history-row { border-top: 3px solid #666; padding: 10px 0; font-size: 18px; font-weight: 750; }
        .su-author-link { color: inherit; text-decoration: none; min-width: 0; width: 100%; display: flex; overflow: hidden; }
        .su-author-link:hover { text-decoration: underline; }
        .su-history-sub { display: block; margin-top: 4px; color: #777; font-size: 13px; font-weight: 700; }
        .su-kauflink { min-width: 90px; text-align: center; }
        .su-kauflink.has-link { background: rgba(0, 180, 0, 0.08); }
        .su-kauflink.missing-link { background: rgba(255, 140, 0, 0.08); }
        .su-kauflink .su-text { width: 100%; display: block; }
        @media (max-width: 1180px) {
          .su-search-row, .su-book-row, .su-header-row { grid-template-columns: 100px 100px minmax(0, 1fr) 70px 96px 64px 40px 40px 40px 40px 40px 40px 34px; }
          .su-action { width: 40px; min-width: 40px; font-size: 22px; }
          .su-action--edit { width: 34px; min-width: 34px; font-size: 16px; }
        }
        @media (max-width: 700px) {
          .su-search-row, .su-book-row, .su-header-row { grid-template-columns: 120px 64px minmax(0, 1fr) 40px 40px 40px 40px 40px 34px; }
          .su-cell--search, .su-cell--filters { grid-column: 1 / -1; }
          .su-cell--filters { border-top: 4px solid #666; }
          .su-header-row .su-head:nth-child(4), .su-book-row .su-pages { display: none; }
          .su-header-row .su-head:nth-child(5), .su-header-row .su-head:nth-child(6), .su-book-row .su-genre, .su-book-row .su-subgenre { display: none; }
        }
        @media (max-width: 620px) {
          .su-search-row, .su-book-row, .su-header-row { grid-template-columns: 92px minmax(0, 1fr) 34px 34px 34px 34px 34px 34px; }
          .su-header-row .su-head:nth-child(2), .su-book-row .su-author { display: none; }
          .su-action { width: 34px; min-width: 34px; font-size: 19px; }
          .su-action--edit { font-size: 15px; }
          .su-filter { max-width: none; flex: 1 1 120px; }
        }
      `}</style>

      <div className="su-grid">
        <form className="su-search-row" onSubmit={(e) => { e.preventDefault(); setQ((prev) => ({ ...prev, ...searchPatch(searchText) })); }}>
          <div className="su-cell su-cell--search">
            <input className="su-search-input" placeholder="Search" value={searchText} onChange={(e) => setSearchText(e.target.value)} aria-label="Search books" />
          </div>
          <div className="su-cell su-cell--filters">
            <select className="su-filter" value={q.sortBy} onChange={(e) => setQuery({ sortBy: e.target.value, page: 1 })} aria-label="Sortieren">
              <option value="last_action_at">Letzte Aktion</option>
              <option value="registered_at">Registriert</option>
              <option value="author_name_display">Autor</option>
              <option value="reading_status_updated_at">Status</option>
              <option value="pages">Seiten</option>
              <option value="genre_abbr">Genre</option>
              <option value="subgenre_abbr">Subgenre</option>
           
            </select>
            <select className="su-filter" value={q.status || ""} onChange={(e) => { const v = e.target.value || ""; if (v) setQuery({ status: v, page: 1, sortBy: "last_action_at", order: "desc" }); else setQuery({ status: "", page: 1 }); }} aria-label="Status">
              <option value="">Alle</option>
              <option value="finished">Finished</option>
              <option value="abandoned">Abandoned</option>
              <option value="finished,abandoned">Finished + Abandoned</option>
            </select>
            <select className="su-filter" value={q.order} onChange={(e) => setQuery({ order: e.target.value, page: 1 })} aria-label="Ordnung">
              <option value="desc">↓</option>
              <option value="asc">↑</option>
            </select>
            <select className="su-filter" value={q.limit} onChange={(e) => setQuery({ limit: Number(e.target.value), page: 1 })} aria-label="Pro Seite">
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
          <div className="su-head">Year</div>
          <div className="su-head">Genre</div>
          <div className="su-head">Sub</div>
         <div className="su-head">Ära</div>
<div className="su-head">Region</div>
<div className="su-head">Land</div>
          <div className="su-head" title="Abandoned">✕</div>
          <div className="su-head" title="Finished">✓</div>
          <div className="su-head" title="Top Book">★</div>
          <div className="su-head" title="Highlight Finished">HF</div>
          <div className="su-head" title="Highlight Received">HR</div>
          <div className="su-head" title="Kauflink">K</div>
          <div className="su-head" title="Cover Image">IMG</div>
          <div className="su-head" title="Edit">✎</div>
        </div>

        {err ? <div className="su-alert su-alert--error">{err}</div> : null}
        {loading ? <div className="su-alert">Lade…</div> : null}
        {!loading && !err && items.length === 0 ? <div className="su-empty">Keine Einträge gefunden.</div> : null}

        {!loading && !err && items.length > 0
          ? items.map((b, i) => {
              const id = idOf(b) || String(i);
              const isBusy = updating.has(id);
              const status = statusOf(b);
              const isAbandoned = status === "abandoned";
              const isFinished = status === "finished";

              const hfDate = b?.home_featured_finished_at ?? b?.highlight_finished_at ?? b?.hf_pushed_at ?? (b?.home_featured_slot === "finished" ? b?.updated_at : null);
              const hrDate = b?.home_featured_received_at ?? b?.highlight_received_at ?? b?.highlight_ready_at ?? b?.hr_pushed_at ?? (b?.home_featured_slot === "received" ? b?.updated_at : null);
              const hfTooltip = hfDate ? `HF pushed: ${formatPushedAt(hfDate)}` : "HF not pushed yet";
              const hrTooltip = hrDate ? `HR pushed: ${formatPushedAt(hrDate)}` : "HR not pushed yet";

              const bookGenreAbbr = getGenreAbbr(b);
              const filteredSubGenres = subGenres.filter(
                (sg) => !bookGenreAbbr || sg.genre_abbr === bookGenreAbbr
              );

              return (
                <div className={`su-book-row ${isFinished ? "is-finished" : isAbandoned ? "is-abandoned" : ""}`} key={id}>
                  <div className="su-cell su-code su-code--clickable" onClick={() => openBarcodeHistory(getBarcode(b))} title={b?.registered_at ? `Registered: ${fmtDateTitle(b.registered_at)}` : "Barcode-History anzeigen"} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openBarcodeHistory(getBarcode(b)); }}>
                    <span className="su-text">{getBarcode(b)}</span>
                  </div>

                  <div className="su-cell su-author" title={b?.name_display ?? b?.author_name_display ?? b?.author_name ?? getAuthor(b)}>
                    {getAuthorId(b) ? (
                      <Link to={`/admin/authors/${getAuthorId(b)}?bookId=${idOf(b)}`} onClick={(e) => e.stopPropagation()} className="su-author-link" title="Edit author">
                        <span className="su-text">{getAuthor(b)}</span>
                      </Link>
                    ) : (
                      <span className="su-text">{getAuthor(b)}</span>
                    )}
                  </div>

                  <div className="su-cell su-title" title={b?.title_display || "—"}>
                    <span className="su-text">
                      <InlineEditable value={b?.title_keyword ?? ""} disabled={isBusy} onSave={(val) => saveActionField(b, "title_keyword", val)} />
                    </span>
                  </div>

                  <div className="su-cell su-pages" title={b?.added_at ? `Added: ${fmtDateTitle(b.added_at)}` : "Added: —"}>
                    <span className="su-text">{getPages(b)}</span>
                  </div>

                  <div className="su-cell su-pages su-year" title={getFirstPublishYear(b) || "-"}>
                    <span className="su-text">
                      <InlineEditable value={getFirstPublishYear(b)} disabled={isBusy} onSave={(val) => saveActionField(b, "year_first_published", val === "" ? null : Number(val))} />
                    </span>
                  </div>

                  {/* Genre dropdown */}
                  <div className="su-cell su-genre" title={getGenreTitle(b)}>
                    <span className="su-text">
                      <InlineSelect
                        value={bookGenreAbbr}
                        disabled={isBusy}
                        options={genres.map((g) => ({ value: g.abbr, label: g.abbr }))}
                        onSave={(val) => saveGenre(b, val)}
                      />
                    </span>
                  </div>

                  {/* Subgenre dropdown – gefiltert nach Genre */}
                  <div className="su-cell su-subgenre" title={getSubgenreTitle(b)}>
                    <span className="su-text">
                      <InlineSelect
                        value={getSubgenreAbbr(b)}
                        disabled={isBusy}
                        options={filteredSubGenres.map((sg) => ({ value: sg.abbr, label: `${sg.abbr} – ${sg.name}` }))}
                        onSave={(val) => saveSubGenre(b, val)}
                      />
                    </span>
                  </div>
{/* Ära */}
<div className="su-cell su-genre" title={b?.action_time_period_display || "—"}>
  <span className="su-text">
    <InlineEditable
      value={b?.action_time_period_display ?? ""}
      disabled={isBusy}
      onSave={(val) => saveActionField(b, "action_time_period_display", val || null)}
    />
  </span>
</div>

{/* Region */}
<div className="su-cell su-genre" title={REGION_OPTIONS.find(r => String(r.value) === String(b?.action_continent))?.label || "—"}>
  <span className="su-text">
    <InlineSelect
      value={b?.action_continent != null ? String(b.action_continent) : ""}
      disabled={isBusy}
      options={REGION_OPTIONS}
      onSave={(val) => saveActionField(b, "action_continent", val === "" ? null : Number(val))}
    />
  </span>
</div>

{/* Land */}
<div className="su-cell su-genre" title={b?.action_country || "—"}>
  <span className="su-text">
    <InlineEditable
      value={b?.action_country ?? ""}
      disabled={isBusy}
      onSave={(val) => saveActionField(b, "action_country", val || null)}
    />
  </span>
</div>
                  <button disabled={isBusy} onClick={() => setStatus(b, "abandoned")} className={`su-action su-action--abandoned ${isAbandoned ? "is-active" : ""}`} title={isAbandoned ? `Abandoned: ${fmtDateTitle(b.reading_status_updated_at)}` : "Set abandoned"} type="button">✕</button>
                  <button disabled={isBusy} onClick={() => setStatus(b, "finished")} className={`su-action su-action--finished ${isFinished ? "is-active" : ""}`} title={isFinished ? `Finished: ${fmtDateTitle(b.reading_status_updated_at)}` : "Set finished"} type="button">✓</button>
                  <button disabled={isBusy} onClick={() => setTopBook(b)} className={`su-action su-action--top ${b?.top_book ? "is-active" : ""}`} title={b?.top_book ? `Top: ${fmtDateTitle(b.top_book_set_at)}` : "Set top book"} type="button">★</button>

                  <button disabled={isBusy || featureBusy !== null} onClick={() => handleHighlight(b, "finished")} className={`su-action su-action--highlight-finished ${highlighted[id] === "finished" || b?.home_featured_slot === "finished" ? "is-highlighted" : ""}`} title={hfTooltip} type="button">HF</button>
                  <button disabled={isBusy || featureBusy !== null} onClick={() => handleHighlight(b, "received")} className={`su-action su-action--highlight-received ${highlighted[id] === "received" || b?.home_featured_slot === "received" ? "is-highlighted" : ""}`} title={hrTooltip} type="button">HR</button>

                 <div
  className={`su-cell su-kauflink ${getKauflink(b) ? "has-link" : "missing-link"}`}
  title={getKauflink(b) ? getKauflink(b) : "Kein Kauflink"}
  onClick={() => navigate(`/admin/books/${idOf(b)}/kauflink`)}
  style={{ cursor: "pointer" }}
>
  {getKauflink(b) ? "K" : "—"}
</div>

                  <CoverImageButton
                    book={b}
                    bookId={id}
                    isBusy={isBusy}
                    onUploaded={() => {
                      const now = new Date().toISOString();
                      patchRow(id, { cover_available: true, cover_url: `/uploads/covers/normalized/${id}.jpg?t=${Date.now()}`, cover_home: `/uploads/covers/normalized/${id}-home.jpg?t=${Date.now()}`, updated_at: now, last_action_at: now });
                      setQuery({ page: 1, sortBy: "last_action_at", order: "desc" });
                      setRefreshTick((n) => n + 1);
                    }}
                  />

                  <button disabled={isBusy} onClick={() => openEditor(b)} className="su-action su-action--edit" title={b?.updated_at ? `Edit · updated: ${fmtDateTitle(b.updated_at)}` : "Edit"} type="button">✎</button>
                </div>
              );
            })
          : null}
      </div>

      <div className="su-pager">
        <button className="su-pager-first" onClick={() => canPrev && setQuery({ page: 1 })} disabled={!canPrev} type="button">|← Erste</button>
        <button onClick={() => canPrev && setQuery({ page: q.page - 1 })} disabled={!canPrev} type="button">← Zurück</button>
        <div className="su-pager-info">Seite <strong>&nbsp;{q.page}&nbsp;</strong> / <strong>&nbsp;{totalPages}</strong></div>
        <button onClick={() => canNext && setQuery({ page: q.page + 1 })} disabled={!canNext} type="button">Weiter →</button>
        <button className="su-pager-last" onClick={() => canNext && setQuery({ page: totalPages })} disabled={!canNext} type="button">Letzte →|</button>
      </div>

      {barcodeHistory ? (
        <div className="su-editor">
          <div className="su-history-head">
            <h3 className="su-history-title">Barcode-History: {barcodeHistory.barcode}</h3>
            <button type="button" className="su-history-close" onClick={() => setBarcodeHistory(null)}>Schließen</button>
          </div>
          {barcodeHistory.items.length ? (
            barcodeHistory.items.map((h, i) => (
              <div className="su-history-row" key={h.id || h.book_id || i}>
                {h.title_display || h.title_keyword || h.book_title || h.book_id || "—"}
                <span className="su-history-sub">
                  {h.reading_status ? `${h.reading_status} · ` : ""}
                  {h.assigned_at ? "assigned " : ""}{h.assigned_at ? fmtDate(h.assigned_at) : null}
                  {h.freed_at ? " · freed " : ""}{h.freed_at ? fmtDate(h.freed_at) : null}
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
              const patch = saved && typeof saved === "object"
                ? { ...saved, updated_at: saved.updated_at || now, last_action_at: saved.last_action_at || now }
                : { ...(payload || {}), updated_at: now, last_action_at: now };
              patchRow(idOf(editingBook), patch);
              closeEditor();
              setRefreshTick((n) => n + 1);
            }}
          />
        </div>
      ) : null}
    </section>
  );
}

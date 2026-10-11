import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminNavRow from "../components/AdminNavRow";
import RequireAdmin from "../components/RequireAdmin";
import { listBooks, updateBook } from "../api/books";
import { coverUrl } from "../utils/covers";
import "./AdminCoversPage.css";

const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { value: "added_at:desc", label: "Erfasst – neueste zuerst" },
  { value: "added_at:asc", label: "Erfasst – älteste zuerst" },
  { value: "registered_at:desc", label: "Registriert – neueste zuerst" },
  { value: "registered_at:asc", label: "Registriert – älteste zuerst" },
];

const REG_FILTERS = [
  { value: "", label: "Alle" },
  { value: "true", label: "Registriert" },
  { value: "false", label: "Nicht registriert" },
];

// Editable fields (left column). key = field in the API / PATCH payload.
const FIELDS = [
  { key: "author_firstname", label: "Autor Vorname" },
  { key: "author_lastname", label: "Autor Nachname" },
  { key: "title_display", label: "Titel", wide: true },
  { key: "subtitle_display", label: "Untertitel", wide: true },
  { key: "publisher_name_display", label: "Verlag" },
  { key: "pages", label: "Seiten", type: "number" },
  { key: "year_first_published", label: "Erstveröffentlichung (Jahr)", type: "number" },
  { key: "isbn13", label: "ISBN" },
  { key: "language", label: "Sprache (z. B. de)" },
  { key: "original_language", label: "Originalsprache" },
  { key: "comment", label: "Kommentar", wide: true, multiline: true },
];

const str = (v) => (v === null || v === undefined ? "" : String(v));

function toDraft(b) {
  return {
    author_firstname: str(b.author_firstname ?? b.author_first_name),
    author_lastname: str(b.author_lastname ?? b.author_last_name),
    title_display: str(b.title_display),
    subtitle_display: str(b.subtitle_display),
    publisher_name_display: str(b.publisher_name_display ?? b.publisher_name),
    pages: str(b.pages),
    year_first_published: str(b.year_first_published ?? b.first_publish_year),
    isbn13: str(b.isbn13 || b.isbn10),
    language: str(b.language),
    original_language: str(b.original_language),
    comment: str(b.comment),
  };
}

// Only send what changed – mirrors Search & Update: a changed author/publisher
// name is resolved by name (id cleared), not renamed in place.
function toPatch(orig, draft) {
  const patch = {};
  for (const { key, type } of FIELDS) {
    if (draft[key] === orig[key]) continue;
    const v = draft[key].trim();
    patch[key] = type === "number" ? (v === "" ? null : Number(v)) : v;
  }
  if ("author_firstname" in patch || "author_lastname" in patch) {
    patch.author_firstname = draft.author_firstname.trim();
    patch.author_lastname = draft.author_lastname.trim();
    patch.name_display = [patch.author_firstname, patch.author_lastname].filter(Boolean).join(" ");
    patch.author_id = "";
  }
  if ("publisher_name_display" in patch) patch.publisher_id = "";
  if ("isbn13" in patch) {
    const digits = patch.isbn13.replace(/[^0-9Xx]/g, "");
    delete patch.isbn13;
    patch.isbn_raw = digits;
  }
  return patch;
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("de-DE");
}

function CoverCard({ book, onSaved }) {
  const [orig, setOrig] = useState(() => toDraft(book));
  const [draft, setDraft] = useState(orig);
  const [state, setState] = useState({ busy: false, msg: "", err: "" });
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const d = toDraft(book);
    setOrig(d);
    setDraft(d);
  }, [book]);

  const dirty = FIELDS.some(({ key }) => draft[key] !== orig[key]);
  const registered = !!book.registered_at;
  const src = coverUrl(book);

  const set = (key) => (e) => {
    const value = e.target.value;
    setDraft((d) => ({ ...d, [key]: value }));
    setState((s) => (s.msg ? { ...s, msg: "" } : s));
  };

  async function save() {
    const patch = toPatch(orig, draft);
    if (!Object.keys(patch).length) return;
    setState({ busy: true, msg: "", err: "" });
    try {
      const res = await updateBook(book.id, patch);
      const updated = res && typeof res === "object" && res.id ? res : null;
      onSaved(book.id, updated, draft);
      setState({ busy: false, msg: "Gespeichert", err: "" });
    } catch (e) {
      setState({ busy: false, msg: "", err: e?.message || "Speichern fehlgeschlagen" });
    }
  }

  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (dirty && !state.busy) save();
    }
  }

  return (
    <article className={`zr-cover-card${dirty ? " is-dirty" : ""}`} onKeyDown={onKeyDown}>
      <div className="zr-cover-fields">
        <div className="zr-cover-meta">
          <span className={`zr-cover-badge ${registered ? "is-reg" : "is-unreg"}`}>
            {registered ? "Registriert" : "Nicht registriert"}
          </span>
          <span>Erfasst: {fmtDate(book.added_at)}</span>
          <span>Registriert: {fmtDate(book.registered_at)}</span>
          {book.barcode ? <span>Barcode: {book.barcode}</span> : null}
          {book.reading_status ? <span>Status: {book.reading_status}</span> : null}
          <Link to={`/book/${book.id}`} target="_blank" rel="noreferrer">Buchseite ↗</Link>
        </div>

        {FIELDS.map(({ key, label, wide, type, multiline }) => {
          const id = `cv-${book.id}-${key}`;
          return (
            <label key={key} htmlFor={id} className={wide ? "is-wide" : undefined}>
              {label}
              {multiline ? (
                <textarea id={id} rows={2} value={draft[key]} onChange={set(key)} />
              ) : (
                <input
                  id={id}
                  type={type === "number" ? "number" : "text"}
                  inputMode={type === "number" ? "numeric" : undefined}
                  value={draft[key]}
                  onChange={set(key)}
                />
              )}
            </label>
          );
        })}

        <div className="zr-cover-actions">
          <button className="zr-btn2" onClick={save} disabled={!dirty || state.busy}>
            {state.busy ? "Speichern…" : "Speichern"}
          </button>
          {dirty && !state.busy ? (
            <button className="zr-btn2 zr-btn2--ghost" onClick={() => setDraft(orig)}>
              Verwerfen
            </button>
          ) : null}
          {state.msg ? <span style={{ color: "#1e6b45" }}>{state.msg}</span> : null}
          {state.err ? <span style={{ color: "#b00020" }}>{state.err}</span> : null}
        </div>
      </div>

      <div className="zr-cover-image">
        {src && !imgFailed ? (
          <a href={src} target="_blank" rel="noreferrer" title="Cover in voller Größe öffnen">
            <img src={src} alt={`Cover: ${draft.title_display || "ohne Titel"}`} loading="lazy" onError={() => setImgFailed(true)} />
          </a>
        ) : (
          <div className="zr-cover-missing">Kein Cover gefunden</div>
        )}
      </div>
    </article>
  );
}

function Inner() {
  const [sort, setSort] = useState(SORT_OPTIONS[0].value);
  const [registered, setRegistered] = useState("");
  const [onlyWithCover, setOnlyWithCover] = useState(true);
  const [pagesInput, setPagesInput] = useState("");
  const [pagesQuery, setPagesQuery] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Seiten-Suche: kurz nach dem Tippen auslösen
  useEffect(() => {
    const t = setTimeout(() => {
      setPagesQuery(pagesInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [pagesInput]);

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setErr("");
      const [sortBy, order] = sort.split(":");
      try {
        const res = await listBooks(
          {
            sortBy,
            order,
            registered,
            hasCover: onlyWithCover ? "true" : "",
            pages: /^\d+$/.test(pagesQuery) ? pagesQuery : "",
            page,
            limit: PAGE_SIZE,
          },
          { signal }
        );
        setData({
          items: Array.isArray(res?.items) ? res.items : [],
          total: Number(res?.total) || 0,
          pages: Number(res?.pages) || 1,
        });
      } catch (e) {
        if (e?.name !== "AbortError") setErr(e?.message || "Laden fehlgeschlagen");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [sort, registered, onlyWithCover, pagesQuery, page]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  function onSaved(id, updated, draft) {
    setData((d) => ({
      ...d,
      items: d.items.map((it) => {
        if (it.id !== id) return it;
        // PATCH response carries no cover info – keep the cover fields from the list
        if (updated) {
          return { ...it, ...updated, cover_available: it.cover_available, cover_url: it.cover_url, cover_home: it.cover_home };
        }
        return { ...it, ...draft, pages: draft.pages === "" ? null : Number(draft.pages) };
      }),
    }));
  }

  const resetPage = (fn) => (v) => {
    fn(v);
    setPage(1);
  };

  return (
    <section className="zr-section">
      <AdminNavRow />
      <h1 style={{ marginBottom: 6 }}>Cover</h1>
      <p className="zr-lede" style={{ marginTop: 0 }}>
        Links die Buchdaten zum Bearbeiten, rechts das verwendete Cover vom Server.
      </p>

      <div className="zr-covers-toolbar">
        <label style={{ width: 130 }}>
          Seiten
          <input
            type="search"
            inputMode="numeric"
            value={pagesInput}
            onChange={(e) => setPagesInput(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="z. B. 328"
            aria-label="Nach Seitenzahl suchen"
          />
        </label>

        <label style={{ minWidth: 240 }}>
          Sortierung
          <select value={sort} onChange={(e) => resetPage(setSort)(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <div role="group" aria-label="Registrierung filtern" className="zr-covers-seg">
          {REG_FILTERS.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              aria-pressed={registered === f.value}
              onClick={() => resetPage(setRegistered)(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingBottom: 8 }}>
          <input
            type="checkbox"
            checked={onlyWithCover}
            onChange={(e) => resetPage(setOnlyWithCover)(e.target.checked)}
            style={{ width: "auto" }}
          />
          nur mit Cover
        </label>

        <span style={{ paddingBottom: 8, opacity: 0.7 }}>
          {loading ? "Laden…" : `${data.total} Bücher`}
        </span>
      </div>

      {err ? <p style={{ color: "#b00020" }}>{err}</p> : null}
      {!loading && !err && !data.items.length ? <p>Keine Bücher für diese Auswahl.</p> : null}

      <div className="zr-covers-list" style={{ opacity: loading ? 0.6 : 1 }}>
        {data.items.map((b) => (
          <CoverCard key={b.id} book={b} onSaved={onSaved} />
        ))}
      </div>

      {data.pages > 1 ? (
        <nav className="zr-covers-pager" aria-label="Seiten">
          <button className="zr-btn2 zr-btn2--ghost" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            ← Zurück
          </button>
          <span>
            Seite {page} von {data.pages}
          </span>
          <button className="zr-btn2 zr-btn2--ghost" disabled={page >= data.pages || loading} onClick={() => setPage((p) => p + 1)}>
            Weiter →
          </button>
        </nav>
      ) : null}
    </section>
  );
}

export default function AdminCoversPage() {
  return (
    <RequireAdmin>
      <Inner />
    </RequireAdmin>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminNavRow from "../components/AdminNavRow";
import { listBooks, updateBook } from "../api/books";

import { buildPhysCode, formatPhysCode, isValidPageNumPos, PAGE_NUM_POS_HELP } from "../utils/pageNumPos";

// Platzhalter-Suche: "ob0x" / "ob0*" = beginnt mit ob0, "ob01?" = ein beliebiges
// Zeichen. Liefert eine RegExp für den aktuellen Barcode oder null (normaler Scan).
function barcodeWildcardRegex(input) {
  const s = String(input || "").trim().toLowerCase().replace(/\s+/g, "");
  if (!s || !/^[a-z0-9*?]+$/.test(s)) return null;
  const pat = s.replace(/([0-9])x/g, "$1*");
  if (!/[*?]/.test(pat) || !/[a-z0-9]/.test(pat)) return null;
  const body = pat.replace(/\*+/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${body}$`, "i");
}

// Prüfen & Ergänzen – wie Search & Update, aber mit den physischen Feldern.
// Barcode scannen -> Zeile erscheint -> Seiten abgleichen, Breite/Höhe prüfen,
// Position / Kapitel / letztes Wort ergänzen. Alle Felder sind direkt editierbar.
//
// Tastatur in einer Zeile:  Enter = nächstes Feld, im letzten Feld = speichern
//                           und weiter zur nächsten Zeile; Strg/Cmd+Enter = speichern;
//                           Esc = Zeile zurücksetzen.

const EDIT_KEYS = ["pages", "width_cm", "height_cm", "page_num_pos", "chapters", "last_word", "language"];
const LANG_RE = /^[a-z]{2}(-[a-z]{2})?$/i;
const LANG_SUGGEST = ["de", "en", "fr", "es", "it", "nl", "pt", "sv", "da", "no", "pl", "ru", "tr", "la"];
const SIZE_TOL_MM = 2;
const GRID = "120px 80px 80px 80px 56px 64px 140px 60px 175px 48px minmax(160px, 1fr)";

function str(v) {
  return v === null || v === undefined ? "" : String(v);
}
function num(v) {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
// Kurzformen für die Sprache: d -> de, e -> en …
const LANG_SHORT = { d: "de", e: "en", f: "fr", s: "es", i: "it", n: "nl", p: "pt", r: "ru", l: "la" };
function expandLang(v) {
  const t = String(v ?? "").trim().toLowerCase();
  return LANG_SHORT[t] || t;
}
// Vorgaben, wenn noch nichts gespeichert ist
const DEFAULTS = { page_num_pos: "ur", language: "de" };
function draftWithDefaults(b) {
  const d = draftFromBook(b);
  for (const [k, v] of Object.entries(DEFAULTS)) if (!String(d[k] ?? "").trim()) d[k] = v;
  return d;
}

function draftFromBook(b) {
  return Object.fromEntries(EDIT_KEYS.map((k) => [k, str(b?.[k])]));
}
function isSame(k, a, b) {
  if (k === "language") return expandLang(a) === expandLang(b);
  if (k === "last_word" || k === "page_num_pos") return String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
  return num(a) === num(b);
}
function errText(e) {
  const c = e?.code || e?.data?.error;
  if (c === "phys_code_taken") return "Nummer schon an anderes Buch vergeben";
  if (c === "width_cannot_be_cleared") return "Breite kann nicht gelöscht werden";
  if (c === "height_cannot_be_cleared") return "Höhe kann nicht gelöscht werden";
  if (c === "invalid_language") return "Sprache ungültig (z. B. de, en, fr)";
  if (c === "timeout" || c === "network_error") return "Keine Antwort – nochmal speichern";
  return e?.message || "Fehler beim Speichern";
}
function readPref(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function writePref(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

// ── eine Zeile ──────────────────────────────────────────────────────────────
const CheckRow = React.memo(function CheckRow({ book, index, registerFirst, focusRow, onSaved, muted = false, extraHint = null }) {
  const [draft, setDraft] = useState(() => draftWithDefaults(book));
  const touchedRef = useRef(false); // Autosave nur, wenn in der Zeile wirklich gearbeitet wurde
  const [saving, setSaving] = useState(false);
  const [rowErr, setRowErr] = useState("");
  const [flash, setFlash] = useState(false);
  const refs = useRef({});
  const rowRef = useRef(null);
  const savingRef = useRef(false);
  const lastSavedRef = useRef(null); // Entwurf, der gerade gespeichert wurde (gegen Doppel-Speichern)

  // neue Daten vom Server -> Entwurf zurücksetzen
  useEffect(() => {
    setDraft(draftWithDefaults(book));
    touchedRef.current = false;
    lastSavedRef.current = null;
  }, [book]);

  const orig = useMemo(() => draftFromBook(book), [book]);
  const changed = EDIT_KEYS.filter((k) => !isSame(k, draft[k], orig[k]));
  const dirty = changed.length > 0;
  const preview = buildPhysCode(draft);
  const posInvalid = draft.page_num_pos.trim() !== "" && !isValidPageNumPos(draft.page_num_pos);
  const langInvalid = draft.language.trim() !== "" && !LANG_RE.test(expandLang(draft.language));

  function sizeDiffMm(k) {
    const a = num(draft[k]);
    const b = num(orig[k]);
    if (a === null || b === null) return null;
    const d = Math.round((a - b) * 10);
    return Math.abs(d) > SIZE_TOL_MM ? d : null;
  }

  function cls(k) {
    const empty = String(draft[k] ?? "").trim() === "";
    if (k === "page_num_pos" && posInvalid) return "pc-in is-bad";
    if (k === "language" && langInvalid) return "pc-in is-bad";
    if (changed.includes(k)) return "pc-in is-changed";
    if (empty && ["width_cm", "height_cm", "page_num_pos", "last_word"].includes(k)) return "pc-in is-missing";
    return "pc-in";
  }
  function tip(k) {
    if (k === "page_num_pos") return PAGE_NUM_POS_HELP;
    if (k === "language") return `Sprache dieses Exemplars (de, en, fr … · Kurz: d e f s i n p)${changed.includes(k) ? ` · gespeichert: ${orig[k] || "—"}` : ""}`;
    if (changed.includes(k)) return `gespeichert: ${orig[k] || "—"}`;
    return undefined;
  }

  async function save() {
    if (savingRef.current) return false;
    const draftKey = JSON.stringify(draft);
    if (lastSavedRef.current === draftKey) return true;
    if (posInvalid) {
      setRowErr("Position ungültig");
      return false;
    }
    if (langInvalid) {
      setRowErr("Sprache ungültig (z. B. de, en, fr)");
      return false;
    }
    if (!dirty) {
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
      return true;
    }
    const payload = {};
    for (const k of changed) {
      const v = String(draft[k] ?? "").trim();
      if (k === "width_cm" || k === "height_cm") {
        if (v) payload[k] = v.replace(",", ".");
      } else if (k === "pages" || k === "chapters") {
        payload[k] = v === "" ? null : Number(v);
      } else if (k === "page_num_pos") {
        payload[k] = v ? v.toLowerCase() : null;
      } else if (k === "last_word") {
        if (v) payload[k] = v;
      } else if (k === "language") {
        payload[k] = v ? expandLang(v) : null;
      }
    }
    savingRef.current = true;
    setSaving(true);
    setRowErr("");
    try {
      const saved = Object.keys(payload).length ? await updateBook(book.id || book._id, payload) : null;
      lastSavedRef.current = draftKey;
      onSaved(book.id || book._id, saved);
      setFlash(true);
      setTimeout(() => setFlash(false), 900);
      return true;
    } catch (e) {
      setRowErr(errText(e));
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  // Autosave: Fokus verlässt die Zeile (anderes Feld, Suchfeld, nächster Scan)
  function onRowBlur(e) {
    if (rowRef.current && e.relatedTarget && rowRef.current.contains(e.relatedTarget)) return;
    if (touchedRef.current && dirty && !posInvalid && !langInvalid) save();
  }

  function onKey(k) {
    return async (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDraft(draftWithDefaults(book));
        touchedRef.current = false;
        setRowErr("");
        lastSavedRef.current = null;
        return;
      }
      if (e.key !== "Enter") return;
      e.preventDefault();
      touchedRef.current = true;
      const last = k === EDIT_KEYS[EDIT_KEYS.length - 1];
      if (e.ctrlKey || e.metaKey || last) {
        const ok = await save();
        if (ok && last) focusRow(index + 1);
        return;
      }
      const next = refs.current[EDIT_KEYS[EDIT_KEYS.indexOf(k) + 1]];
      next?.focus();
      next?.select?.();
    };
  }

  const set = (k) => (e) => {
    touchedRef.current = true;
    setRowErr("");
    setDraft((p) => ({ ...p, [k]: e.target.value }));
  };

  const input = (k, extra = {}) => (
    <input
      ref={(el) => {
        refs.current[k] = el;
        if (k === "pages") registerFirst(index, el);
      }}
      className={cls(k)}
      title={tip(k)}
      value={draft[k]}
      onChange={set(k)}
      onKeyDown={onKey(k)}
      onFocus={(e) => e.target.select()}
      autoComplete="off"
      autoCapitalize="off"
      disabled={saving}
      {...extra}
    />
  );

  const wDiff = sizeDiffMm("width_cm");
  const hDiff = sizeDiffMm("height_cm");
  const pagesChanged = changed.includes("pages") && orig.pages !== "";

  return (
    <div ref={rowRef} onBlur={onRowBlur} className={`pc-row ${flash ? "is-flash" : ""} ${dirty ? "is-dirty" : ""} ${muted ? "is-muted" : ""}`}>
      <div className="pc-cell pc-mono pc-code-cell" title={`${muted ? "Barcode-Treffer aus History/Konflikt · " : ""}${book?.title_display || "(ohne Titel)"}${book?.author_name_display ? " – " + book.author_name_display : ""}${book?.reading_status ? " · " + book.reading_status : ""}`}>
        <Link to={`/admin/search-update?q=${encodeURIComponent(book?.barcode || "")}`} tabIndex={-1}>
          {book?.barcode || "—"}
        </Link>
      </div>
      {input("pages", { inputMode: "numeric" })}
      {input("width_cm", { inputMode: "decimal", placeholder: "cm" })}
      {input("height_cm", { inputMode: "decimal", placeholder: "cm" })}
      {input("page_num_pos", { maxLength: 2, placeholder: "ur" })}
      {input("chapters", { inputMode: "numeric" })}
      {input("last_word", { placeholder: "Wort" })}
      {input("language", { maxLength: 5, placeholder: "de", list: "pc-lang-list" })}
      <div className={`pc-cell pc-mono pc-code ${preview ? "" : "is-incomplete"}`} title={book?.phys_code ? `gespeichert: ${formatPhysCode(book.phys_code)}` : "noch keine Nummer"}>
        {preview ? formatPhysCode(preview) : book?.phys_code ? formatPhysCode(book.phys_code) : "—"}
      </div>
      <button type="button" className={`pc-save ${dirty ? "is-dirty" : ""}`} onClick={save} disabled={saving} title={dirty ? `Speichern (${changed.join(", ")})` : "Geprüft"}>
        {saving ? "…" : dirty ? "💾" : "✓"}
      </button>
      <div className="pc-cell pc-hint">
        {extraHint}
        {rowErr ? <span className="pc-err">{rowErr}</span> : null}
        {pagesChanged ? <span className="pc-warn">Seiten ≠ {orig.pages} – richtiges Buch?</span> : null}
        {!pagesChanged && !orig.pages ? <span className="pc-warn">Seiten fehlen</span> : null}
        {wDiff !== null ? <span className="pc-warn">Breite {wDiff > 0 ? "+" : ""}{wDiff} mm</span> : null}
        {hDiff !== null ? <span className="pc-warn">Höhe {hDiff > 0 ? "+" : ""}{hDiff} mm</span> : null}
        {!orig.width_cm || !orig.height_cm ? <span className="pc-err">Maße unvollständig</span> : null}
      </div>
    </div>
  );
});

// ── Seite ───────────────────────────────────────────────────────────────────
export default function AdminBarcodeCheckPage() {
  const [searchText, setSearchText] = useState("");
  const [q, setQ] = useState(() => ({
    q: "",
    page: 1,
    limit: readPref("pc.limit", 50),
    incomplete: readPref("pc.incomplete", true),
    barcoded: readPref("pc.barcoded", true),
    sortBy: readPref("pc.sortBy", "last_action_at"),
    order: readPref("pc.order", "desc"),
  }));
  const [items, setItems] = useState([]);
  const [others, setOthers] = useState([]);
  const [exactFound, setExactFound] = useState(true); // weitere Treffer zum Barcode (History / Konflikt / Teil-Treffer)
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [savedCount, setSavedCount] = useState(0);

  const searchRef = useRef(null);
  const firstInputs = useRef({});

  const setQuery = (patch) => setQ((p) => ({ ...p, ...patch }));

  useEffect(() => {
    writePref("pc.limit", q.limit);
    writePref("pc.incomplete", q.incomplete);
    writePref("pc.barcoded", q.barcoded);
    writePref("pc.sortBy", q.sortBy);
    writePref("pc.order", q.order);
  }, [q.limit, q.incomplete, q.barcoded, q.sortBy, q.order]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setErr("");
    const wildcard = barcodeWildcardRegex(q.q);
    listBooks(
      {
        q: q.q,
        page: q.page,
        limit: q.limit,
        sortBy: q.sortBy,
        order: q.order,
        // bei einer gezielten Suche (Barcode) nicht wegfiltern
        // bei Platzhalter-Suche (ob0x) gelten die Filter weiterhin
        incomplete: q.q && !wildcard ? undefined : q.incomplete ? "true" : undefined,
        barcoded: q.q && !wildcard ? undefined : q.barcoded ? "true" : undefined,
      },
      { signal: ctrl.signal }
    )
      .then((data) => {
        let list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        let rest = [];
        // Scan: nur das Buch, das den Barcode AKTUELL hat. Alles andere (frühere
        // Bücher aus der History, Konflikte, Teil-Treffer) nur als Hinweis –
        // oder grau, wenn der Barcode gerade keinem Buch gehört.
        if (wildcard) {
          // Platzhalter: alle Bücher, deren AKTUELLER Barcode passt; Treffer nur
          // über die History/Konflikte fallen weg.
          list = list.filter((b) => wildcard.test(String(b?.barcode || "")));
          setExactFound(true);
        } else if (q.q) {
          const needle = q.q.trim().toLowerCase();
          const exact = list.filter((b) => String(b?.barcode || "").toLowerCase() === needle);
          rest = list.filter((b) => String(b?.barcode || "").toLowerCase() !== needle);
          if (exact.length) list = exact;
          else {
            list = rest;
            rest = [];
          }
          setExactFound(exact.length > 0);
        } else {
          setExactFound(true);
        }
        setItems(list);
        setOthers(rest);
        setTotal(Number.isFinite(data?.total) ? data.total : list.length);
        // gescannter Barcode -> direkt ins Seiten-Feld der ersten Zeile
        if (q.q && list.length) setTimeout(() => focusRow(0), 0);
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setItems([]);
        setOthers([]);
        setTotal(0);
        setErr(e?.message || "Fehler beim Laden");
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.q, q.page, q.limit, q.incomplete, q.barcoded, q.sortBy, q.order]);

  const registerFirst = useCallback((i, el) => {
    firstInputs.current[i] = el;
  }, []);

  const focusRow = useCallback((i) => {
    const el = firstInputs.current[i];
    if (el) {
      el.focus();
      el.select?.();
    } else {
      // keine weitere Zeile -> zurück zur Suche (nächsten Barcode scannen)
      searchRef.current?.focus();
      searchRef.current?.select();
    }
  }, []);

  const onSaved = useCallback((id, saved) => {
    setSavedCount((n) => n + 1);
    if (saved) setItems((list) => list.map((b) => ((b.id || b._id) === id ? { ...b, ...saved } : b)));
  }, []);

  function submitSearch(e) {
    e.preventDefault();
    const v = searchText.trim();
    if (v === q.q) {
      if (items.length) focusRow(0);
      return;
    }
    setQuery({ q: v, page: 1 });
  }

  const totalPages = Math.max(1, Math.ceil(total / q.limit));
  const canPrev = q.page > 1;
  const canNext = q.page < totalPages;

  return (
    <section className="pc-page">
      <style>{`
        .pc-page { max-width: 1400px; margin: 0 auto; padding: 12px; }
        .pc-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 10px 0; }
        .pc-search { flex: 1 1 260px; font-size: 18px; padding: 8px 10px; font-family: monospace; border: 3px solid #666; border-radius: 6px; }
        .pc-bar label { display: flex; gap: 4px; align-items: center; font-weight: 700; font-size: 14px; white-space: nowrap; }
        .pc-bar select { font-size: 14px; padding: 6px; }
        .pc-meta { font-size: 13px; opacity: .8; margin-left: auto; }
        .pc-scroll { overflow-x: auto; border: 4px solid #666; }
        .pc-table { min-width: 960px; }
        .pc-head, .pc-row { display: grid; grid-template-columns: ${GRID}; align-items: stretch; }
        .pc-head { background: #e5e7eb; font-weight: 900; font-size: 13px; position: sticky; top: 0; z-index: 1; }
        .pc-head > div { padding: 6px; border-right: 1px solid #bbb; }
        .pc-row { border-top: 1px solid #ddd; background: #fff; transition: background .3s; }
        .pc-row.is-dirty { background: #fffbeb; }
        .pc-row.is-flash { background: #dcfce7; }
        .pc-row.is-muted { opacity: .6; }
        .pc-cell { padding: 6px; font-size: 14px; border-right: 1px solid #eee; display: flex; align-items: center; min-width: 0; }
        .pc-ellip { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; line-height: 26px; }
        .pc-mono { font-family: monospace; }
        .pc-code { font-size: 13px; font-weight: 700; }
        .pc-code.is-incomplete { color: #9ca3af; }
        .pc-in { width: 100%; box-sizing: border-box; border: 0; border-right: 1px solid #eee; padding: 6px; font-size: 16px; font-weight: 700; background: transparent; outline: none; min-width: 0; }
        .pc-in:focus { box-shadow: inset 0 0 0 2px #2563eb; background: #eff6ff; }
        .pc-in.is-changed { background: #fde68a; }
        .pc-in.is-missing { background: #fee2e2; }
        .pc-in.is-bad { background: #fca5a5; }
        .pc-save { border: 0; background: #f3f4f6; font-size: 18px; cursor: pointer; }
        .pc-save.is-dirty { background: #fbbf24; }
        .pc-code-cell a { color: inherit; font-weight: 700; text-decoration: none; }
        .pc-code-cell a:hover { text-decoration: underline; }
        .pc-hint { gap: 8px; flex-wrap: wrap; }
        .pc-warn { color: #b45309; font-weight: 700; font-size: 12px; }
        .pc-err { color: #b91c1c; font-weight: 700; font-size: 12px; }
        .pc-alert { padding: 10px; font-weight: 700; }
        .pc-pager { display: flex; gap: 8px; justify-content: center; align-items: center; margin-top: 10px; }
        .pc-pager button { padding: 8px 14px; font-weight: 700; }
        .pc-help { font-size: 12px; opacity: .75; margin-top: 6px; }
      `}</style>

      <AdminNavRow />

      <form className="pc-bar" onSubmit={submitSearch}>
        <input
          ref={searchRef}
          className="pc-search"
          placeholder="Barcode scannen + Enter"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onFocus={(e) => e.target.select()}
          autoComplete="off"
          autoCapitalize="off"
        />
        {q.q ? (
          <button type="button" onClick={() => { setSearchText(""); setQuery({ q: "", page: 1 }); searchRef.current?.focus(); }}>
            ✕ Suche
          </button>
        ) : null}
        <label title="Nur Bücher ohne vollständige Buch-Nummer (wirkt nur ohne Suchbegriff)">
          <input type="checkbox" checked={q.incomplete} onChange={(e) => setQuery({ incomplete: e.target.checked, page: 1 })} />
          nur unvollständige
        </label>
        <label title="Nur Bücher mit Barcode (wirkt nur ohne Suchbegriff)">
          <input type="checkbox" checked={q.barcoded} onChange={(e) => setQuery({ barcoded: e.target.checked, page: 1 })} />
          nur mit Barcode
        </label>
        <select value={q.sortBy} onChange={(e) => setQuery({ sortBy: e.target.value, page: 1 })} aria-label="Sortieren">
          <option value="last_action_at">Letzte Aktion</option>
          <option value="registered_at">Registriert</option>
          <option value="pages">Seiten</option>
          <option value="title_keyword">Titel</option>
          <option value="author_name_display">Autor</option>
        </select>
        <select value={q.order} onChange={(e) => setQuery({ order: e.target.value, page: 1 })} aria-label="Ordnung">
          <option value="desc">↓</option>
          <option value="asc">↑</option>
        </select>
        <select value={q.limit} onChange={(e) => setQuery({ limit: Number(e.target.value), page: 1 })} aria-label="Pro Seite">
          {[20, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="pc-meta">{total} Bücher · {savedCount} gespeichert</span>
      </form>

      <div className="pc-scroll">
        <div className="pc-table">
          <div className="pc-head">
            <div>Bookcode</div>
            <div>Seiten</div>
            <div>Breite</div>
            <div>Höhe</div>
            <div title={PAGE_NUM_POS_HELP}>Pos</div>
            <div>Kap.</div>
            <div>Letztes Wort</div>
            <div title="Sprache dieses Exemplars">Spr.</div>
            <div>Nummer</div>
            <div></div>
            <div>Hinweis</div>
          </div>
          {err ? <div className="pc-alert" style={{ color: "#b91c1c" }}>{err}</div> : null}
          {loading ? <div className="pc-alert">Lade…</div> : null}
          {!loading && !err && !items.length ? <div className="pc-alert">Keine Bücher gefunden.</div> : null}
          {!loading && !err && q.q && !exactFound && items.length ? (
            <div className="pc-alert" style={{ color: "#b45309" }}>
              Barcode „{q.q}“ gehört aktuell keinem Buch. Frühere / ähnliche Treffer:
            </div>
          ) : null}
          {!loading &&
            items.map((b, i) => (
              <CheckRow
                key={b.id || b._id || i}
                book={b}
                index={i}
                registerFirst={registerFirst}
                focusRow={focusRow}
                onSaved={onSaved}
                muted={!!q.q && !exactFound}
                extraHint={
                  q.q && exactFound && i === 0 && others.length ? (
                    <Link className="pc-warn" to={`/admin/search-update?q=${encodeURIComponent(q.q)}`} tabIndex={-1}>
                      +{others.length} weitere Treffer (History)
                    </Link>
                  ) : null
                }
              />
            ))}
        </div>
      </div>

      <datalist id="pc-lang-list">
        {LANG_SUGGEST.map((l) => <option key={l} value={l} />)}
      </datalist>

      <div className="pc-help">
        Enter = nächstes Feld · Enter im letzten Feld = speichern + nächste Zeile · Zeile verlassen = automatisch speichern · Strg/Cmd+Enter = speichern · Esc = Zeile zurücksetzen ·
        Gelb = geändert, Rot = fehlt · Pos: ol om or ml mr ul um ur, 00 = keine · Vorgabe Pos = ur, Spr. = de (nur Enter drücken) · Spr. kurz: d=de e=en f=fr s=es i=it n=nl p=pt
      </div>

      <div className="pc-pager">
        <button type="button" onClick={() => canPrev && setQuery({ page: q.page - 1 })} disabled={!canPrev}>← Zurück</button>
        <span>Seite <strong>{q.page}</strong> / <strong>{totalPages}</strong></span>
        <button type="button" onClick={() => canNext && setQuery({ page: q.page + 1 })} disabled={!canNext}>Weiter →</button>
      </div>
    </section>
  );
}

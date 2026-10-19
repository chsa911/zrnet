import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getBook, listBooks, updateBook } from "../api/books";
import BookForm from "../components/BookFormSwitcher";
import { notifyActivityChanged } from "../components/ActivitiesToday";

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
//                           und zurück zum Scan-Feld; Strg/Cmd+Enter = speichern;
//                           Esc = Zeile zurücksetzen.
//
// Absicherung gegen Verwechslungen (19.10.2026, Fall „Heimat ist, was man
// vermisst“: Kapitel/letztes Wort eines anderen Buchs gespeichert):
//   * Titel + Autor stehen groß in jeder Zeile – man sieht, welches Buch die
//     Datenbank zum Barcode meint.
//   * Blinde Seitenprüfung: Hat ein Buch noch keine Nummer, ist das Seiten-Feld
//     leer und muss aus dem Buch abgetippt werden. Weicht es von der
//     gespeicherten Seitenzahl ab, wird nur nach ausdrücklicher Bestätigung
//     (mit Titel) gespeichert.
//   * Kein stilles Speichern beim Verlassen der Zeile; ein neuer Scan ist
//     gesperrt, solange eine Zeile ungespeicherte Eingaben hat.
//   * Enter im letzten Feld springt NICHT in die nächste Zeile.
//   * Treffer, denen der Barcode nicht (mehr) gehört, sind schreibgeschützt.
//   * Gehört ein Barcode mehreren Büchern, wird gewarnt und nicht automatisch
//     in die erste Zeile gesprungen.

const EDIT_KEYS = ["pages", "width_cm", "height_cm", "page_num_pos", "chapters", "last_word", "language"];
const LANG_RE = /^[a-z]{2}(-[a-z]{2})?$/i;
const LANG_SUGGEST = ["de", "en", "fr", "es", "it", "nl", "pt", "sv", "da", "no", "pl", "ru", "tr", "la"];
const SIZE_TOL_MM = 2;
const API_ROOT = import.meta.env.VITE_API_ROOT || "";
// Hinweise stehen in einer eigenen Zeile darunter, damit die Zeile in die Bildschirmbreite passt
const GRID = "4.6em 3.4em 3.2em 3.2em 2.1em 2.3em minmax(6.5em, 1fr) 2.1em 3em 6.2em 1.8em 1.5em 1.5em";
const GRID_EM = 43; // Summe der festen Spaltenbreiten (+ Rand)

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
const DEFAULTS = { page_num_pos: "ur", chapters: "0", language: "de" };
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
// Blinde Seitenprüfung nötig? (Buch hat noch keine Nummer, aber eine gespeicherte Seitenzahl)
function needsPageCheck(b) {
  return !b?.phys_code && str(b?.pages).trim() !== "";
}
function bookLabel(b) {
  const t = String(b?.title_display || "").trim() || "(ohne Titel)";
  const a = String(b?.author_name_display || b?.author_display || "").trim();
  return a ? `»${t}« – ${a}` : `»${t}«`;
}

const CheckRow = React.memo(function CheckRow({ book, index, registerFirst, focusSearch, onSaved, onEdit, onAbandoned, onDirtyChange, genres = [], muted = false, extraHint = null }) {
  const [pagesVerified, setPagesVerified] = useState(false);
  const blind = !muted && !pagesVerified && needsPageCheck(book);
  const [draft, setDraft] = useState(() => {
    const d = draftWithDefaults(book);
    if (!muted && needsPageCheck(book)) d.pages = "";
    return d;
  });
  const touchedRef = useRef(false); // Autosave nur, wenn in der Zeile wirklich gearbeitet wurde
  const [saving, setSaving] = useState(false);
  const [rowErr, setRowErr] = useState("");
  const [flash, setFlash] = useState(false);
  const refs = useRef({});
  const rowRef = useRef(null);
  const savingRef = useRef(false);
  const lastSavedRef = useRef(null); // Entwurf, der gerade gespeichert wurde (gegen Doppel-Speichern)

  // neue Daten vom Server -> Entwurf zurücksetzen.
  // Noch nicht gespeicherte Eingaben (z. B. Kap./Wort, wenn danach das Genre
  // gewählt wird) bleiben dabei erhalten.
  const prevOrigRef = useRef(null);
  useEffect(() => {
    const fresh = draftWithDefaults(book);
    const prevOrig = prevOrigRef.current;
    let keptEdits = false;
    if (prevOrig && touchedRef.current && lastSavedRef.current !== JSON.stringify(draft)) {
      for (const k of EDIT_KEYS) {
        if (!isSame(k, draft[k], prevOrig[k]) && !isSame(k, draft[k], fresh[k])) {
          fresh[k] = draft[k];
          keptEdits = true;
        }
      }
    }
    prevOrigRef.current = draftFromBook(book);
    if (blind && !keptEdits) fresh.pages = "";
    setDraft(fresh);
    touchedRef.current = keptEdits;
    lastSavedRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);

  const orig = useMemo(() => draftFromBook(book), [book]);
  // leeres Prüf-Feld (blinde Seitenprüfung) zählt nicht als Änderung
  const pagesPending = blind && String(draft.pages ?? "").trim() === "";
  const cmp = pagesPending ? { ...draft, pages: orig.pages } : draft;
  const changed = EDIT_KEYS.filter((k) => !isSame(k, cmp[k], orig[k]));
  const dirty = changed.length > 0;
  const bookId = book?.id || book?._id;
  useEffect(() => {
    onDirtyChange?.(bookId, dirty && touchedRef.current, book);
  }, [dirty, bookId, book, onDirtyChange, draft]);
  useEffect(() => () => onDirtyChange?.(bookId, false, book), [bookId]); // eslint-disable-line react-hooks/exhaustive-deps
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
    if (k === "pages" && pagesPending) return "pc-in is-check";
    if (empty && ["width_cm", "height_cm", "page_num_pos", "last_word"].includes(k)) return "pc-in is-missing";
    return "pc-in";
  }
  function tip(k) {
    if (k === "pages" && blind) return "Prüfung: letzte nummerierte Seite aus dem Buch abtippen";
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
    if (muted) {
      setRowErr("Barcode gehört diesem Buch nicht – nur Anzeige");
      return false;
    }
    if (!dirty) {
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
      return true;
    }
    // Blinde Seitenprüfung: erst speichern, wenn die Seitenzahl aus dem Buch
    // eingetragen ist – und bei Abweichung nur nach Bestätigung mit Titel.
    if (pagesPending) {
      setRowErr("Erst Seitenzahl aus dem Buch eintragen (Prüfung, ob es das richtige Buch ist)");
      refs.current.pages?.focus({ preventScroll: true });
      return false;
    }
    if (blind && !isSame("pages", draft.pages, orig.pages)) {
      const ok = window.confirm(
        `Seitenzahl weicht ab!\n\nGespeichert: ${orig.pages} Seiten · im Buch: ${String(draft.pages).trim()} Seiten\n\n` +
          `Ist das Buch in deiner Hand wirklich\n${bookLabel(book)}\n(Barcode ${book?.barcode || "—"})?\n\n` +
          `OK = ja, genau dieses Buch – speichern\nAbbrechen = nichts speichern`
      );
      if (!ok) {
        setRowErr("Nicht gespeichert – Buch prüfen");
        return false;
      }
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
      if (blind) setPagesVerified(true);
      touchedRef.current = false;
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

  // Genre (Fiction / Nonfiction …) – wie in Search & Update: gilt für alle
  // Exemplare desselben Titels und wird sofort gespeichert.
  async function saveGenre(abbr) {
    if (savingRef.current || !abbr) return;
    if (!String(book?.title_display || "").trim()) {
      setRowErr("Kein Titel – Genre über ✎ setzen");
      return;
    }
    const genre = genres.find((g) => g.abbr === abbr);
    // offene Eingaben der Zeile (Kap., Wort …) zuerst speichern,
    // damit die Nummer gebildet wird und nichts verloren geht
    if (dirty && !posInvalid && !langInvalid) {
      const ok = await save();
      if (!ok) return;
    }
    savingRef.current = true;
    setSaving(true);
    setRowErr("");
    try {
      const res = await fetch(`${API_ROOT}/api/admin/books/by-title/genre`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title_display: book.title_display, author_id: book.author_id ?? null, genre_abbr: abbr }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.detail || json?.error || `HTTP ${res.status}`);
      if (!json?.updated) throw new Error("Kein Buch aktualisiert");
      onSaved(book.id || book._id, { genre_abbr: abbr, genre_id: genre?.id ?? null, genre_name: genre?.genre_display ?? null, subgenre_abbr: null, sub_genre_id: null, subgenre_name: null });
    } catch (e) {
      setRowErr(`Genre: ${e?.message || "Fehler"}`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  // Buch als abgebrochen markieren (gibt den Barcode frei)
  async function abandon() {
    if (savingRef.current) return;
    if (muted) {
      setRowErr("Barcode gehört diesem Buch nicht – nur Anzeige");
      return;
    }
    if (!window.confirm(`Als abgebrochen (abandoned) markieren?\n\n${bookLabel(book)}\nBarcode ${book?.barcode || "—"}${orig.pages ? ` · ${orig.pages} Seiten` : ""}\n\nIst das wirklich das Buch in deiner Hand?\nDer Barcode wird dabei freigegeben.`)) return;
    // offene Änderungen in der Zeile vorher sichern
    if (dirty && !posInvalid && !langInvalid) {
      const ok = await save();
      if (!ok) return;
    }
    savingRef.current = true;
    setSaving(true);
    setRowErr("");
    try {
      await updateBook(book.id || book._id, { reading_status: "abandoned" });
      onAbandoned(book.id || book._id);
    } catch (e) {
      setRowErr(errText(e));
      savingRef.current = false;
      setSaving(false);
    }
  }

  // Kein stilles Speichern beim Verlassen der Zeile – nur deutlicher Hinweis.
  // (Ein neuer Scan ist gesperrt, solange hier Ungespeichertes steht.)
  function onRowBlur(e) {
    if (rowRef.current && e.relatedTarget && rowRef.current.contains(e.relatedTarget)) return;
    if (touchedRef.current && dirty) setRowErr("Nicht gespeichert – 💾 / Strg+Enter = speichern, Esc = verwerfen");
  }

  function onKey(k) {
    return async (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDraft(() => {
          const d = draftWithDefaults(book);
          if (blind) d.pages = "";
          return d;
        });
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
        // nicht in die nächste Zeile springen (dort steht ein ANDERES Buch),
        // sondern zurück zum Scan-Feld
        if (ok && last) focusSearch();
        return;
      }
      const next = refs.current[EDIT_KEYS[EDIT_KEYS.indexOf(k) + 1]];
      next?.focus({ preventScroll: true });
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
      disabled={saving || muted}
      {...extra}
    />
  );

  const wDiff = sizeDiffMm("width_cm");
  const hDiff = sizeDiffMm("height_cm");
  const pagesChanged = changed.includes("pages") && orig.pages !== "";

  return (
    <div ref={rowRef} onBlur={onRowBlur} className={`pc-row ${flash ? "is-flash" : ""} ${dirty ? "is-dirty" : ""} ${muted ? "is-muted" : ""}`}>
      <div className="pc-title" title={`${book?.title_display || ""} ${book?.author_name_display || ""}`}>
        <span className="pc-title-t">{String(book?.title_display || "").trim() || "(ohne Titel)"}</span>
        {book?.author_name_display || book?.author_display ? <span className="pc-title-a"> – {book.author_name_display || book.author_display}</span> : null}
        {book?.reading_status ? <span className="pc-title-s"> · {book.reading_status}</span> : null}
        {muted ? <span className="pc-err"> · Barcode gehört diesem Buch nicht (mehr) – nur Anzeige</span> : null}
      </div>
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
      <div className="pc-cell pc-genre" title={book?.genre_name || "Genre"}>
        <select tabIndex={-1} value={book?.genre_abbr || ""} disabled={saving} onChange={(e) => saveGenre(e.target.value)}>
          <option value="" disabled>—</option>
          {genres.map((g) => <option key={g.abbr} value={g.abbr}>{g.abbr}</option>)}
        </select>
      </div>
      <div className={`pc-cell pc-mono pc-code ${preview ? "" : "is-incomplete"}`} title={book?.phys_code ? `gespeichert: ${formatPhysCode(book.phys_code)}` : "noch keine Nummer"}>
        {preview ? formatPhysCode(preview) : book?.phys_code ? formatPhysCode(book.phys_code) : "—"}
      </div>
      <button type="button" className={`pc-save ${dirty ? "is-dirty" : ""}`} onClick={save} disabled={saving || muted} title={dirty ? `Speichern (${changed.join(", ")})` : "Geprüft"}>
        {saving ? "…" : dirty ? "💾" : "✓"}
      </button>
      <button type="button" tabIndex={-1} className="pc-act" onClick={() => onEdit(book)} disabled={saving} title="Alle Daten bearbeiten">
        ✎
      </button>
      <button type="button" tabIndex={-1} className="pc-act pc-abandon" onClick={abandon} disabled={saving || muted || book?.reading_status === "abandoned"} title="Als abgebrochen (abandoned) markieren">
        ✗
      </button>
      <div className="pc-cell pc-hint">
        {extraHint}
        {rowErr ? <span className="pc-err">{rowErr}</span> : null}
        {pagesPending ? <span className="pc-warn">Prüfung: Seitenzahl aus dem Buch eintragen</span> : null}
        {pagesChanged && !pagesPending ? <span className="pc-err">Seiten ≠ {orig.pages} – richtiges Buch?</span> : null}
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
  const [multiOwner, setMultiOwner] = useState(false); // Barcode gehört AKTUELL mehreren Büchern
  const dirtyRowsRef = useRef(new Map()); // id -> Buch mit ungespeicherten Eingaben
  const [blockMsg, setBlockMsg] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [editingBook, setEditingBook] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [genres, setGenres] = useState([]); // { id, abbr, genre_display }

  useEffect(() => {
    fetch(`${API_ROOT}/api/public/sub-genres`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const map = {};
        data.forEach((sg) => {
          if (sg.genre_abbr && !map[sg.genre_id]) map[sg.genre_id] = { id: sg.genre_id, abbr: sg.genre_abbr, genre_display: sg.genre_name };
        });
        setGenres(Object.values(map));
      })
      .catch(() => {});
  }, []);

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
    searchRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    // nur gefundene Bücher anzeigen – ohne Suchbegriff bleibt die Liste leer
    if (!q.q) {
      setItems([]);
      setOthers([]);
      setTotal(0);
      setErr("");
      setLoading(false);
      return undefined;
    }
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
          setMultiOwner(false);
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
          setMultiOwner(exact.length > 1);
        } else {
          setExactFound(true);
          setMultiOwner(false);
        }
        setItems(list);
        setOthers(rest);
        setTotal(Number.isFinite(data?.total) ? data.total : list.length);
        // gescannter Barcode -> direkt ins Seiten-Feld – aber nur, wenn genau
        // EIN Buch den Barcode aktuell hat. Bei mehreren oder nur früheren
        // Treffern muss bewusst die richtige Zeile gewählt werden.
        const onlyOne = !wildcard && list.length === 1 && String(list[0]?.barcode || "").toLowerCase() === q.q.trim().toLowerCase();
        if (q.q && onlyOne) setTimeout(() => focusRow(0), 0);
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
      el.focus({ preventScroll: true });
      el.select?.();
    } else {
      // keine weitere Zeile -> zurück zur Suche (nächsten Barcode scannen)
      searchRef.current?.focus({ preventScroll: true });
      searchRef.current?.select();
    }
  }, []);

  const focusSearch = useCallback(() => {
    searchRef.current?.focus({ preventScroll: true });
    searchRef.current?.select();
  }, []);

  const onDirtyChange = useCallback((id, isDirty, book) => {
    if (!id) return;
    if (isDirty) dirtyRowsRef.current.set(id, book);
    else dirtyRowsRef.current.delete(id);
    if (!dirtyRowsRef.current.size) setBlockMsg("");
  }, []);

  // true = es gibt ungespeicherte Eingaben -> Aktion blockieren
  function blockedByDirty() {
    const first = dirtyRowsRef.current.values().next().value;
    if (!first) return false;
    setBlockMsg(`Ungespeicherte Eingaben bei ${bookLabel(first)} – erst speichern (💾 / Strg+Enter) oder verwerfen (Esc).`);
    const idx = items.findIndex((b) => (b.id || b._id) === (first.id || first._id));
    if (idx >= 0) focusRow(idx);
    return true;
  }

  const onSaved = useCallback((id, saved) => {
    setSavedCount((n) => n + 1);
    notifyActivityChanged();
    if (saved) setItems((list) => list.map((b) => ((b.id || b._id) === id ? { ...b, ...saved } : b)));
  }, []);

  const onAbandoned = useCallback((id) => {
    setSavedCount((n) => n + 1);
    notifyActivityChanged();
    setItems((list) => list.filter((b) => (b.id || b._id) !== id));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  const onEdit = useCallback(async (b) => {
    const id = b?.id || b?._id;
    if (!id) return;
    setEditLoading(true);
    try {
      const full = await getBook(id);
      setEditingBook(full && typeof full === "object" ? full : b);
    } catch {
      setEditingBook(b);
    } finally {
      setEditLoading(false);
    }
  }, []);

  function closeEditor() {
    setEditingBook(null);
    setTimeout(() => searchRef.current?.focus(), 0);
  }

  function submitSearch(e) {
    e.preventDefault();
    const v = searchText.trim();
    if (v === q.q) {
      if (items.length === 1 && exactFound) focusRow(0);
      return;
    }
    if (blockedByDirty()) return;
    setQuery({ q: v, page: 1 });
  }

  const totalPages = Math.max(1, Math.ceil(total / q.limit));
  const canPrev = q.page > 1;
  const canNext = q.page < totalPages;

  return (
    <section className="pc-page">
      <style>{`
        .pc-page { margin: 0 auto; padding: 0 12px 12px; font-weight: 900; container-type: inline-size; }
        .pc-bar { display: flex; align-items: stretch; margin: 0 0 8px; position: relative; }
        .pc-search { flex: 1 1 auto; width: 100%; box-sizing: border-box; font: inherit; font-size: clamp(44px, 6.5vw, 88px); font-weight: 900; line-height: .9; height: .95em; padding: 0 .05em; margin: 0; border: 3px solid rgba(0,0,0,.65); border-radius: 0; }
        .pc-search { height: calc(clamp(44px, 6.5vw, 88px) * .95); }
        .pc-search:placeholder-shown { font-size: clamp(22px, 3vw, 38px); line-height: normal; padding: 0 .3em; }
        .pc-search::placeholder { font-size: 1em; font-weight: 900; color: rgba(0,0,0,.65); }
        .pc-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: clamp(24px, 4vw, 42px); font-weight: 900; border: 0; background: none; cursor: pointer; color: #666; }
        /* Schrift (und damit alle Spalten in em) richtet sich nach der Breite der Seite -> Zeile passt immer ohne Scrollen */
        .pc-scroll { overflow-x: auto; border: 3px solid rgba(0,0,0,.65); font-size: clamp(12px, calc((100vw - 90px) / ${GRID_EM}), 42px); font-size: clamp(12px, calc((100cqw - 12px) / ${GRID_EM}), 42px); }
        .pc-scroll:empty { display: none; }
        .pc-table { min-width: 0; }
        .pc-head, .pc-row { display: grid; grid-template-columns: ${GRID}; align-items: stretch; }
        .pc-head { background: #e5e7eb; font-weight: 900; position: sticky; top: 0; z-index: 1; }
        .pc-head > div { font-size: .45em; padding: .3em .4em; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-right: 1px solid #bbb; }
        .pc-row { border-top: 1px solid #ddd; background: #fff; transition: background .3s; }
        .pc-row.is-dirty { background: #fffbeb; }
        .pc-row.is-flash { background: #dcfce7; }
        .pc-row.is-muted { opacity: .6; }
        .pc-title { grid-column: 1 / -1; font-size: .62em; line-height: 1.25; padding: .25em .4em .1em; background: #f8fafc; border-bottom: 1px solid #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pc-title-t { font-weight: 900; }
        .pc-title-a { font-weight: 700; color: #374151; }
        .pc-title-s { font-weight: 700; color: #6b7280; }
        .pc-in.is-check { background: #dbeafe; box-shadow: inset 0 0 0 2px #2563eb; }
        .pc-alert-block { color: #fff; background: #b91c1c; }
        .pc-cell { padding: 0 .15em; font-size: 1em; border-right: 1px solid #eee; display: flex; align-items: center; min-width: 0; }
        .pc-ellip { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
        .pc-mono { font-family: monospace; }
        .pc-code { font-size: .8em; font-weight: 900; }
        .pc-code.is-incomplete { color: #9ca3af; }
        .pc-in { width: 100%; box-sizing: border-box; border: 0; border-right: 1px solid #eee; padding: .1em .15em; font: inherit; font-size: 1em; font-weight: 900; height: 1.4em; background: transparent; outline: none; min-width: 0; }
        .pc-in:focus { box-shadow: inset 0 0 0 2px #2563eb; background: #eff6ff; }
        .pc-in.is-changed { background: #fde68a; }
        .pc-in.is-missing { background: #fee2e2; }
        .pc-in.is-bad { background: #fca5a5; }
        .pc-save { border: 0; background: #f3f4f6; font-size: .9em; cursor: pointer; }
        .pc-save.is-dirty { background: #fbbf24; }
        .pc-act { border: 0; border-left: 1px solid #eee; background: #f9fafb; font-size: .8em; cursor: pointer; }
        .pc-act:hover:not(:disabled) { background: #e0e7ff; }
        .pc-abandon { color: #b91c1c; font-weight: 900; }
        .pc-abandon:hover:not(:disabled) { background: #fee2e2; }
        .pc-act:disabled { opacity: .4; cursor: default; }
        .pc-genre { padding: .1em; }
        .pc-genre select { width: 100%; font: inherit; font-size: .8em; font-weight: 900; padding: 0; }
        .pc-modal { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 50; display: flex; justify-content: center; align-items: flex-start; overflow-y: auto; padding: 24px 12px; }
        .pc-modal-box { font-size: var(--zr-fs, 16px); font-weight: 400; background: #fff; border: 4px solid #666; padding: 18px; width: 100%; max-width: 1100px; position: relative; }
        .pc-modal-x { position: absolute; top: 6px; right: 8px; border: 0; background: none; font-size: 22px; cursor: pointer; }
        .pc-code-cell a { color: inherit; font-weight: 700; text-decoration: none; }
        .pc-code-cell a:hover { text-decoration: underline; }
        .pc-hint { grid-column: 1 / -1; gap: .3em .8em; flex-wrap: wrap; font-size: .55em; line-height: 1.2; padding: .2em .4em; border-top: 1px dashed #eee; }
        .pc-hint:empty { display: none; }
        .pc-warn { color: #b45309; font-weight: 900; }
        .pc-err { color: #b91c1c; font-weight: 900; }
        .pc-alert { padding: .3em .4em; font-weight: 900; font-size: .8em; }
        .pc-pager { display: flex; gap: 8px; justify-content: center; align-items: center; margin-top: 10px; }
        .pc-pager button { padding: 8px 14px; font-weight: 700; }
        .pc-help { font-size: 12px; font-weight: 700; opacity: .7; margin-top: 6px; line-height: 1.3; }
      `}</style>

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
          <button type="button" className="pc-clear" title="Suche leeren" onClick={() => { if (blockedByDirty()) return; setSearchText(""); setQuery({ q: "", page: 1 }); searchRef.current?.focus(); }}>
            ✕
          </button>
        ) : null}
      </form>

      {q.q ? (
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
            <div title="Genre (Fiction / Nonfiction)">Genre</div>
            <div>Nummer</div>
            <div></div>
            <div title="Alle Daten bearbeiten">✎</div>
            <div title="Abgebrochen">✗</div>
          </div>
          {err ? <div className="pc-alert" style={{ color: "#b91c1c" }}>{err}</div> : null}
          {loading ? <div className="pc-alert">Lade…</div> : null}
          {!loading && !err && !items.length ? <div className="pc-alert">Keine Bücher gefunden.</div> : null}
          {blockMsg ? <div className="pc-alert pc-alert-block">{blockMsg}</div> : null}
          {!loading && !err && q.q && exactFound && multiOwner ? (
            <div className="pc-alert pc-alert-block">
              Achtung: Barcode „{q.q}“ ist {items.length} Büchern zugeordnet! Titel prüfen und die richtige Zeile bewusst anklicken.
            </div>
          ) : null}
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
                focusSearch={focusSearch}
                onDirtyChange={onDirtyChange}
                onSaved={onSaved}
                onEdit={onEdit}
                onAbandoned={onAbandoned}
                genres={genres}
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
      ) : null}

      <datalist id="pc-lang-list">
        {LANG_SUGGEST.map((l) => <option key={l} value={l} />)}
      </datalist>

      <div className="pc-help">
        Enter = nächstes Feld · Enter im letzten Feld = speichern + zurück zum Scan · Strg/Cmd+Enter = speichern · Esc = Zeile zurücksetzen · Ungespeichertes blockiert den nächsten Scan · Blaues Seiten-Feld = Seitenzahl aus dem Buch abtippen (Prüfung) ·
        Platzhalter: ob0x = alle ab ob0 · Gelb = geändert, Rot = fehlt · Pos: ol om or ml mr ul um ur, 00 = keine · Vorgabe Pos = ur, Kap. = 0, Spr. = de (nur Enter drücken) · Spr. kurz: d=de e=en f=fr s=es i=it n=nl p=pt
      </div>

      {editLoading ? <div className="pc-modal"><div className="pc-modal-box">Lade…</div></div> : null}
      {editingBook ? (
        <div className="pc-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) closeEditor(); }}>
          <div className="pc-modal-box">
            <button type="button" className="pc-modal-x" onClick={closeEditor} title="Schließen">✕</button>
            <BookForm
              mode="edit"
              bookId={editingBook.id || editingBook._id}
              initialBook={editingBook}
              lockBarcode={true}
              showUnknownFields={false}
              excludeUnknownKeys={["reading_status"]}
              submitLabel="Speichern"
              onCancel={closeEditor}
              onSuccess={({ saved }) => {
                onSaved(editingBook.id || editingBook._id, saved && typeof saved === "object" ? saved : null);
                closeEditor();
              }}
            />
          </div>
        </div>
      ) : null}

      {q.q && totalPages > 1 ? <div className="pc-pager">
        <button type="button" onClick={() => canPrev && !blockedByDirty() && setQuery({ page: q.page - 1 })} disabled={!canPrev}>← Zurück</button>
        <span>Seite <strong>{q.page}</strong> / <strong>{totalPages}</strong></span>
        <button type="button" onClick={() => canNext && !blockedByDirty() && setQuery({ page: q.page + 1 })} disabled={!canNext}>Weiter →</button>
      </div> : null}
    </section>
  );
}

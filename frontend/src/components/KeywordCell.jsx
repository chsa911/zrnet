// Schlagwort-Spalte in Search & Update (pages/SearchUpdatePage.jsx).
//
// Die Zelle zeigt die Anzahl der Schlagworte (Tooltip: alle Namen). Klick öffnet
// ein Fenster: Etiketten mit ×, Eingabe mit Vorschlägen, Enter oder Komma fügt
// hinzu. Jede Änderung wird sofort gespeichert (PUT /api/books/:id/keywords).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listKeywords, saveBookKeywords } from "../api/books";
import { mergeKeywords } from "./bookForm/fields/KeywordsField";

// Vorschläge einmal pro Seitenaufruf laden, nach dem Speichern neu
let knownCache = null;
async function loadKnown(force = false) {
  if (!knownCache || force) {
    knownCache = listKeywords().then((r) => (Array.isArray(r) ? r : [])).catch(() => []);
  }
  return knownCache;
}

function KeywordModal({ book, names, onSaved, onClose }) {
  const [list, setList] = useState(names);
  const [draft, setDraft] = useState("");
  const [known, setKnown] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    loadKnown().then(setKnown);
    inputRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const suggestions = useMemo(() => {
    const have = new Set(list.map((n) => n.toLowerCase()));
    return known.filter((k) => !have.has(k.name.toLowerCase()));
  }, [known, list]);

  async function save(next) {
    setBusy(true);
    setErr("");
    try {
      const saved = await saveBookKeywords(book.id, next);
      const savedNames = Array.isArray(saved) ? saved.map((k) => k.name) : next;
      setList(savedNames);
      setDraft("");
      onSaved(savedNames);
      loadKnown(true).then(setKnown);
    } catch (e) {
      setErr(e?.message && !/^http_/.test(e.message) ? e.message : "Schlagworte konnten nicht gespeichert werden.");
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function add(text = draft) {
    const next = mergeKeywords(list, text, known);
    if (next.length === list.length) { setDraft(""); return; }
    save(next);
  }

  const title = book.title_display || book.title_keyword || "Buch";

  return (
    <div className="su-kw-backdrop" onClick={onClose}>
      <div className="su-kw-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Schlagworte: ${title}`}>
        <div className="su-kw-head">
          <div>
            <div className="su-kw-label">Schlagworte</div>
            <div className="su-kw-title">{title}</div>
          </div>
          <button type="button" className="su-kw-close" onClick={onClose} aria-label="Schließen">×</button>
        </div>

        <div className="su-kw-chips">
          {list.map((n) => (
            <span key={n.toLowerCase()} className="su-kw-chip">
              {n}
              <button
                type="button"
                disabled={busy}
                onClick={() => save(list.filter((x) => x !== n))}
                aria-label={`„${n}“ entfernen`}
                title={`„${n}“ entfernen`}
              >
                ×
              </button>
            </span>
          ))}
          {!list.length ? <span className="su-kw-none">Noch keine Schlagworte.</span> : null}
        </div>

        <form className="su-kw-form" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <input
            ref={inputRef}
            list="su-kw-suggestions"
            value={draft}
            disabled={busy}
            maxLength={320}
            placeholder="Schlagwort eingeben, Enter …"
            onChange={(e) => {
              const text = e.target.value;
              const picked = known.find((k) => k.name === text);
              if (text.includes(",") || (picked && e.nativeEvent?.inputType !== "insertText")) add(text);
              else setDraft(text);
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !draft && list.length) save(list.slice(0, -1));
            }}
          />
          <datalist id="su-kw-suggestions">
            {suggestions.map((k) => (
              <option key={k.id} value={k.name} />
            ))}
          </datalist>
          <button type="submit" disabled={busy || !draft.trim()}>{busy ? "…" : "+"}</button>
        </form>

        {err ? <div className="su-kw-err">{err}</div> : null}
        <div className="su-kw-hint">Enter oder Komma fügt hinzu · × entfernt · Esc schließt. Wird sofort gespeichert.</div>
      </div>
    </div>
  );
}

export default function KeywordCell({ book, disabled, onSaved }) {
  const [open, setOpen] = useState(false);
  const names = Array.isArray(book?.keywords) ? book.keywords : [];
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        className="su-inline-edit su-kw-trigger"
        disabled={disabled || !book?.id}
        title={names.length ? `Schlagworte: ${names.join(", ")}` : "Schlagworte vergeben"}
        onClick={() => setOpen(true)}
      >
        {names.length ? names.length : "—"}
      </button>
      {open ? (
        <KeywordModal
          book={book}
          names={names}
          onSaved={(next) => onSaved?.(next)}
          onClose={close}
        />
      ) : null}
    </>
  );
}

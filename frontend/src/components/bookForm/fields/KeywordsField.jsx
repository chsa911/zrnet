// Schlagwort-Feld im Formular "Buch registrieren / bearbeiten" (BookFormDesktop).
//
//   value     Array der Schlagwort-Namen (Formularzustand v.keywords)
//   draft     noch nicht bestätigter Text im Eingabefeld (v.keywords_draft);
//             wird beim Speichern mitgenommen, auch ohne Enter
//   onChange(names, draft)
//
// Enter, Komma oder Tab (bei Text) fügt hinzu, × entfernt, Rücktaste im leeren
// Feld entfernt das letzte. Vorschläge: alle vorhandenen Schlagworte
// (GET /api/public/keywords). Neue Namen legt das Backend beim Speichern an.

import { useEffect, useMemo, useState } from "react";
import { listKeywords } from "../../../api/books";

const MAX_LEN = 80;

export function cleanKeyword(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
}

/** Liste + Entwurfstext zu einer bereinigten Namensliste ohne Dubletten (Groß/Klein egal). */
export function mergeKeywords(list, draft, known = []) {
  const out = [];
  const seen = new Set();
  const parts = [...(list || []), ...String(draft ?? "").split(",")];
  for (const raw of parts) {
    const n = cleanKeyword(raw);
    if (!n || seen.has(n.toLowerCase())) continue;
    const existing = known.find((k) => k.name.toLowerCase() === n.toLowerCase());
    seen.add(n.toLowerCase());
    out.push(existing ? existing.name : n);
  }
  return out;
}

export default function KeywordsField({ value, draft = "", onChange, disabled, reloadTick = 0 }) {
  const names = Array.isArray(value) ? value : [];
  const [known, setKnown] = useState([]);

  useEffect(() => {
    const ac = new AbortController();
    listKeywords({ signal: ac.signal })
      .then((rows) => setKnown(Array.isArray(rows) ? rows : []))
      .catch(() => {});
    return () => ac.abort();
  }, [reloadTick]);

  const suggestions = useMemo(() => {
    const have = new Set(names.map((n) => n.toLowerCase()));
    return known.filter((k) => !have.has(k.name.toLowerCase()));
  }, [known, names]);

  function commit(text = draft) {
    const next = mergeKeywords(names, text, known);
    onChange?.(next, "");
  }

  function onKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault(); // Enter soll nicht das ganze Formular abschicken
      commit();
    } else if (e.key === "Tab" && cleanKeyword(draft)) {
      commit();
    } else if (e.key === "Backspace" && !draft && names.length) {
      onChange?.(names.slice(0, -1), "");
    }
  }

  function onInput(e) {
    const text = e.target.value;
    // Auswahl aus der Vorschlagsliste sofort übernehmen
    const picked = known.find((k) => k.name === text);
    if (picked && e.nativeEvent?.inputType !== "insertText") {
      onChange?.(mergeKeywords(names, text, known), "");
      return;
    }
    if (text.includes(",")) {
      onChange?.(mergeKeywords(names, text, known), "");
      return;
    }
    onChange?.(names, text);
  }

  return (
    <div className="bfd-keywords" title="Schlagworte – Enter oder Komma fügt hinzu, × entfernt">
      <span className="bfd-keywords-label">Schlagworte</span>
      {names.map((n) => (
        <span key={n.toLowerCase()} className="bfd-keyword">
          {n}
          <button
            type="button"
            className="bfd-keyword-x"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()} // Eingabefeld behält den Fokus (kein onBlur dazwischen)
            onClick={() => onChange?.(names.filter((x) => x !== n), draft)}
            aria-label={`„${n}“ entfernen`}
            title={`„${n}“ entfernen`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="bfd-keywords-input"
        list="bfd-keyword-list"
        value={draft}
        placeholder={names.length ? "weiteres …" : "Schlagwort eingeben …"}
        disabled={disabled}
        maxLength={MAX_LEN * 4}
        aria-label="Schlagwort hinzufügen"
        onChange={onInput}
        onKeyDown={onKeyDown}
        onBlur={() => cleanKeyword(draft) && commit()}
      />
      <datalist id="bfd-keyword-list">
        {suggestions.map((k) => (
          <option key={k.id} value={k.name} />
        ))}
      </datalist>
    </div>
  );
}

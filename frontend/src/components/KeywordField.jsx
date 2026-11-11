// Schlagwort-Feld auf der Buchseite.
//
// Alle sehen die Schlagworte als Links auf /tag/<slug> (alle Titel mit diesem
// Schlagwort). Als Admin (Cookie, GET /api/admin/me) zusätzlich: × zum
// Entfernen und ein Eingabefeld mit Vorschlägen; Enter oder Komma fügt hinzu.
// Jede Änderung wird sofort gespeichert (PUT /api/books/:id/keywords).

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { isAdmin, listKeywords, saveBookKeywords } from "../api/books";

const MAX_LEN = 80;

function clean(v) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
}

export default function KeywordField({ bookId, initial }) {
  const { t } = useI18n();
  const [keywords, setKeywords] = useState(() => (Array.isArray(initial) ? initial : []));
  const [admin, setAdmin] = useState(false);
  const [all, setAll] = useState([]); // Vorschläge: alle vorhandenen Schlagworte
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setKeywords(Array.isArray(initial) ? initial : []);
  }, [initial]);

  useEffect(() => {
    const ac = new AbortController();
    isAdmin({ signal: ac.signal }).then((ok) => {
      if (!ac.signal.aborted) setAdmin(ok);
    });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!admin) return;
    const ac = new AbortController();
    listKeywords({ signal: ac.signal })
      .then((rows) => setAll(Array.isArray(rows) ? rows : []))
      .catch(() => {});
    return () => ac.abort();
  }, [admin]);

  const suggestions = useMemo(() => {
    const have = new Set(keywords.map((k) => k.name.toLowerCase()));
    return all.filter((k) => !have.has(k.name.toLowerCase()));
  }, [all, keywords]);

  async function save(names) {
    setBusy(true);
    setErr("");
    try {
      const saved = await saveBookKeywords(bookId, names);
      setKeywords(Array.isArray(saved) ? saved : []);
      // Vorschlagsliste aktualisieren (neu angelegte Schlagworte)
      listKeywords().then((rows) => setAll(Array.isArray(rows) ? rows : [])).catch(() => {});
      return true;
    } catch (e) {
      setErr(e?.message && !/^http_/.test(e.message) ? e.message : t("book.keywords_save_failed"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(raw) {
    const parts = String(raw ?? "").split(",").map(clean).filter(Boolean);
    if (!parts.length) return;
    const names = keywords.map((k) => k.name);
    const lower = new Set(names.map((n) => n.toLowerCase()));
    for (const p of parts) {
      // Schreibweise eines vorhandenen Schlagworts übernehmen
      const existing = all.find((k) => k.name.toLowerCase() === p.toLowerCase());
      const name = existing ? existing.name : p;
      if (!lower.has(name.toLowerCase())) {
        names.push(name);
        lower.add(name.toLowerCase());
      }
    }
    if (names.length === keywords.length) {
      setText("");
      return;
    }
    if (await save(names)) setText("");
  }

  function remove(id) {
    save(keywords.filter((k) => k.id !== id).map((k) => k.name));
  }

  function onKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(text);
    } else if (e.key === "Backspace" && !text && keywords.length) {
      remove(keywords[keywords.length - 1].id);
    }
  }

  if (!admin && !keywords.length) return null;

  return (
    <div className="zr-bookpage__keywords">
      <div className="zr-bookpage__keywordsTitle">{t("book.keywords")}</div>

      <div className="zr-bookpage__keywordsList">
        {keywords.map((k) => (
          <span key={k.id} className="zr-bookpage__keyword">
            <Link
              to={`/tag/${encodeURIComponent(k.slug)}`}
              className="zr-bookpage__keywordLink"
              title={t("book.keywords_show_all", { name: k.name })}
            >
              {k.name}
            </Link>
            {admin ? (
              <button
                type="button"
                className="zr-bookpage__keywordRemove"
                onClick={() => remove(k.id)}
                disabled={busy}
                aria-label={t("book.keywords_remove", { name: k.name })}
                title={t("book.keywords_remove", { name: k.name })}
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
        {!keywords.length ? (
          <span className="zr-bookpage__keywordsNone">{t("book.keywords_none")}</span>
        ) : null}
      </div>

      {admin ? (
        <form
          className="zr-bookpage__keywordsForm"
          onSubmit={(e) => {
            e.preventDefault();
            add(text);
          }}
        >
          <input
            className="zr-input"
            list="zr-keyword-suggestions"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MAX_LEN * 4}
            placeholder={t("book.keywords_placeholder")}
            disabled={busy}
          />
          <datalist id="zr-keyword-suggestions">
            {suggestions.map((k) => (
              <option key={k.id} value={k.name}>
                {k.book_count ? `${k.name} (${k.book_count})` : k.name}
              </option>
            ))}
          </datalist>
          <button type="submit" className="zr-btn2 zr-btn2--ghost" disabled={busy || !clean(text)}>
            {busy ? t("book.keywords_saving") : t("book.keywords_add")}
          </button>
        </form>
      ) : null}

      {err ? <div className="zr-bookpage__noticeErr">{err}</div> : null}
    </div>
  );
}

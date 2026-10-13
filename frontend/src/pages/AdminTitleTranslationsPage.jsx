import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminNavRow from "../components/AdminNavRow";
import RequireAdmin from "../components/RequireAdmin";
import {
  listTitleTranslations,
  saveTitleTranslations,
  uploadLocaleCover,
  deleteLocaleCover,
} from "../api/books";

const LOCALE_NAMES = {
  de: "Deutsch",
  en: "English",
  fr: "Français",
  es: "Español",
  "pt-BR": "Português (BR)",
};

// One select per locale combines title_kind + edition_available:
//   original  -> kind original, available true
//   official  -> kind official, available true
//   free      -> kind free, availability unknown
//   free_no   -> kind free, no edition in this language
const KIND_OPTIONS = [
  { value: "original", label: "Original (Originalsprache)" },
  { value: "official", label: "Offizielle Ausgabe" },
  { value: "free", label: "Sinngemäß – Ausgabe unbekannt" },
  { value: "free_no", label: "Sinngemäß – keine Ausgabe" },
];

function toDraft(item, locales) {
  const tr = {};
  for (const l of locales) {
    const cur = item.translations?.[l] || {};
    const kind = cur.kind || "free";
    tr[l] = {
      title: cur.title || "",
      kind: kind === "free" && cur.available === false ? "free_no" : kind,
      note: cur.note || "",
      purchase_url: cur.purchase_url || "",
    };
  }
  return {
    edition_language: item.edition_language || "",
    original_language: item.original_language || "",
    original_title: item.original_title || "",
    translations: tr,
  };
}

function toPayload(draft) {
  const translations = {};
  for (const [l, v] of Object.entries(draft.translations)) {
    translations[l] = {
      title: v.title,
      kind: v.kind === "free_no" ? "free" : v.kind,
      available: v.kind === "free_no" ? false : null,
      note: v.note,
      purchase_url: v.purchase_url,
    };
  }
  return {
    edition_language: draft.edition_language,
    original_language: draft.original_language,
    original_title: draft.original_title,
    translations,
  };
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.2)",
  font: "inherit",
};

// Cover of the edition in each language; without one the site shows the book's own cover.
function LocaleCovers({ item, locales, onCovers }) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const covers = item.covers || {};

  async function run(locale, fn) {
    setBusy(locale);
    setErr("");
    try {
      const res = await fn();
      onCovers(item.id, res?.covers || {});
    } catch (e) {
      setErr(e?.message || "Fehlgeschlagen");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div style={{ fontSize: "var(--zr-fs, 12px)", fontWeight: 700, opacity: 0.6, marginBottom: 8 }}>
        Cover pro Sprache (leer = Cover meines Exemplars)
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {locales.map((l) => {
          const src = covers[l] || "";
          return (
            <div
              key={l}
              style={{
                width: 120,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: "var(--zr-fs, 13px)",
              }}
            >
              <strong>{LOCALE_NAMES[l] || l}</strong>
              <div
                style={{
                  width: 120,
                  height: 180,
                  borderRadius: 8,
                  border: "1px dashed rgba(0,0,0,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  background: "#fafafa",
                  color: "rgba(0,0,0,0.45)",
                  textAlign: "center",
                  padding: 4,
                  boxSizing: "border-box",
                }}
              >
                {src ? (
                  <img src={src} alt={`Cover ${LOCALE_NAMES[l] || l}`} style={{ maxWidth: "100%", maxHeight: "100%" }} />
                ) : (
                  "Standard-Cover"
                )}
              </div>
              <label className="zr-btn2 zr-btn2--ghost" style={{ textAlign: "center", cursor: "pointer" }}>
                {busy === l ? "Lädt…" : src ? "Ersetzen" : "Hochladen"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={!!busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) run(l, () => uploadLocaleCover(item.id, l, file));
                  }}
                />
              </label>
              {src ? (
                <button
                  type="button"
                  className="zr-btn2 zr-btn2--ghost"
                  disabled={!!busy}
                  onClick={() => run(l, () => deleteLocaleCover(item.id, l))}
                >
                  Entfernen
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      {err ? <p style={{ color: "#b00020", margin: "8px 0 0" }}>{err}</p> : null}
    </div>
  );
}

function BookRow({ item, locales, onSaved, buyEnabled, onCovers }) {
  const [draft, setDraft] = useState(() => toDraft(item, locales));
  const [state, setState] = useState({ busy: false, msg: "", err: "" });

  useEffect(() => setDraft(toDraft(item, locales)), [item, locales]);

  const setLang = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const setTr = (l, key) => (e) =>
    setDraft((d) => ({
      ...d,
      translations: { ...d.translations, [l]: { ...d.translations[l], [key]: e.target.value } },
    }));

  async function save() {
    setState({ busy: true, msg: "", err: "" });
    try {
      const res = await saveTitleTranslations(item.id, toPayload(draft));
      onSaved(item.id, res);
      setState({ busy: false, msg: "Gespeichert", err: "" });
    } catch (e) {
      setState({ busy: false, msg: "", err: e?.message || "Speichern fehlgeschlagen" });
    }
  }

  return (
    <article
      style={{
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 14,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <Link to={`/book/${item.id}`} style={{ fontWeight: 800, fontSize: "var(--zr-fs, 18px)" }}>
            {item.title || "—"}
          </Link>
          <div style={{ opacity: 0.75 }}>
            {item.author || "—"} · {(item.presented_as || []).join(", ")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", fontSize: "var(--zr-fs, 13px)", gap: 4 }}>
            Sprache meiner Ausgabe
            <input
              value={draft.edition_language}
              onChange={setLang("edition_language")}
              placeholder="de"
              maxLength={2}
              style={{ ...inputStyle, width: 90 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", fontSize: "var(--zr-fs, 13px)", gap: 4 }}>
            Originalsprache
            <input
              value={draft.original_language}
              onChange={setLang("original_language")}
              placeholder="en"
              maxLength={2}
              style={{ ...inputStyle, width: 90 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", fontSize: "var(--zr-fs, 13px)", gap: 4, minWidth: 240 }}>
            Originaltitel
            <input
              value={draft.original_title}
              onChange={setLang("original_title")}
              placeholder="Titel in der Originalsprache"
              style={inputStyle}
            />
          </label>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "130px minmax(220px, 1fr) 230px minmax(140px, 0.6fr) minmax(220px, 1fr)",
            gap: "8px 12px",
            alignItems: "center",
            minWidth: 1000,
          }}
        >
          <div style={{ fontSize: "var(--zr-fs, 12px)", fontWeight: 700, opacity: 0.6 }}>Sprache</div>
          <div style={{ fontSize: "var(--zr-fs, 12px)", fontWeight: 700, opacity: 0.6 }}>Titel (leer = Originaltitel anzeigen)</div>
          <div style={{ fontSize: "var(--zr-fs, 12px)", fontWeight: 700, opacity: 0.6 }}>Art des Titels</div>
          <div style={{ fontSize: "var(--zr-fs, 12px)", fontWeight: 700, opacity: 0.6 }}>Notiz</div>
          <div style={{ fontSize: "var(--zr-fs, 12px)", fontWeight: 700, opacity: 0.6 }}>
            Kauflink dieser Ausgabe (leer = allgemeiner Kauflink)
          </div>
          {locales.map((l) => (
            <React.Fragment key={l}>
              <label htmlFor={`tt-${item.id}-${l}`} style={{ fontWeight: 600 }}>
                {LOCALE_NAMES[l] || l}
              </label>
              <input
                id={`tt-${item.id}-${l}`}
                value={draft.translations[l]?.title || ""}
                onChange={setTr(l, "title")}
                placeholder={item.title || ""}
                style={inputStyle}
              />
              <select
                aria-label={`Art des Titels (${LOCALE_NAMES[l] || l})`}
                value={draft.translations[l]?.kind || "free"}
                onChange={setTr(l, "kind")}
                style={inputStyle}
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <input
                aria-label={`Notiz (${LOCALE_NAMES[l] || l})`}
                value={draft.translations[l]?.note || ""}
                onChange={setTr(l, "note")}
                placeholder="z. B. Ausgabe aus Portugal"
                style={inputStyle}
              />
              <input
                type="url"
                aria-label={`Kauflink (${LOCALE_NAMES[l] || l})`}
                value={draft.translations[l]?.purchase_url || ""}
                onChange={setTr(l, "purchase_url")}
                placeholder={buyEnabled ? "https://…" : "nach DB-Update V20261011_02"}
                disabled={!buyEnabled}
                style={inputStyle}
              />
            </React.Fragment>
          ))}
        </div>
      </div>

      <LocaleCovers item={item} locales={locales} onCovers={onCovers} />

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button className="zr-btn2" onClick={save} disabled={state.busy}>
          {state.busy ? "Speichern…" : "Speichern"}
        </button>
        {state.msg ? <span style={{ color: "#1e6b45" }}>{state.msg}</span> : null}
        {state.err ? <span style={{ color: "#b00020" }}>{state.err}</span> : null}
      </div>
    </article>
  );
}

function Inner() {
  const [data, setData] = useState({ locales: [], items: [], buyEnabled: false });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [notReady, setNotReady] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const d = await listTitleTranslations();
      setData({
        locales: Array.isArray(d?.locales) ? d.locales : [],
        items: Array.isArray(d?.items) ? d.items : [],
        buyEnabled: Boolean(d?.purchase_url_per_locale),
      });
    } catch (e) {
      const msg = String(e?.message || "");
      if (/not active yet|feature_not_ready/i.test(msg)) setNotReady(true);
      else setErr(msg || "Laden fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function onSaved(id, res) {
    setData((d) => ({
      ...d,
      items: d.items.map((it) =>
        it.id === id
          ? {
              ...it,
              edition_language: res?.edition_language ?? it.edition_language,
              original_language: res?.original_language ?? it.original_language,
              original_title: res?.original_title ?? it.original_title,
              translations: res?.translations ?? it.translations,
            }
          : it
      ),
    }));
  }

  function onCovers(id, covers) {
    setData((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === id ? { ...it, covers } : it)),
    }));
  }

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data.items;
    return data.items.filter((it) =>
      `${it.title || ""} ${it.author || ""}`.toLowerCase().includes(s)
    );
  }, [data.items, q]);

  return (
    <section className="zr-section">
      <AdminNavRow />
      <h1 style={{ marginBottom: 6 }}>Titel-Übersetzungen</h1>
      <p className="zr-lede" style={{ marginTop: 0 }}>
        Alle Bücher, die als Top Finished / Top Received präsentiert wurden. Pro Sprache: Titel und ob es
        der Originaltitel, der Titel einer offiziellen Ausgabe oder eine sinngemäße Übersetzung ist – und
        optional ein eigener Kauflink für die Ausgabe in dieser Sprache (gilt nur, wenn ein Titel eingetragen ist).
      </p>

      <div style={{ display: "flex", gap: 10, margin: "12px 0 18px", flexWrap: "wrap" }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Titel oder Autor filtern"
          aria-label="Titel oder Autor filtern"
          style={{ ...inputStyle, maxWidth: 360 }}
        />
        <button className="zr-btn2 zr-btn2--ghost" onClick={refresh} disabled={loading}>
          ⟳ Neu laden
        </button>
      </div>

      {notReady ? (
        <div
          role="status"
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 14,
            padding: 16,
            background: "#fff8e6",
            marginBottom: 16,
          }}
        >
          <strong>Noch nicht aktiv.</strong> Für die Titel-Übersetzungen fehlt noch das Datenbank-Update
          (Flyway-Migrationen <code>V20261006_01</code> und <code>V20261006_02</code>). Bis dahin zeigt die
          Website überall die Originaltitel – sonst funktioniert alles wie gewohnt.
        </div>
      ) : null}
      {err ? <p style={{ color: "#b00020" }}>{err}</p> : null}
      {loading ? <p>Laden…</p> : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {visible.map((it) => (
          <BookRow key={it.id} item={it} locales={data.locales} onSaved={onSaved} buyEnabled={data.buyEnabled} onCovers={onCovers} />
        ))}
      </div>
    </section>
  );
}

export default function AdminTitleTranslationsPage() {
  return (
    <RequireAdmin>
      <Inner />
    </RequireAdmin>
  );
}

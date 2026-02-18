// frontend/src/components/BookForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import { autocomplete, registerBook, updateBook } from "../api/books";

// IMPORTANT: Never use `[]` as a default prop value inside a component signature,
// because it creates a new array on every render and can trigger infinite effects.
const EMPTY_ARR = Object.freeze([]);

function shallowEqualObj(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

/* ---------- tolerant field picker ---------- */
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function pick(b, aliases) {
  if (!b || !aliases?.length) return undefined;
  const keyMap = new Map(Object.keys(b).map((k) => [norm(k), k]));
  for (const alias of aliases) {
    const k = keyMap.get(norm(alias));
    if (k != null) return b[k];
  }
  return undefined;
}

const toStr = (v) => (v === undefined || v === null ? "" : String(v));

// Keep numeric inputs as strings.
const numToStr = (v) => {
  if (v === undefined || v === null || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? String(n).replace(".", ",") : "";
};

const parseDecimal = (s) => {
  const t = String(s ?? "").trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const parseIntOrNull = (s) => {
  const t = String(s ?? "").trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
};

function coerceScalar(raw) {
  if (raw === null) return null;
  if (raw === undefined) return undefined;
  if (typeof raw === "boolean" || typeof raw === "number") return raw;
  const s = String(raw).trim();
  if (s === "") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  const n = Number(s.replace(",", "."));
  if (Number.isFinite(n) && /^-?[0-9]+([\.,][0-9]+)?$/.test(s)) return n;
  return s;
}

/* ------------------------------------------------------------------------- */

export default function BookForm({
  mode = "create", // create | edit
  bookId,
  initialBook,
  lockBarcode = false,
  assignBarcode = true,
  createReadingStatus,
  submitLabel = mode === "create" ? "Speichern" : "Aktualisieren",
  onCancel,
  onSuccess,
  showUnknownFields = false,
  excludeUnknownKeys = EMPTY_ARR,
}) {
  const isEdit = mode === "edit";

  // Derive a stable dependency from excludeUnknownKeys values.
  // (Parents sometimes pass a literal array, which changes reference every render.)
  const excludeKey = (excludeUnknownKeys || EMPTY_ARR)
    .map((k) => String(k))
    .sort()
    .join("|");

  const initial = useMemo(() => {
    const b = initialBook || {};
    return {
      barcode: toStr(pick(b, ["barcode", "BMarkb", "BMark", "code"])) ,

      // size (optional on edit)
      BBreite: numToStr(pick(b, ["BBreite", "width"])),
      BHoehe: numToStr(pick(b, ["BHoehe", "height"])),

      // ✅ canonical author fields
      author_lastname: toStr(pick(b, ["author_lastname", "BAutor", "author", "Autor"])),
      author_firstname: toStr(pick(b, ["author_firstname"])),
      name_display: toStr(pick(b, ["name_display", "author_name_display", "author_display"])),

      // ✅ canonical publisher fields
      publisher_name: toStr(pick(b, ["publisher_name"])),
      publisher_name_display: toStr(pick(b, ["publisher_name_display", "BVerlag", "publisher"])),

      // title keywords
      BKw: toStr(pick(b, ["BKw", "title_keyword", "keyword"])),
      BKP: toStr(pick(b, ["BKP", "title_keyword_position"])),
      BKw1: toStr(pick(b, ["BKw1", "title_keyword2"])),
      BK1P: toStr(pick(b, ["BK1P", "title_keyword2_position"])),
      BKw2: toStr(pick(b, ["BKw2", "title_keyword3"])),
      BK2P: toStr(pick(b, ["BK2P", "title_keyword3_position"])),

      BSeiten: toStr(pick(b, ["BSeiten", "pages"])),

      // misc
      purchase_url: toStr(pick(b, ["purchase_url"])),
      isbn13: toStr(pick(b, ["isbn13"])),
      isbn10: toStr(pick(b, ["isbn10"])),
      title_display: toStr(pick(b, ["title_display"])),
      title_en: toStr(pick(b, ["title_en"])),
      comment: toStr(pick(b, ["comment"])),
    };
  }, [initialBook]);

  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // known/extra fields
  const knownKeys = useMemo(
    () =>
      new Set(
        [
          "id",
          "_id",
          "createdat",
          "created_at",
          "updatedat",
          "updated_at",
          "registered_at",
          "registeredat",
          "beind",
          "barcode",
          "bmark",
          "bmarkb",
          "code",

          // form keys
          "bbreite",
          "bhoehe",

          "author_lastname",
          "author_firstname",
          "name_display",
          "author_name_display",
          "author_display",

          "publisher_name",
          "publisher_name_display",
          "bverlag",
          "publisher",

          "bkw",
          "bkp",
          "bkw1",
          "bk1p",
          "bkw2",
          "bk2p",
          "bseiten",
          "pages",

          "purchase_url",
          "isbn10",
          "isbn13",
          "title_display",
          "title_en",
          "comment",

          "status",
          "reading_status",
        ].map(norm)
      ),
    []
  );

  const [extras, setExtras] = useState({});

  // NOTE: Effect dependencies are compared by reference.
  // If a parent passes a new object each render (same values, different reference),
  // depending on that object directly can cause an update loop.
  // We therefore depend on stable *value signatures* instead.
  const initialSig = useMemo(() => JSON.stringify(initial), [initial]);

  const computedExtras = useMemo(() => {
    if (!showUnknownFields) return {};

    const b = initialBook || {};
    const ex = {};

    const excludeArr = excludeKey ? excludeKey.split("|").filter(Boolean) : [];
    const exclude = new Set(excludeArr);

    for (const [k, raw] of Object.entries(b)) {
      if (!k) continue;
      if (exclude.has(k)) continue;
      if (knownKeys.has(norm(k))) continue;
      if (k.startsWith("_")) continue;
      if (typeof raw === "object" && raw !== null) continue;
      ex[k] = toStr(raw);
    }

    return ex;
  }, [initialBook, showUnknownFields, excludeKey, knownKeys]);

  const extrasSig = useMemo(() => JSON.stringify(computedExtras), [computedExtras]);

  useEffect(() => {
    setV((p) => (shallowEqualObj(p, initial) ? p : initial));
  }, [initialSig]);

  useEffect(() => {
    if (!showUnknownFields) {
      // Avoid infinite re-renders by not setting a *new* empty object every render.
      setExtras((p) => (p && Object.keys(p).length ? {} : p));
      return;
    }

    setExtras((p) => (shallowEqualObj(p, computedExtras) ? p : computedExtras));
  }, [extrasSig, showUnknownFields]);

  function setField(key, val) {
    setV((p) => ({ ...p, [key]: val }));
  }
  function setExtra(key, val) {
    setExtras((p) => ({ ...p, [key]: val }));
  }

  // light autocomplete
  const [ac, setAc] = useState({ field: "", items: [] });
  async function runAutocomplete(field, q) {
    const t = String(q || "").trim();
    if (t.length < 1) return setAc({ field: "", items: [] });
    try {
      const items = await autocomplete(field, t);
      if (Array.isArray(items)) setAc({ field, items: items.slice(0, 8) });
    } catch {
      // ignore
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    const payload = {};

    const w = parseDecimal(v.BBreite);
    const h = parseDecimal(v.BHoehe);

    // CREATE: size + author + keyword required (barcode assignment needs size rules)
    if (!isEdit) {
      if (!w || w <= 0 || !h || h <= 0) return setMsg("Breite und Höhe sind erforderlich (für Barcode/Serie)." );
      if (!v.author_lastname.trim() && !v.author_firstname.trim()) return setMsg("Autor ist erforderlich.");
      if (!v.BKw.trim()) return setMsg("Stichwort ist erforderlich.");
    }

    const addIfChanged = (key, next, prev) => {
      if (next === prev) return;
      payload[key] = next;
    };

    const nextBarcode = v.barcode.trim();
    if (!lockBarcode && !isEdit && assignBarcode && nextBarcode) payload.barcode = nextBarcode;

    // size
    if (!isEdit) {
      payload.BBreite = w;
      payload.BHoehe = h;
    } else {
      if (v.BBreite.trim()) {
        if (w === null || w <= 0) return setMsg("Breite ist keine gültige Zahl.");
        if (v.BBreite !== initial.BBreite) payload.BBreite = w;
      }
      if (v.BHoehe.trim()) {
        if (h === null || h <= 0) return setMsg("Höhe ist keine gültige Zahl.");
        if (v.BHoehe !== initial.BHoehe) payload.BHoehe = h;
      }
    }

    // ✅ author (only these 3 are maintained)
    const nextLast = v.author_lastname.trim() ? v.author_lastname.trim() : null;
    const prevLast = initial.author_lastname.trim() ? initial.author_lastname.trim() : null;
    const nextFirst = v.author_firstname.trim() ? v.author_firstname.trim() : null;
    const prevFirst = initial.author_firstname.trim() ? initial.author_firstname.trim() : null;
    const nextDisp = v.name_display.trim() ? v.name_display.trim() : null;
    const prevDisp = initial.name_display.trim() ? initial.name_display.trim() : null;

    if (!isEdit) {
      if (nextLast !== null) payload.author_lastname = nextLast;
      if (nextFirst !== null) payload.author_firstname = nextFirst;
      if (nextDisp !== null) payload.name_display = nextDisp;
    } else {
      addIfChanged("author_lastname", nextLast, prevLast);
      addIfChanged("author_firstname", nextFirst, prevFirst);
      addIfChanged("name_display", nextDisp, prevDisp);
    }

    // ✅ publisher (you maintain name + name_display)
    const nextPubName = v.publisher_name.trim() ? v.publisher_name.trim() : null;
    const prevPubName = initial.publisher_name.trim() ? initial.publisher_name.trim() : null;
    const nextPubDisp = v.publisher_name_display.trim() ? v.publisher_name_display.trim() : null;
    const prevPubDisp = initial.publisher_name_display.trim() ? initial.publisher_name_display.trim() : null;

    if (!isEdit) {
      if (nextPubName !== null) payload.publisher_name = nextPubName;
      if (nextPubDisp !== null) payload.publisher_name_display = nextPubDisp;
    } else {
      addIfChanged("publisher_name", nextPubName, prevPubName);
      addIfChanged("publisher_name_display", nextPubDisp, prevPubDisp);
    }

    // title keywords etc.
    const fieldPairs = [
      ["BKw", v.BKw, initial.BKw, (s) => (s.trim() ? s.trim() : null)],
      ["BKw1", v.BKw1, initial.BKw1, (s) => (s.trim() ? s.trim() : null)],
      ["BKw2", v.BKw2, initial.BKw2, (s) => (s.trim() ? s.trim() : null)],
      ["purchase_url", v.purchase_url, initial.purchase_url, (s) => (s.trim() ? s.trim() : null)],
      ["isbn13", v.isbn13, initial.isbn13, (s) => (s.trim() ? s.trim() : null)],
      ["isbn10", v.isbn10, initial.isbn10, (s) => (s.trim() ? s.trim() : null)],
      ["title_display", v.title_display, initial.title_display, (s) => (s.trim() ? s.trim() : null)],
      ["title_en", v.title_en, initial.title_en, (s) => (s.trim() ? s.trim() : null)],
      ["comment", v.comment, initial.comment, (s) => (s.trim() ? s.trim() : null)],
    ];

    for (const [k, nextRaw, prevRaw, normFn] of fieldPairs) {
      const next = normFn(nextRaw);
      const prev = normFn(prevRaw);
      if (!isEdit) {
        if (next !== null) payload[k] = next;
      } else {
        addIfChanged(k, next, prev);
      }
    }

    const intPairs = [
      ["BKP", v.BKP, initial.BKP],
      ["BK1P", v.BK1P, initial.BK1P],
      ["BK2P", v.BK2P, initial.BK2P],
      ["BSeiten", v.BSeiten, initial.BSeiten],
    ];

    for (const [k, nextRaw, prevRaw] of intPairs) {
      const next = parseIntOrNull(nextRaw);
      const prev = parseIntOrNull(prevRaw);
      if (!isEdit) {
        if (next !== null) payload[k] = next;
      } else {
        if (!String(nextRaw ?? "").trim()) continue;
        addIfChanged(k, next, prev);
      }
    }

    // unknown fields (only on edit)
    if (isEdit && showUnknownFields) {
      for (const [k, nextStr] of Object.entries(extras || {})) {
        if (!k) continue;
        const prevStr = toStr((initialBook || {})[k]);
        if (nextStr === prevStr) continue;
        payload[k] = coerceScalar(nextStr);
      }
    }

    if (!isEdit && createReadingStatus) payload.reading_status = createReadingStatus;

    if (isEdit && Object.keys(payload).length === 0) {
      setMsg("Keine Änderungen.");
      return;
    }

    setBusy(true);
    try {
      const saved = isEdit
        ? await updateBook(bookId || initialBook?._id || initialBook?.id, payload)
        : await registerBook(payload);

      onSuccess && onSuccess({ payload, saved });
      if (!isEdit) setV((p) => ({ ...p, barcode: "" }));
      setMsg(isEdit ? "Gespeichert." : "Registriert.");
    } catch (err) {
      setMsg(err?.message || "Fehler beim Speichern");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>{isEdit ? "Edit Book" : "Register Book"}</h2>

      {msg ? (
        <div
          className="zr-card"
          style={{
            borderColor: msg.toLowerCase().includes("fehler") ? "rgba(200,0,0,0.25)" : "rgba(0,0,0,0.12)",
            background: msg.toLowerCase().includes("fehler") ? "rgba(200,0,0,0.04)" : "rgba(0,0,0,0.02)",
          }}
        >
          {msg}
        </div>
      ) : null}

      {/* Size - optional on edit */}
      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6 }}>
          <span>Breite (BBreite)</span>
          <input
            className="zr-input"
            type="text"
            inputMode="decimal"
            placeholder={isEdit ? "(optional)" : "z.B. 15,2"}
            value={v.BBreite}
            onChange={(e) => setField("BBreite", e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Höhe (BHoehe)</span>
          <input
            className="zr-input"
            type="text"
            inputMode="decimal"
            placeholder={isEdit ? "(optional)" : "z.B. 21,0"}
            value={v.BHoehe}
            onChange={(e) => setField("BHoehe", e.target.value)}
          />
        </label>
      </div>

      {/* Barcode */}
      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Barcode{lockBarcode ? " (gesperrt)" : ""}</span>
          <input
            className="zr-input"
            value={v.barcode}
            disabled={lockBarcode || busy || isEdit}
            onChange={(e) => setField("barcode", e.target.value)}
            placeholder={assignBarcode ? "z.B. dk444" : "(leer)"}
          />
        </label>
      </div>

      {/* Author */}
      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Autor (nur in authors gepflegt)</div>
        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1, position: "relative" }}>
            <span>Nachname (author_lastname)</span>
            <input
              className="zr-input"
              value={v.author_lastname}
              onChange={(e) => {
                setField("author_lastname", e.target.value);
                runAutocomplete("BAutor", e.target.value);
              }}
              onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 150)}
            />
            {ac.field === "BAutor" && ac.items.length ? (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 5,
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 12,
                  padding: 6,
                  marginTop: 4,
                }}
              >
                {ac.items.map((it) => (
                  <button
                    key={it}
                    type="button"
                    className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                    style={{ width: "100%", justifyContent: "flex-start", marginBottom: 4 }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      // best effort split "First Last" from suggestion
                      const parts = String(it).trim().split(/\s+/);
                      if (parts.length >= 2) {
                        setField("author_firstname", parts.slice(0, -1).join(" "));
                        setField("author_lastname", parts.slice(-1).join(""));
                        setField("name_display", it);
                      } else {
                        setField("author_lastname", it);
                        setField("name_display", it);
                      }
                      setAc({ field: "", items: [] });
                    }}
                  >
                    {it}
                  </button>
                ))}
              </div>
            ) : null}
          </label>

          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Vorname (author_firstname)</span>
            <input
              className="zr-input"
              value={v.author_firstname}
              onChange={(e) => setField("author_firstname", e.target.value)}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Anzeigename (name_display)</span>
          <input
            className="zr-input"
            value={v.name_display}
            onChange={(e) => setField("name_display", e.target.value)}
            placeholder="z.B. Barbara Wood"
          />
        </label>
      </div>

      {/* Keywords */}
      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Stichwort (BKw)</span>
          <input
            className="zr-input"
            value={v.BKw}
            onChange={(e) => {
              setField("BKw", e.target.value);
              runAutocomplete("BKw", e.target.value);
            }}
            onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 150)}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Position (BKP)</span>
          <input
            className="zr-input"
            type="text"
            inputMode="numeric"
            value={v.BKP}
            onChange={(e) => setField("BKP", e.target.value)}
          />
        </label>
      </div>

      {/* Publisher */}
      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Verlag (nur in publishers gepflegt)</div>
        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>publisher.name (Key)</span>
            <input
              className="zr-input"
              value={v.publisher_name}
              onChange={(e) => setField("publisher_name", e.target.value)}
              placeholder="z.B. heyne"
            />
          </label>

          <label style={{ display: "grid", gap: 6, flex: 2, position: "relative" }}>
            <span>publisher.name_display</span>
            <input
              className="zr-input"
              value={v.publisher_name_display}
              onChange={(e) => {
                setField("publisher_name_display", e.target.value);
                runAutocomplete("BVerlag", e.target.value);
              }}
              onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 150)}
            />
            {ac.field === "BVerlag" && ac.items.length ? (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 5,
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: 12,
                  padding: 6,
                  marginTop: 4,
                }}
              >
                {ac.items.map((it) => (
                  <button
                    key={it}
                    type="button"
                    className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                    style={{ width: "100%", justifyContent: "flex-start", marginBottom: 4 }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setField("publisher_name_display", it);
                      setAc({ field: "", items: [] });
                    }}
                  >
                    {it}
                  </button>
                ))}
              </div>
            ) : null}
          </label>
        </div>
      </div>

      {/* Pages */}
      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6 }}>
          <span>Seiten (BSeiten)</span>
          <input
            className="zr-input"
            type="text"
            inputMode="numeric"
            value={v.BSeiten}
            onChange={(e) => setField("BSeiten", e.target.value)}
          />
        </label>
      </div>

      {/* Title display / language */}
      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Titel (optional)</div>
        <label style={{ display: "grid", gap: 6 }}>
          <span>title_display</span>
          <input className="zr-input" value={v.title_display} onChange={(e) => setField("title_display", e.target.value)} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>title_en</span>
          <input className="zr-input" value={v.title_en} onChange={(e) => setField("title_en", e.target.value)} />
        </label>
      </div>

      {/* ISBN & Kauf-Link */}
      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>ISBN & Kauf-Link (optional)</div>
        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>ISBN-13</span>
            <input className="zr-input" value={v.isbn13} onChange={(e) => setField("isbn13", e.target.value)} />
          </label>
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>ISBN-10</span>
            <input className="zr-input" value={v.isbn10} onChange={(e) => setField("isbn10", e.target.value)} />
          </label>
        </div>
        <label style={{ display: "grid", gap: 6 }}>
          <span>purchase_url</span>
          <input
            className="zr-input"
            value={v.purchase_url}
            onChange={(e) => setField("purchase_url", e.target.value)}
            placeholder="https://…"
          />
        </label>
      </div>

      {/* Comment */}
      <label style={{ display: "grid", gap: 6 }}>
        <span>comment</span>
        <input className="zr-input" value={v.comment} onChange={(e) => setField("comment", e.target.value)} />
      </label>

      {isEdit && showUnknownFields && Object.keys(extras || {}).length ? (
        <div className="zr-card" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>Weitere Felder</div>
          {Object.keys(extras)
            .sort((a, b) => a.localeCompare(b))
            .map((k) => (
              <label key={k} style={{ display: "grid", gap: 6 }}>
                <span>{k}</span>
                <input className="zr-input" value={extras[k] ?? ""} onChange={(e) => setExtra(k, e.target.value)} />
              </label>
            ))}
        </div>
      ) : null}

      <div className="zr-toolbar" style={{ marginTop: 4 }}>
        <button className="zr-btn2 zr-btn2--primary" disabled={busy} type="submit">
          {busy ? "…" : submitLabel}
        </button>
        {onCancel ? (
          <button className="zr-btn2 zr-btn2--ghost" type="button" onClick={onCancel} disabled={busy}>
            Abbrechen
          </button>
        ) : null}
      </div>
    </form>
  );
}

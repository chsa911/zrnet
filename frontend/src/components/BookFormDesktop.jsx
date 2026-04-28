import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  autocomplete,
  findDraft,
  lookupIsbn,
  registerBook,
  registerExistingBook,
  updateBook,
} from "../api/books";
import { previewBarcode } from "../api/barcodes";
import { formatBookCode } from "../utils/bookCodeDisplay";

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const toStr = (v) => (v === undefined || v === null ? "" : String(v));

function pick(b, aliases) {
  if (!b || !aliases?.length) return undefined;
  const keyMap = new Map(Object.keys(b).map((k) => [norm(k), k]));
  for (const alias of aliases) {
    const k = keyMap.get(norm(alias));
    if (k != null) return b[k];
  }
  return undefined;
}

function parseIntOrNull(s) {
  const t = String(s ?? "").trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloatOrNull(s) {
  const t = String(s ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function stripIsbn(raw) {
  return String(raw || "").trim().toUpperCase().replace(/[^0-9X]/g, "");
}

function isValidIsbn10(s) {
  if (!/^[0-9]{9}[0-9X]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += (s[i] === "X" ? 10 : Number(s[i])) * (10 - i);
  return sum % 11 === 0;
}

function isValidIsbn13(s) {
  if (!/^[0-9]{13}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(s[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === Number(s[12]);
}

function normalizeIsbnInputs(isbn13In, isbn10In) {
  const a = stripIsbn(isbn13In);
  const b = stripIsbn(isbn10In);
  let isbn13 = null;
  let isbn10 = null;

  if (a.length === 13 && /^[0-9]{13}$/.test(a)) isbn13 = a;
  if (b.length === 10 && /^[0-9]{9}[0-9X]$/.test(b)) isbn10 = b;
  if (!isbn10 && a.length === 10 && /^[0-9]{9}[0-9X]$/.test(a)) isbn10 = a;
  if (!isbn13 && b.length === 13 && /^[0-9]{13}$/.test(b)) isbn13 = b;

  const raw = a || b || null;
  const lookupOk = (isbn13 && isValidIsbn13(isbn13)) || (isbn10 && isValidIsbn10(isbn10));
  return { isbn13, isbn10, raw, lookupOk };
}

function splitAuthorName(name) {
  const s = String(name || "").trim();
  if (!s) return { first: "", last: "", display: "" };
  if (s.includes(",")) {
    const [last, first] = s.split(",").map((x) => x.trim());
    return { first: first || "", last: last || "", display: [first, last].filter(Boolean).join(" ").trim() };
  }
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: "", last: parts[0], display: parts[0] };
  return { first: parts.slice(0, -1).join(" "), last: parts.slice(-1)[0], display: s };
}

function computeKeywordFromTitle(title) {
  const t = String(title || "").trim();
  if (!t) return { keyword: "", pos: "" };
  const articles = ["der", "die", "das", "ein", "eine", "einer", "eines", "the", "a", "an", "la", "le", "les", "el"];
  const m = t.match(/^([A-Za-zÄÖÜäöüß]+)\s+(.*)$/);
  if (!m) return { keyword: t, pos: "0" };
  if (articles.includes(m[1].toLowerCase())) return { keyword: m[2].trim(), pos: "1" };
  return { keyword: t, pos: "0" };
}

const emptyForm = {
  barcode: "",
  author_id: "",
  publisher_id: "",
  author_lastname: "",
  author_firstname: "",
  name_display: "",
  author_abbreviation: "",
  publisher_name_display: "",
  publisher_abbr: "",
  title_display: "",
  subtitle_display: "",
  pages: "",
  width_cm: "",
  height_cm: "",
  isbn13: "",
  isbn10: "",
};

export default function BookFormDesktop({
  mode = "create",
  bookId,
  initialBook,
  lockBarcode = false,
  assignBarcode = true,
  createReadingStatus,
  submitLabel = mode === "create" ? "Speichern" : "Aktualisieren",
  onCancel,
  onSuccess,
}) {
  const isEdit = mode === "edit";
  const msgRef = useRef(null);

  const initial = useMemo(() => {
    const b = initialBook || {};
    return {
      ...emptyForm,
      barcode: toStr(pick(b, ["barcode", "BMarkb", "BMark", "code"])),
      author_id: toStr(pick(b, ["author_id"])),
      publisher_id: toStr(pick(b, ["publisher_id"])),
      author_lastname: toStr(pick(b, ["author_lastname", "author_last_name"])),
      author_firstname: toStr(pick(b, ["author_firstname", "author_first_name"])),
      name_display: toStr(pick(b, ["name_display", "author_name_display"])),
      author_abbreviation: toStr(pick(b, ["author_abbreviation", "abbreviation"])),
      publisher_name_display: toStr(pick(b, ["publisher_name_display"])),
      publisher_abbr: toStr(pick(b, ["publisher_abbr", "publisher_abbreviation", "abbr"])),
      title_display: toStr(pick(b, ["title_display", "titleDisplay", "title"])),
      subtitle_display: toStr(pick(b, ["subtitle_display"])),
      pages: toStr(pick(b, ["pages"])),
      width_cm: toStr(pick(b, ["width_cm", "width", "bbreite"])),
      height_cm: toStr(pick(b, ["height_cm", "height", "bhoehe"])),
      isbn13: toStr(pick(b, ["isbn13"])),
      isbn10: toStr(pick(b, ["isbn10"])),
    };
  }, [initialBook]);

  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [isbnBusy, setIsbnBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ac, setAc] = useState({ field: "", items: [] });
  const [barcodePreview, setBarcodePreview] = useState(null);
  const [barcodePreviewErr, setBarcodePreviewErr] = useState("");
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftCandidates, setDraftCandidates] = useState([]);
  const [draftSelectedId, setDraftSelectedId] = useState("");

  useEffect(() => setV(initial), [initial]);

  useEffect(() => {
    if (!msg) return;
    msgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [msg]);

  useEffect(() => {
    if (isEdit || !assignBarcode || String(v.barcode || "").trim()) {
      setBarcodePreview(null);
      setBarcodePreviewErr("");
      return;
    }

    const w = parseFloatOrNull(v.width_cm);
    const h = parseFloatOrNull(v.height_cm);
    if (!(w > 0 && h > 0)) {
      setBarcodePreview(null);
      setBarcodePreviewErr("");
      return;
    }

    let alive = true;
    const t = setTimeout(async () => {
      try {
        setBarcodePreviewErr("");
        const p = await previewBarcode(w, h);
        if (alive) setBarcodePreview(p);
      } catch (e) {
        if (!alive) return;
        setBarcodePreview(null);
        setBarcodePreviewErr(e?.message || "Kein Vorschlag");
      }
    }, 200);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [isEdit, assignBarcode, v.barcode, v.width_cm, v.height_cm]);

  useEffect(() => {
    if (isEdit || !assignBarcode) return;

    const pagesRaw = String(v.pages || "").trim();
    const code = /^[0-9]+$/.test(pagesRaw) ? pagesRaw : "";
    const titleDisplay = String(v.title_display || "").trim();
    const authorDisplay = String(v.name_display || "").trim();
    const publisherDisplay = String(v.publisher_name_display || "").trim();
    const isbnN = normalizeIsbnInputs(v.isbn13, v.isbn10);
    const isbn = isbnN.isbn13 || isbnN.isbn10 || "";

    const hasKey = !!code || !!titleDisplay || !!authorDisplay || !!publisherDisplay || !!isbn;

    if (!hasKey) {
      setDraftCandidates([]);
      setDraftSelectedId("");
      return;
    }

    let alive = true;
    const t = setTimeout(async () => {
      try {
        setDraftBusy(true);
        const r = await findDraft({
          code: code || undefined,
          pages: code || undefined,
          isbn: isbn || undefined,
          title_display: titleDisplay || undefined,
          name_display: authorDisplay || undefined,
          publisher_name_display: publisherDisplay || undefined,
        });

        if (!alive) return;
        const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
        setDraftCandidates(items);
        setDraftSelectedId((prev) => {
          if (prev && items.some((x) => x.id === prev)) return prev;
          return items.length === 1 ? items[0].id : "";
        });
      } catch {
        if (!alive) return;
        setDraftCandidates([]);
        setDraftSelectedId("");
      } finally {
        if (alive) setDraftBusy(false);
      }
    }, 350);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [
    isEdit,
    assignBarcode,
    v.pages,
    v.title_display,
    v.name_display,
    v.publisher_name_display,
    v.isbn13,
    v.isbn10,
  ]);

  function setField(key, val) {
    setV((prev) => {
      const next = { ...prev, [key]: val };
      if (!isEdit) {
        if (["author_lastname", "author_firstname", "name_display", "author_abbreviation"].includes(key)) next.author_id = "";
        if (["publisher_name_display", "publisher_abbr"].includes(key)) next.publisher_id = "";
      }
      return next;
    });
  }

  function suggestionKey(it, index) {
    if (it && typeof it === "object") return String(it.id || it.name_display || it.name || it.last_name || index);
    return String(it ?? index);
  }

  function authorSuggestionLabel(it) {
    if (!it || typeof it === "string") return String(it || "");
    const display = String(it.name_display || "").trim() || [it.first_name, it.last_name].filter(Boolean).join(" ").trim() || String(it.last_name || "").trim();
    const abbr = String(it.abbreviation || it.author_abbreviation || "").trim();
    return [display, abbr].filter(Boolean).join(" · ");
  }

  function publisherSuggestionLabel(it) {
    if (!it || typeof it === "string") return String(it || "");
    const display = String(it.name_display || it.publisher_name_display || it.name || "").trim();
    const abbr = String(it.abbr || it.publisher_abbr || "").trim();
    return [display, abbr].filter(Boolean).join(" · ");
  }

  async function runAutocomplete(field, q) {
    const t = String(q || "").trim();
    if (t.length < 1) return setAc({ field: "", items: [] });
    try {
      const items = await autocomplete(field, t);
      if (Array.isArray(items)) setAc({ field, items: items.slice(0, 8) });
    } catch {
      setAc({ field: "", items: [] });
    }
  }

  function applyAuthorMatch(match) {
    if (!match) return;
    if (typeof match === "string") {
      const { first, last, display } = splitAuthorName(match);
      setV((prev) => ({ ...prev, author_id: isEdit ? prev.author_id : "", author_firstname: first, author_lastname: last, name_display: display }));
      return;
    }

    const last = String(match.last_name || match.author_last_name || "").trim();
    const first = String(match.first_name || match.author_first_name || "").trim();
    const display = String(match.name_display || match.author_name_display || "").trim() || [first, last].filter(Boolean).join(" ").trim();

    setV((prev) => ({
      ...prev,
      author_id: String(match.id || match.author_id || "").trim() || prev.author_id,
      author_lastname: last || prev.author_lastname,
      author_firstname: first || prev.author_firstname,
      name_display: display || prev.name_display,
      author_abbreviation: String(match.abbreviation || match.author_abbreviation || prev.author_abbreviation || ""),
    }));
  }

  function applyPublisherMatch(match) {
    if (!match) return;
    if (typeof match === "string") return setField("publisher_name_display", match);

    setV((prev) => ({
      ...prev,
      publisher_id: String(match.id || match.publisher_id || "").trim() || prev.publisher_id,
      publisher_name_display: String(match.name_display || match.publisher_name_display || match.name || prev.publisher_name_display || ""),
      publisher_abbr: String(match.abbr || match.publisher_abbr || prev.publisher_abbr || ""),
    }));
  }

  function applyDraft(d) {
    if (!d) return;
    setDraftSelectedId(d.id);

    setV((prev) => ({
      ...prev,
      author_id: prev.author_id || d.author_id || "",
      publisher_id: prev.publisher_id || d.publisher_id || "",
      title_display: prev.title_display || d.title_display || "",
      subtitle_display: prev.subtitle_display || d.subtitle_display || "",
      name_display: prev.name_display || d.author_name_display || d.name_display || "",
      author_lastname: prev.author_lastname || d.author_last_name || "",
      author_firstname: prev.author_firstname || d.author_first_name || "",
      author_abbreviation: prev.author_abbreviation || d.author_abbreviation || "",
      publisher_name_display: prev.publisher_name_display || d.publisher_name_display || "",
      publisher_abbr: prev.publisher_abbr || d.publisher_abbr || "",
      pages: prev.pages || toStr(d.pages),
      isbn13: prev.isbn13 || d.isbn13 || "",
      isbn10: prev.isbn10 || d.isbn10 || "",
    }));
  }

  async function doIsbnLookup() {
    const n = normalizeIsbnInputs(v.isbn13, v.isbn10);
    const isbn = n.isbn13 || n.isbn10 || "";
    if (!isbn) return setMsg("ISBN fehlt.");
    if (!n.lookupOk) return setMsg("ISBN sieht ungültig aus. Lookup übersprungen.");

    setIsbnBusy(true);
    setMsg("");
    try {
      const r = await lookupIsbn(isbn);
      const s = r?.suggested || r || {};
      const title = s.title_display || s.title || "";
      const authorDisplay = s.name_display || s.author_name_display || (Array.isArray(s.authors) ? s.authors.filter(Boolean).join(", ") : "");
      const { first, last, display } = splitAuthorName(authorDisplay);
      const kw = computeKeywordFromTitle(title);

      setV((prev) => ({
        ...prev,
        isbn13: prev.isbn13 || s.isbn13 || "",
        isbn10: prev.isbn10 || s.isbn10 || "",
        title_display: prev.title_display || title || "",
        subtitle_display: prev.subtitle_display || s.subtitle_display || "",
        pages: prev.pages || toStr(s.pages),
        author_id: prev.author_id || s.author_id || "",
        author_lastname: prev.author_lastname || s.author_lastname || last || "",
        author_firstname: prev.author_firstname || s.author_firstname || first || "",
        name_display: prev.name_display || s.name_display || display || "",
        author_abbreviation: prev.author_abbreviation || s.author_abbreviation || "",
        publisher_id: prev.publisher_id || s.publisher_id || "",
        publisher_name_display: prev.publisher_name_display || s.publisher_name_display || "",
        publisher_abbr: prev.publisher_abbr || s.publisher_abbr || "",
      }));

      setMsg(`ISBN gefunden ✔${kw.keyword ? ` · Keyword: ${kw.keyword}` : ""}`);
    } catch (e) {
      setMsg(e?.message || "ISBN Lookup fehlgeschlagen");
    } finally {
      setIsbnBusy(false);
    }
  }

  function buildPayload() {
    const payload = {};
    if (!isEdit) payload.assign_barcode = !!assignBarcode;

    const suggestedBarcode = String(barcodePreview?.candidate || "").trim();
    const finalBarcode = String(v.barcode || "").trim() || suggestedBarcode;
    const wCm = parseFloatOrNull(v.width_cm);
    const hCm = parseFloatOrNull(v.height_cm);

    if (!isEdit && assignBarcode && !finalBarcode) {
      if (!(wCm > 0 && hCm > 0)) throw new Error("Breite + Höhe oder BookCode nötig.");
    }

    if (!lockBarcode && !isEdit && assignBarcode && finalBarcode) payload.barcode = finalBarcode;
    if (wCm !== null) payload.width_cm = wCm;
    if (hCm !== null) payload.height_cm = hCm;

    for (const k of [
      "author_lastname",
      "author_firstname",
      "name_display",
      "author_abbreviation",
      "publisher_name_display",
      "publisher_abbr",
      "title_display",
      "subtitle_display",
    ]) {
      const next = String(v[k] || "").trim() || null;
      const prev = String(initial[k] || "").trim() || null;
      if (!isEdit) {
        if (next !== null) payload[k] = next;
      } else if (next !== prev) {
        payload[k] = next;
      }
    }

    const nextAuthorId = String(v.author_id || "").trim() || null;
    const nextPublisherId = String(v.publisher_id || "").trim() || null;
    if (!isEdit) {
      if (nextAuthorId) payload.author_id = nextAuthorId;
      if (nextPublisherId) payload.publisher_id = nextPublisherId;
    }

    const isbnN = normalizeIsbnInputs(v.isbn13, v.isbn10);
    if (isbnN.isbn13) payload.isbn13 = isbnN.isbn13;
    if (isbnN.isbn10) payload.isbn10 = isbnN.isbn10;
    if (!isbnN.isbn13 && !isbnN.isbn10 && isbnN.raw) payload.isbn13_raw = isbnN.raw;

    const pages = parseIntOrNull(v.pages);
    if (pages !== null) payload.pages = pages;

    if (!isEdit && createReadingStatus) payload.reading_status = createReadingStatus;
    return payload;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      setMsg(err?.message || "Ungültige Eingabe");
      return;
    }

    setBusy(true);
    try {
      let saved;
      if (isEdit) {
        saved = await updateBook(bookId || initialBook?._id || initialBook?.id, payload);
      } else if (assignBarcode && draftSelectedId) {
        const p2 = { ...payload };
        delete p2.assign_barcode;
        saved = await registerExistingBook(draftSelectedId, p2);
      } else {
        saved = await registerBook(payload);
      }

      onSuccess?.({ payload, saved });
      setMsg(isEdit ? "Gespeichert." : "Gespeichert ✔");
      if (!isEdit) {
        setV({ ...emptyForm });
        setDraftCandidates([]);
        setDraftSelectedId("");
        setBarcodePreview(null);
      }
    } catch (err) {
      setMsg(err?.message || "Fehler beim Speichern");
    } finally {
      setBusy(false);
    }
  }

  const fieldProps = (key, placeholder, extra = {}) => ({
    className: "bfd-input",
    value: v[key],
    placeholder,
    disabled: busy || extra.disabled,
    onChange: (e) => setField(key, e.target.value),
    ...extra,
  });

  const numberProps = (key, placeholder, width) =>
    fieldProps(key, placeholder, { inputMode: "decimal", style: { width } });

  return (
    <form className="bfd" onSubmit={onSubmit} noValidate>
      <style>{`
        .bfd { display: grid; gap: 4px; align-content: start; font-size: 13px; }
        .bfd * { box-sizing: border-box; }
        .bfd-row { display: flex; align-items: center; gap: 0; min-width: 0; }
        .bfd-input, .bfd-btn {
          height: 28px; border: 1px solid rgba(0,0,0,.28); border-radius: 0;
          background: #fff; color: #111; font: inherit; padding: 0 4px;
          min-width: 0; outline: none;
        }
        .bfd-input::placeholder { color: rgba(0,0,0,.58); opacity: 1; }
        .bfd-btn { cursor: pointer; padding: 0 8px; white-space: nowrap; }
        .bfd-btn-primary { background: #111; color: #fff; border-color: #111; }
        .bfd-suggestion {
          height: 28px; display: inline-flex; align-items: center; padding: 0 8px;
          background: #00b050; color: #fff; font-weight: 800;
          border: 1px solid #008a3f; white-space: nowrap;
        }
        .bfd-msg { border: 1px solid rgba(0,0,0,.24); padding: 4px 6px; min-height: 28px; background: rgba(0,0,0,.025); }
        .bfd-drafts { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
        .bfd-draft-active { background: #111; color: #fff; border-color: #111; }
        .bfd-ac-wrap { position: relative; min-width: 0; }
        .bfd-ac { position: absolute; left: 0; right: 0; top: 28px; z-index: 20; background: #fff; border: 1px solid #111; box-shadow: 0 8px 20px rgba(0,0,0,.12); }
        .bfd-ac button { display: block; width: 100%; height: 26px; border: 0; border-bottom: 1px solid rgba(0,0,0,.08); background: #fff; text-align: left; padding: 0 6px; cursor: pointer; font: inherit; }
        .bfd-ac button:hover { background: rgba(0,0,0,.06); }
        @media (max-width: 768px) { .bfd { display: none; } }
      `}</style>

      {msg ? <div ref={msgRef} className="bfd-msg">{msg}</div> : null}

      <div className="bfd-row">
        <input {...numberProps("width_cm", "Width", "5.6ch")} />
        <input {...numberProps("height_cm", "Height", "5.8ch")} />
        <input
          {...fieldProps(
            "barcode",
            barcodePreview?.candidate ? formatBookCode(barcodePreview.candidate) : "BookCode",
            { disabled: lockBarcode || isEdit, style: { width: "22ch" } }
          )}
        />
        <input {...fieldProps("pages", "Pages", { inputMode: "numeric", style: { width: "6ch" } })} />
        <input {...fieldProps("author_abbreviation", "AAbbr.", { style: { width: "7ch" } })} />
        <input {...fieldProps("publisher_abbr", "PAbbr.", { style: { width: "7ch" } })} />
        <input {...fieldProps("isbn10", "ISBN-10", { style: { width: "11ch" } })} />
        <input {...fieldProps("isbn13", "ISBN-13", { style: { width: "14ch" } })} />
        <button type="button" className="bfd-btn" disabled={busy || isbnBusy} onClick={doIsbnLookup}>
          {isbnBusy ? "…" : "Lookup"}
        </button>

        {barcodePreview?.candidate ? (
          <button type="button" className="bfd-suggestion" onClick={() => setField("barcode", barcodePreview.candidate)}>
            {formatBookCode(barcodePreview.candidate)}
          </button>
        ) : barcodePreviewErr ? (
          <span className="bfd-msg">{barcodePreviewErr}</span>
        ) : null}
      </div>

      {draftBusy ? (
        <div className="bfd-msg">Suche vorhandene Titel…</div>
      ) : draftCandidates.length ? (
        <div className="bfd-msg bfd-drafts">
          <strong>Vorhanden:</strong>
          {draftCandidates.slice(0, 6).map((d) => (
            <button
              key={d.id}
              type="button"
              className={`bfd-btn ${d.id === draftSelectedId ? "bfd-draft-active" : ""}`}
              onClick={() => applyDraft(d)}
              title={d.id}
            >
              {[d.title_display || d.title_keyword || "Ohne Titel", d.author_name_display || d.name_display].filter(Boolean).join(" · ")}
            </button>
          ))}
          {draftSelectedId ? <span>Wird beim Speichern aktualisiert.</span> : null}
        </div>
      ) : null}

      <div className="bfd-row">
        <div className="bfd-ac-wrap" style={{ flex: "1 1 18ch" }}>
          <input
            {...fieldProps("name_display", "Author")}
            onChange={(e) => {
              setField("name_display", e.target.value);
              runAutocomplete("author_lastname", e.target.value);
            }}
            onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 120)}
          />
          {ac.field === "author_lastname" && ac.items.length ? (
            <div className="bfd-ac">
              {ac.items.map((it, index) => (
                <button key={suggestionKey(it, index)} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { applyAuthorMatch(it); setAc({ field: "", items: [] }); }}>
                  {authorSuggestionLabel(it)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <input {...fieldProps("title_display", "Title")} style={{ flex: "2 1 28ch" }} />
        <input {...fieldProps("subtitle_display", "Subtitle")} style={{ flex: "2 1 28ch" }} />

        <div className="bfd-ac-wrap" style={{ flex: "1.5 1 22ch" }}>
          <input
            {...fieldProps("publisher_name_display", "Publisher")}
            onChange={(e) => {
              setField("publisher_name_display", e.target.value);
              runAutocomplete("publisher_name_display", e.target.value);
            }}
            onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 120)}
          />
          {ac.field === "publisher_name_display" && ac.items.length ? (
            <div className="bfd-ac">
              {ac.items.map((it, index) => (
                <button key={suggestionKey(it, index)} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { applyPublisherMatch(it); setAc({ field: "", items: [] }); }}>
                  {publisherSuggestionLabel(it)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button className="bfd-btn bfd-btn-primary" disabled={busy} type="submit">
          {busy ? "…" : submitLabel}
        </button>

        {onCancel ? (
          <button className="bfd-btn" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
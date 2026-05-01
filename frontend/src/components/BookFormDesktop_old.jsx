// frontend/src/components/BookFormDesktop.jsx
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
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^0-9X]/g, "");
}

function isValidIsbn10(s) {
  if (!/^[0-9]{9}[0-9X]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const v = s[i] === "X" ? 10 : Number(s[i]);
    sum += v * (10 - i);
  }
  return sum % 11 === 0;
}

function isValidIsbn13(s) {
  if (!/^[0-9]{13}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(s[i]) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return check === Number(s[12]);
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
  const lookupOk =
    (isbn13 && isValidIsbn13(isbn13)) || (isbn10 && isValidIsbn10(isbn10));

  return { isbn13, isbn10, raw, lookupOk };
}

function splitAuthorName(name) {
  const s = String(name || "").trim();
  if (!s) return { first: "", last: "", display: "" };
  if (s.includes(",")) {
    const [last, first] = s.split(",").map((x) => x.trim());
    return {
      first: first || "",
      last: last || "",
      display: [first, last].filter(Boolean).join(" ").trim(),
    };
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
  author_nationality: "",
  place_of_birth: "",
  male_female: "",
  published_titles: "",
  number_of_millionsellers: "",
  publisher_name_display: "",
  publisher_abbr: "",
  title_display: "",
  subtitle_display: "",
  title_keyword: "",
  title_keyword_position: "",
  title_keyword2: "",
  title_keyword2_position: "",
  title_keyword3: "",
  title_keyword3_position: "",
  pages: "",
  width_cm: "",
  height_cm: "",
  purchase_url: "",
  isbn13: "",
  isbn10: "",
  original_language: "",
  comment: "",
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
  showUnknownFields = false,
  excludeUnknownKeys = [],
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
      author_nationality: toStr(pick(b, ["author_nationality"])),
      place_of_birth: toStr(pick(b, ["place_of_birth"])),
      male_female: toStr(pick(b, ["male_female"])),
      published_titles: toStr(pick(b, ["published_titles"])),
      number_of_millionsellers: toStr(pick(b, ["number_of_millionsellers"])),
      publisher_name_display: toStr(pick(b, ["publisher_name_display"])),
      publisher_abbr: toStr(pick(b, ["publisher_abbr", "publisher_abbreviation", "abbr"])),
      title_display: toStr(pick(b, ["title_display", "titleDisplay", "title"])),
      subtitle_display: toStr(pick(b, ["subtitle_display"])),
      title_keyword: toStr(pick(b, ["title_keyword", "keyword"])),
      title_keyword_position: toStr(pick(b, ["title_keyword_position"])),
      title_keyword2: toStr(pick(b, ["title_keyword2"])),
      title_keyword2_position: toStr(pick(b, ["title_keyword2_position"])),
      title_keyword3: toStr(pick(b, ["title_keyword3"])),
      title_keyword3_position: toStr(pick(b, ["title_keyword3_position"])),
      pages: toStr(pick(b, ["pages"])),
      width_cm: toStr(pick(b, ["width_cm", "width", "bbreite"])),
      height_cm: toStr(pick(b, ["height_cm", "height", "bhoehe"])),
      purchase_url: toStr(pick(b, ["purchase_url"])),
      isbn13: toStr(pick(b, ["isbn13"])),
      isbn10: toStr(pick(b, ["isbn10"])),
      original_language: toStr(pick(b, ["original_language"])),
      comment: toStr(pick(b, ["comment"])),
    };
  }, [initialBook]);

  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [isbnBusy, setIsbnBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ac, setAc] = useState({ field: "", items: [] });
  const [barcodePreview, setBarcodePreview] = useState(null);
  const [barcodePreviewErr, setBarcodePreviewErr] = useState("");
  const [extras, setExtras] = useState({});
  const [existingMatches, setExistingMatches] = useState([]);
  const [existingMatch, setExistingMatch] = useState(null);

  const knownKeys = useMemo(() => new Set(Object.keys(emptyForm).map(norm)), []);
  const excludeKey = (excludeUnknownKeys || []).map(String).join("\u0000");

  useEffect(() => {
    setV(initial);
    setExistingMatches([]);
    setExistingMatch(null);
    if (!showUnknownFields) return setExtras({});

    const b = initialBook || {};
    const ex = {};
    const exclude = new Set((excludeUnknownKeys || []).map(String));
    for (const [k, raw] of Object.entries(b)) {
      if (!k || exclude.has(k) || knownKeys.has(norm(k)) || k.startsWith("_")) continue;
      if (raw && typeof raw === "object") continue;
      ex[k] = toStr(raw);
    }
    setExtras(ex);
  }, [initial, initialBook, showUnknownFields, excludeKey, knownKeys]);

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
    if (isEdit) {
      setExistingMatches([]);
      setExistingMatch(null);
      return;
    }

    const isbnN = normalizeIsbnInputs(v.isbn13, v.isbn10);
    const isbn = isbnN.isbn13 || isbnN.isbn10 || isbnN.raw || "";
    const pages = parseIntOrNull(v.pages);
    const title = String(v.title_display || "").trim();
    const authorLast = String(v.author_lastname || "").trim();
    const authorDisplay = String(v.name_display || "").trim();
    const publisherDisplay = String(v.publisher_name_display || "").trim();

    if (!isbn && pages == null && !title && !authorLast && !authorDisplay && !publisherDisplay) {
      setExistingMatches([]);
      setExistingMatch(null);
      return;
    }

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await findDraft(
          {
            isbn,
            pages,
            title_display: title,
            author_lastname: authorLast,
            name_display: authorDisplay,
            publisher_name_display: publisherDisplay,
          },
          { signal: ctrl.signal }
        );
        const items = Array.isArray(r?.items) ? r.items : [];
        setExistingMatches(items);
        setExistingMatch((prev) =>
          prev?.id && items.some((x) => x.id === prev.id) ? prev : null
        );
      } catch (e) {
        if (e?.name !== "AbortError") {
          setExistingMatches([]);
          setExistingMatch(null);
        }
      }
    }, 300);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [
    isEdit,
    v.isbn13,
    v.isbn10,
    v.pages,
    v.title_display,
    v.author_lastname,
    v.name_display,
    v.publisher_name_display,
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

  function setExtra(key, val) {
    setExtras((p) => ({ ...p, [key]: val }));
  }

  function suggestionKey(it, index) {
    if (it && typeof it === "object") return String(it.id || it.name_display || it.name || it.last_name || index);
    return String(it ?? index);
  }

  function authorSuggestionLabel(it) {
    if (!it || typeof it === "string") return String(it || "");
    const display =
      String(it.name_display || "").trim() ||
      [it.first_name, it.last_name].filter(Boolean).join(" ").trim() ||
      String(it.last_name || "").trim();
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
      const items = await autocomplete(field, t, { limit: 200 });
      if (Array.isArray(items)) setAc({ field, items });
    } catch {
      setAc({ field: "", items: [] });
    }
  }

  function applyAuthorMatch(match) {
    if (!match) return;
    if (typeof match === "string") {
      const { first, last, display } = splitAuthorName(match);
      setV((prev) => ({
        ...prev,
        author_id: isEdit ? prev.author_id : "",
        author_firstname: first,
        author_lastname: last,
        name_display: display,
      }));
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
      author_nationality: String(match.author_nationality || prev.author_nationality || ""),
      place_of_birth: String(match.place_of_birth || prev.place_of_birth || ""),
      male_female: String(match.male_female || prev.male_female || ""),
      published_titles: toStr(match.published_titles ?? prev.published_titles),
      number_of_millionsellers: toStr(match.number_of_millionsellers ?? prev.number_of_millionsellers),
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
        title_keyword: prev.title_keyword || kw.keyword || "",
        title_keyword_position: prev.title_keyword_position || kw.pos || "",
        pages: prev.pages || toStr(s.pages),
        purchase_url: prev.purchase_url || s.purchase_url || s.purchaseUrl || s.url || "",
        original_language: prev.original_language || s.original_language || s.language || "",
        author_id: prev.author_id || s.author_id || "",
        author_lastname: prev.author_lastname || s.author_lastname || last || "",
        author_firstname: prev.author_firstname || s.author_firstname || first || "",
        name_display: prev.name_display || s.name_display || display || "",
        author_abbreviation: prev.author_abbreviation || s.author_abbreviation || "",
        publisher_id: prev.publisher_id || s.publisher_id || "",
        publisher_name_display: prev.publisher_name_display || s.publisher_name_display || "",
        publisher_abbr: prev.publisher_abbr || s.publisher_abbr || "",
      }));
      setMsg("ISBN gefunden ✔");
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

    const strings = [
      "author_lastname",
      "author_firstname",
      "name_display",
      "author_abbreviation",
      "author_nationality",
      "place_of_birth",
      "male_female",
      "publisher_name_display",
      "publisher_abbr",
      "title_display",
      "subtitle_display",
      "title_keyword",
      "title_keyword2",
      "title_keyword3",
      "purchase_url",
      "original_language",
      "comment",
    ];

    for (const k of strings) {
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
    const prevAuthorId = String(initial.author_id || "").trim() || null;
    const prevPublisherId = String(initial.publisher_id || "").trim() || null;
    if (!isEdit) {
      if (nextAuthorId) payload.author_id = nextAuthorId;
      if (nextPublisherId) payload.publisher_id = nextPublisherId;
    } else {
      if (nextAuthorId !== prevAuthorId) payload.author_id = nextAuthorId;
      if (nextPublisherId !== prevPublisherId) payload.publisher_id = nextPublisherId;
    }

    const isbnN = normalizeIsbnInputs(v.isbn13, v.isbn10);
    const prevN = normalizeIsbnInputs(initial.isbn13, initial.isbn10);
    if (!isEdit) {
      if (isbnN.isbn13) payload.isbn13 = isbnN.isbn13;
      if (isbnN.isbn10) payload.isbn10 = isbnN.isbn10;
      if (!isbnN.isbn13 && !isbnN.isbn10 && isbnN.raw) payload.isbn13_raw = isbnN.raw;
    } else {
      if (isbnN.isbn13 !== prevN.isbn13) payload.isbn13 = isbnN.isbn13 || null;
      if (isbnN.isbn10 !== prevN.isbn10) payload.isbn10 = isbnN.isbn10 || null;
      if (!isbnN.isbn13 && !isbnN.isbn10 && isbnN.raw) payload.isbn13_raw = isbnN.raw;
    }

    const ints = [
      "title_keyword_position",
      "title_keyword2_position",
      "title_keyword3_position",
      "pages",
      "published_titles",
      "number_of_millionsellers",
    ];
    for (const k of ints) {
      const raw = String(v[k] ?? "").trim();
      const prevRaw = String(initial[k] ?? "").trim();
      if (!raw) {
        if (isEdit && prevRaw) payload[k] = null;
        continue;
      }
      const n = parseIntOrNull(raw);
      if (n === null) throw new Error(`${k} ist keine gültige Zahl.`);
      if (!isEdit || n !== parseIntOrNull(prevRaw)) payload[k] = n;
    }

    if (isEdit && showUnknownFields) {
      for (const [k, next] of Object.entries(extras || {})) {
        if (next !== toStr((initialBook || {})[k])) payload[k] = next === "" ? null : next;
      }
    }

    if (!isEdit && existingMatch?.id) payload.draft_id = existingMatch.id;

    if (!isEdit && existingMatches.length && !existingMatch?.id) {
      throw new Error("Bitte zuerst das richtige Buch aus den Treffern wählen.");
    }

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

    if (isEdit && Object.keys(payload).length === 0) {
      setMsg("Keine Änderungen.");
      return;
    }

    setBusy(true);
    try {
      let saved;
      if (isEdit) {
        saved = await updateBook(bookId || initialBook?._id || initialBook?.id, payload);
      } else if (payload.draft_id) {
        saved = await registerExistingBook(payload.draft_id, payload);
      } else {
        saved = await registerBook(payload);
      }
      onSuccess?.({ payload, saved });
      setMsg(payload.draft_id ? "Vorhandenes Buch aktualisiert ✔" : isEdit ? "Gespeichert." : "Gespeichert ✔");
      if (!isEdit) {
        setV({ ...emptyForm });
        setExistingMatches([]);
        setExistingMatch(null);
      }
    } catch (err) {
      setMsg(err?.message || "Fehler beim Speichern");
    } finally {
      setBusy(false);
    }
  }

  const fieldProps = (key, placeholder, extra = {}) => ({
    className: extra.className || "bfd-input",
    value: v[key],
    placeholder,
    disabled: busy || extra.disabled,
    onChange: (e) => setField(key, e.target.value),
    ...extra,
  });

  const numberProps = (key, placeholder, width) =>
    fieldProps(key, placeholder, {
      inputMode: "decimal",
      style: { width },
    });

  return (
    <form className="bfd" onSubmit={onSubmit} noValidate>
      <style>{`
.bfd {
  display: grid;
  gap: 12px;
  align-content: start;
  font-size: clamp(24px, 5vw, 42px);
  font-weight: 900;
  overflow: visible;
  padding-bottom: 160px;
}

.bfd-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0;
  overflow: visible;
  position: relative;
}

.bfd-input {
  flex: 0 0 auto;
  font: inherit;
  font-size: clamp(76px, 12vw, 138px);
  font-weight: 900;
  line-height: 0.9;
  height: 0.95em;
  padding: 0 0.03em;
  margin: 0;
  box-sizing: content-box;
  border: 3px solid rgba(0,0,0,.65);
}

.bfd-input-wide {
  flex: 1 1 100% !important;
  width: 100% !important;
  height: 0.95em !important;
  line-height: 0.9 !important;
}

.bfd-input::placeholder {
  font-size: 0.36em;
  line-height: 1;
  font-weight: 900;
  color: rgba(0,0,0,.65);
  white-space: nowrap;
}

.bfd-input[placeholder="Width"],
.bfd-input[placeholder="Height"] {
  width: 3.15ch !important;
}

.bfd-input[placeholder="Pages"],
.bfd-input[placeholder="AAbbr."],
.bfd-input[placeholder="PAbbr."] {
  width: 3.6ch !important;
}

.bfd-btn,
.bfd-suggestion {
  min-height: 78px;
  border: 3px solid rgba(0,0,0,.65);
  font: inherit;
  font-weight: 900;
  padding: 0 16px;
  box-sizing: border-box;
  background: #eee;
  cursor: pointer;
}

.bfd-btn-primary {
  min-height: 96px;
  font-size: clamp(30px, 6vw, 52px);
  padding: 0 22px;
}

.bfd-msg {
  font-size: clamp(24px, 5vw, 42px);
  font-weight: 900;
  padding: 12px 14px;
  min-height: 78px;
}

.bfd-ac-wrap {
  position: relative;
  height: 78px;
  flex: 0 0 auto;
  overflow: visible;
}

.bfd-ac-wrap > .bfd-input {
  width: auto;
}

.bfd-ac {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 99999;
  display: grid;
  grid-template-columns: repeat(8, max-content);
  gap: 8px;
  width: max-content;
  max-width: 96vw;
  max-height: 70vh;
  overflow: auto;
  background: white;
  border: 4px solid rgba(0,0,0,.7);
  padding: 10px;
  box-sizing: border-box;
}

.bfd-ac button {
  min-height: 82px;
  border: 2px solid rgba(0,0,0,.6);
  padding: 10px 16px;
  font: inherit;
  font-size: clamp(22px, 4vw, 38px);
  font-weight: 900;
  text-align: left;
  white-space: nowrap;
  background: #eee;
  cursor: pointer;
}

.bfd-existing {
  border: 3px solid rgba(0,0,0,.35);
  background: #fff8df;
}

.bfd-existing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.bfd-btn-muted {
  background: #eee;
}

.bfd-btn-update {
  background: #dff3df;
}
      `}</style>

      {!isEdit && existingMatches.length ? (
        <div className="bfd-msg bfd-existing">
          <div className="bfd-existing-text">
            Treffer gefunden — bitte das richtige Buch wählen:
          </div>

          <div className="bfd-existing-actions">
            {existingMatches.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`bfd-btn ${existingMatch?.id === m.id ? "bfd-btn-update" : "bfd-btn-muted"}`}
                disabled={busy}
                onClick={() => {
                  setExistingMatch(m);

                  setV((prev) => ({
                    ...prev,
                    pages: toStr(m.pages ?? prev.pages),
                    isbn13: toStr(m.isbn13 ?? prev.isbn13),
                    isbn10: toStr(m.isbn10 ?? prev.isbn10),
                    title_display: toStr(
                      m.title_display ??
                      m.main_title_display ??
                      prev.title_display
                    ),
                    subtitle_display: toStr(m.subtitle_display ?? prev.subtitle_display),
                    author_id: toStr(m.author_id ?? prev.author_id),
                    name_display: toStr(
                      m.name_display ??
                      m.author_name_display ??
                      m.author_display ??
                      prev.name_display
                    ),
                    author_lastname: toStr(m.author_lastname ?? prev.author_lastname),
                    author_firstname: toStr(m.author_firstname ?? prev.author_firstname),
                    author_abbreviation: toStr(
                      m.author_abbreviation ?? prev.author_abbreviation
                    ),
                    publisher_id: toStr(m.publisher_id ?? prev.publisher_id),
                    publisher_name_display: toStr(
                      m.publisher_name_display ??
                      m.publisher_name ??
                      prev.publisher_name_display
                    ),
                    publisher_abbr: toStr(m.publisher_abbr ?? prev.publisher_abbr),
                  }));
                }}
              >
                {(m.title_display || m.main_title_display || "ohne Titel")}
                {m.author_display || m.author_name_display ? ` · ${m.author_display || m.author_name_display}` : ""}
                {m.pages ? ` · ${m.pages} S.` : ""}
                {m.reading_status ? ` · ${m.reading_status}` : ""}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {msg ? <div ref={msgRef} className="bfd-msg">{msg}</div> : null}

      <div className="bfd-row">
        <input {...numberProps("width_cm", "Width", "3.15ch")} />
        <input {...numberProps("height_cm", "Height", "3.15ch")} />
        <input {...fieldProps("pages", "Pages", { inputMode: "numeric", style: { width: "3.6ch" } })} />

        <div className="bfd-ac-wrap" style={{ width: "3.6ch" }}>
          <input
            {...fieldProps("author_abbreviation", "AAbbr.", { style: { width: "3.6ch" } })}
            onChange={(e) => {
              setField("author_abbreviation", e.target.value);
              runAutocomplete("author_abbreviation", e.target.value);
            }}
            onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 120)}
          />
          {ac.field === "author_abbreviation" && ac.items.length ? (
            <div className="bfd-ac">
              {ac.items.map((it, index) => (
                <button
                  key={suggestionKey(it, index)}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyAuthorMatch(it);
                    setAc({ field: "", items: [] });
                  }}
                >
                  {authorSuggestionLabel(it)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="bfd-ac-wrap" style={{ width: "3.6ch" }}>
          <input
            {...fieldProps("publisher_abbr", "PAbbr.", { style: { width: "3.6ch" } })}
            onChange={(e) => {
              setField("publisher_abbr", e.target.value);
              runAutocomplete("publisher_abbr", e.target.value);
            }}
            onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 120)}
          />
          {ac.field === "publisher_abbr" && ac.items.length ? (
            <div className="bfd-ac">
              {ac.items.map((it, index) => (
                <button
                  key={suggestionKey(it, index)}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyPublisherMatch(it);
                    setAc({ field: "", items: [] });
                  }}
                >
                  {publisherSuggestionLabel(it)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <input {...fieldProps("isbn10", "ISBN-10", { style: { width: "11ch" } })} />
        <input {...fieldProps("isbn13", "ISBN-13", { style: { width: "14ch" } })} />
        <button type="button" className="bfd-btn" disabled={busy || isbnBusy} onClick={doIsbnLookup}>
          {isbnBusy ? "…" : "Lookup"}
        </button>

        {barcodePreview?.candidate ? (
          <button
            type="button"
            className="bfd-suggestion"
            onClick={() => setField("barcode", barcodePreview.candidate)}
          >
            {formatBookCode(barcodePreview.candidate)}
          </button>
        ) : null}
      </div>

      <div className="bfd-row">
        <div className="bfd-ac-wrap" style={{ flex: "1 1 100%", width: "100%" }}>
          <input
            {...fieldProps("name_display", "Author", { className: "bfd-input bfd-input-wide" })}
            onChange={(e) => {
              setField("name_display", e.target.value);
              runAutocomplete("author_lastname", e.target.value);
            }}
            onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 120)}
          />
          {ac.field === "author_lastname" && ac.items.length ? (
            <div className="bfd-ac">
              {ac.items.map((it, index) => (
                <button
                  key={suggestionKey(it, index)}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyAuthorMatch(it);
                    setAc({ field: "", items: [] });
                  }}
                >
                  {authorSuggestionLabel(it)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <input
          {...fieldProps("title_display", "Title", {
            className: "bfd-input bfd-input-wide",
          })}
        />

        <input
          {...fieldProps("subtitle_display", "Subtitle", {
            className: "bfd-input bfd-input-wide",
          })}
        />

        <div className="bfd-ac-wrap" style={{ flex: "1 1 100%", width: "100%" }}>
          <input
            {...fieldProps("publisher_name_display", "Publisher", { className: "bfd-input bfd-input-wide" })}
            onChange={(e) => {
              setField("publisher_name_display", e.target.value);
              runAutocomplete("publisher_name_display", e.target.value);
            }}
            onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 120)}
          />
          {ac.field === "publisher_name_display" && ac.items.length ? (
            <div className="bfd-ac">
              {ac.items.map((it, index) => (
                <button
                  key={suggestionKey(it, index)}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    applyPublisherMatch(it);
                    setAc({ field: "", items: [] });
                  }}
                >
                  {publisherSuggestionLabel(it)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button className="bfd-btn bfd-btn-primary" disabled={busy} type="submit">
          {busy ? "…" : existingMatch?.id ? "Ausgewähltes Buch registrieren" : submitLabel}
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

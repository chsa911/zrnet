// frontend/src/components/BookFormDesktop.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  autocomplete,
  findDraft,
  lookupIsbn,
  registerBook,
  recordBarcodeConflict,
  registerExistingBook,
  updateBook,
} from "../api/books";
import { previewBarcode } from "../api/barcodes";
import { BookCodeVisual } from "../utils/bookCodeDisplay";

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

function displayIsbnForBook(b) {
  const isbn13 = stripIsbn(
    b?.isbn13 ??
    b?.isbn_13 ??
    b?.isbn13_raw ??
    b?.isbn_raw ??
    ""
  );
  const isbn10 = stripIsbn(b?.isbn10 ?? b?.isbn_10 ?? "");
  const primary = isbn13 || isbn10;
  if (!primary) return "";
  if (isbn13 && isbn10 && isbn13 !== isbn10) return `${isbn13} / ${isbn10}`;
  return primary;
}

function parseIntOrNull(s) {
  const t = String(s ?? "").trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

// Known backend error codes for book save failures, mapped to friendly
// German messages. The server may already send a `message` (see
// sendKnownPgError / internal_error responses in booksPgController.js) -
// that always wins. This map is the fallback for codes that come back as a
// bare `{ error: "<code>" }` with no message, plus a generic fallback for
// anything unrecognized so the user is never shown a raw error code.
const BOOK_SAVE_ERROR_MESSAGES = {
  missing_required_fields:
    "Bitte Pflichtfelder ausfüllen (Titel, Autor, Verlag, Seiten).",
  width_and_height_required:
    "Breite und Höhe sind erforderlich, um einen Barcode zuzuweisen.",
  no_series_for_size: "Für diese Maße wurde keine passende Serie gefunden.",
  no_barcodes_available: "Kein freier Barcode für diese Serie verfügbar.",
  barcode_not_found: "Barcode wurde nicht gefunden.",
  barcode_not_available: "Barcode ist nicht verfügbar.",
  barcode_already_assigned: "Barcode ist bereits einem anderen Buch zugewiesen.",
  barcode_already_assigned_to_other_book:
    "Barcode ist bereits einem anderen Buch zugewiesen.",
  barcode_wrong_position: "Barcode passt nicht zur erwarteten Position.",
  barcode_wrong_prefix: "Barcode passt nicht zur erwarteten Serie.",
  barcode_has_unresolved_conflict:
    "Dieser Barcode hat eine ungelöste Konflikt-Markierung (auf einem anderen Buch beobachtet). Bitte zuerst klären oder einen anderen Barcode wählen.",
  duplicate_value: "Dieser Eintrag existiert bereits (Duplikat).",
  invalid_reference:
    "Ein verknüpfter Datensatz (z. B. Autor, Verlag oder Genre) wurde nicht gefunden.",
  missing_required_field: "Ein Pflichtfeld fehlt.",
  invalid_value: "Eine Eingabe ist ungültig.",
  invalid_input_format: "Ein Feld hat ein ungültiges Format.",
  internal_error: "Speichern ist fehlgeschlagen (Serverfehler). Bitte erneut versuchen.",
};

// Turns a thrown error from the books API into a friendly German message.
// `err.message` is what api/books.js throws - it's already the backend's
// `message` field when present, otherwise the bare `error` code or HTTP text.
function friendlySaveErrorMessage(err) {
  if (!err) return "Fehler beim Speichern.";

  if (err instanceof TypeError || /failed to fetch|networkerror/i.test(String(err?.message))) {
    return "Server nicht erreichbar. Bitte Internetverbindung prüfen und erneut versuchen.";
  }

  const raw = String(err?.message || "").trim();
  if (!raw) return "Fehler beim Speichern.";

  // If the backend already sent a human-readable message (contains spaces /
  // umlauts), trust it as-is.
  if (/[ äöüß]/i.test(raw)) return raw;

  return BOOK_SAVE_ERROR_MESSAGES[raw] || `Fehler beim Speichern (${raw}).`;
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
  authors_number: "1",
  publisher_id: "",
  author_lastname: "",
  author_firstname: "",
  name_display: "",
  author_nationality: "",
  place_of_birth: "",
  male_female: "",
  published_titles: "",
  number_of_millionsellers: "",
  publisher_name_display: "",
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

async function getImageFingerprint(id, primarySrc) {
  const urls = [
    primarySrc,
    `/uploads/covers/normalized/${id}.jpg`,
    `/uploads/covers/${id}.jpg`,
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

  for (const src of urls) {
    const result = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const SIZE = 16;
          const canvas = document.createElement("canvas");
          canvas.width = SIZE; canvas.height = SIZE;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, SIZE, SIZE);
          resolve(ctx.getImageData(0, 0, SIZE, SIZE).data);
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
    if (result) return result;
  }
  return null;
}

function pixelSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let diff = 0;
  for (let i = 0; i < a.length; i += 4) {
    diff += Math.abs(a[i] - b[i]) + Math.abs(a[i+1] - b[i+1]) + Math.abs(a[i+2] - b[i+2]);
  }
  const maxDiff = (a.length / 4) * 3 * 255;
  return 1 - diff / maxDiff;
}

function useIdenticalCovers(matches) {
  const [identicalPairs, setIdenticalPairs] = useState(new Set());

  useEffect(() => {
    if (matches.length < 2) { setIdenticalPairs(new Set()); return; }
    let cancelled = false;

    (async () => {
      const fingerprints = await Promise.all(
        matches.map((m) => getImageFingerprint(m.id, m.coverUrl))
      );
      if (cancelled) return;

      const identical = new Set();
      for (let i = 0; i < matches.length; i++) {
        for (let j = i + 1; j < matches.length; j++) {
          if (pixelSimilarity(fingerprints[i], fingerprints[j]) > 0.95) {
            identical.add(matches[i].id);
            identical.add(matches[j].id);
          }
        }
      }
      setIdenticalPairs(identical);
    })();

    return () => { cancelled = true; };
  }, [matches.map((m) => m.id).join(",")]);

  return identicalPairs;
}

function relativeTime(dateRaw) {
  if (!dateRaw) return null;
  const diffMs = Date.now() - new Date(dateRaw).getTime();
  if (isNaN(diffMs)) return null;
  const days = Math.floor(diffMs / 86400000);
  if (days === 0) return "heute";
  if (days === 1) return "gestern";
  if (days < 7) return `vor ${days} T.`;
  if (days < 30) return `vor ${Math.floor(days / 7)} Wo.`;
  if (days < 365) return `vor ${Math.floor(days / 30)} Mon.`;
  return `vor ${Math.floor(days / 365)} J.`;
}

function MatchCoverThumb({ id, src: srcProp }) {
  // Try normalized/ first (staging PWA uploads), fall back to root (manually synced)
  const [src, setSrc] = useState(srcProp || `/uploads/covers/normalized/${id}.jpg`);
  const [failed, setFailed] = useState(false);

  function handleError() {
    const fallback = `/uploads/covers/${id}.jpg`;
    if (src !== fallback) {
      setSrc(fallback);
    } else {
      setFailed(true);
    }
  }

  if (failed) return (
    <div style={{ height: 80, background: "#e0e0e0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 11, color: "#aaa", fontWeight: 700 }}>kein Cover</span>
    </div>
  );
  return (
    <img
      src={src}
      alt=""
      style={{ display: "block", width: "100%", height: 120, objectFit: "cover" }}
      onError={handleError}
    />
  );
}

function CoverPreview({ id, src: srcProp }) {
  const [state, setState] = useState("loading"); // "loading" | "ok" | "missing"
  const src = srcProp || `/uploads/covers/normalized/${id}.jpg`;

  useEffect(() => {
    setState("loading");
    const img = new Image();
    img.onload = () => setState("ok");
    img.onerror = () => setState("missing");
    img.src = src;
  }, [src]);

  return (
    <div style={{
      marginTop: 14,
      minHeight: 80,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "3px solid rgba(0,0,0,.35)",
      background: "#f5f5f5",
    }}>
      {state === "ok" && (
        <img
          src={src}
          alt="Cover"
          style={{ display: "block", maxHeight: 320, maxWidth: "100%", objectFit: "contain" }}
        />
      )}
      {state === "missing" && (
        <span style={{ fontSize: 18, fontWeight: 700, color: "#aaa", padding: "12px 20px" }}>
          kein Cover
        </span>
      )}
      {state === "loading" && (
        <span style={{ fontSize: 18, fontWeight: 700, color: "#aaa", padding: "12px 20px" }}>
          …
        </span>
      )}
    </div>
  );
}

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
  const matchJustSelectedRef = useRef(false);

  const initial = useMemo(() => {
    const b = initialBook || {};
    return {
      ...emptyForm,
      barcode: toStr(pick(b, ["barcode", "BMarkb", "BMark", "code"])),
      author_id: toStr(pick(b, ["author_id"])),
      authors_number: toStr(pick(b, ["authors_number"])) || "1",
      publisher_id: toStr(pick(b, ["publisher_id"])),
      author_lastname: toStr(pick(b, ["author_lastname", "author_last_name"])),
      author_firstname: toStr(pick(b, ["author_firstname", "author_first_name"])),
      name_display: toStr(pick(b, ["name_display", "author_name_display"])),
      author_nationality: toStr(pick(b, ["author_nationality"])),
      place_of_birth: toStr(pick(b, ["place_of_birth"])),
      male_female: toStr(pick(b, ["male_female"])),
      published_titles: toStr(pick(b, ["published_titles"])),
      number_of_millionsellers: toStr(pick(b, ["number_of_millionsellers"])),
      publisher_name_display: toStr(pick(b, ["publisher_name_display"])),
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
  const [msgType, setMsgType] = useState("info"); // "success" | "error" | "info"

  // "Found a barcode already used by another book" — logs a conflict
  // observation after save, completely separate from the normal barcode
  // assignment above. Never sent as payload.barcode, never touches
  // book_barcodes/barcode_assignments.
  const [conflictBarcode, setConflictBarcode] = useState("");
  const [conflictNote, setConflictNote] = useState("");

  function showMsg(text, type = "info") {
    setMsg(text);
    setMsgType(type);
  }
  const [ac, setAc] = useState({ field: "", items: [] });
  const [barcodePreview, setBarcodePreview] = useState(null);
  const [barcodePreviewErr, setBarcodePreviewErr] = useState("");
  const [barcodePreviewLoading, setBarcodePreviewLoading] = useState(false);
  const [extras, setExtras] = useState({});
  const [existingMatches, setExistingMatches] = useState([]);
  const [existingMatch, setExistingMatch] = useState(null);
  const [hoveredMatch, setHoveredMatch] = useState(null);
  const identicalCovers = useIdenticalCovers(existingMatches);

  const knownKeys = useMemo(() => new Set(Object.keys(emptyForm).map(norm)), []);
  const excludeKey = (excludeUnknownKeys || []).map(String).join("\u0000");

  useEffect(() => {
    setV(initial);
    setExistingMatches([]);
    setExistingMatch(null);
    setHoveredMatch(null);
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
    const w = parseFloatOrNull(v.width_cm);
    const h = parseFloatOrNull(v.height_cm);

    setBarcodePreview(null);
    setBarcodePreviewErr("");
    setBarcodePreviewLoading(false);

    if (isEdit || !assignBarcode) return;

    if (!(w > 0 && h > 0)) {
      setBarcodePreviewErr("Breite und Höhe eingeben.");
      return;
    }

    let alive = true;
    setBarcodePreviewLoading(true);

    const t = setTimeout(async () => {
      try {
        const p = await previewBarcode(w, h);
        if (!alive) return;

        setBarcodePreview({
          ...p,
          width_cm: w,
          height_cm: h,
        });
        setBarcodePreviewErr("");
      } catch (e) {
        if (!alive) return;
        setBarcodePreview(null);
        setBarcodePreviewErr(e?.message || "Barcode-Prüfung fehlgeschlagen.");
      } finally {
        if (alive) setBarcodePreviewLoading(false);
      }
    }, 200);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [isEdit, assignBarcode, v.width_cm, v.height_cm]);

  useEffect(() => {
    if (isEdit) {
      setExistingMatches([]);
      setExistingMatch(null);
      return;
    }

    const pages = parseIntOrNull(v.pages);

    // Search/selection are keyed on `pages` only. Filling in title/ISBN/author/
    // publisher must NOT clear an already-found draft match — that's the natural
    // next step after entering the page count, and clearing here caused the
    // match to "flash and disappear" before the user could pick it, leading the
    // form to fall through and create a duplicate book record.
    if (pages == null) {
      // If a match was just clicked, the fields were filled programmatically —
      // don't clear the selection. Only clear on manual user edits.
      if (matchJustSelectedRef.current) {
        matchJustSelectedRef.current = false;
        return;
      }
      setExistingMatches([]);
      setExistingMatch(null);
      return;
    }
    matchJustSelectedRef.current = false;

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await findDraft(
          { pages },
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
        if (["author_lastname", "author_firstname", "name_display"].includes(key)) next.author_id = "";
        if (["publisher_name_display"].includes(key)) next.publisher_id = "";
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
    const abbr = String(it.abbreviation || it.author_abbr || "").trim();
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

    if (Array.isArray(items)) {
      const filtered =
        field === "publisher_name_display"
          ? items.filter((it) => {
              const display = String(
                it?.name_display ||
                  it?.publisher_name_display ||
                  it?.name ||
                  it ||
                  ""
              ).trim();

              const abbr = String(it?.abbr || it?.publisher_abbr || "").trim();
              const needle = t.toLowerCase();

              return (
                display.toLowerCase().startsWith(needle) ||
                abbr.toLowerCase().startsWith(needle)
              );
            })
          : items;

      setAc({ field, items: filtered });
    }
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
    }));
  }

  async function doIsbnLookup() {
    const n = normalizeIsbnInputs(v.isbn13, v.isbn10);
    const isbn = n.isbn13 || n.isbn10 || "";
    if (!isbn) return showMsg("ISBN fehlt.", "error");
    if (!n.lookupOk) return showMsg("ISBN sieht ungültig aus. Lookup übersprungen.", "error");

    setIsbnBusy(true);
    showMsg("", "info");
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
        publisher_id: prev.publisher_id || s.publisher_id || "",
        publisher_name_display: prev.publisher_name_display || s.publisher_name_display || "",
      }));
      showMsg("ISBN gefunden ✔", "success");
    } catch (e) {
      showMsg(e?.message || "ISBN Lookup fehlgeschlagen", "error");
    } finally {
      setIsbnBusy(false);
    }
  }

  function buildPayload() {
    const payload = {};
    if (!isEdit) payload.assign_barcode = !!assignBarcode;

    const finalBarcode = String(v.barcode || "").trim();
    const wCm = parseFloatOrNull(v.width_cm);
    const hCm = parseFloatOrNull(v.height_cm);
const pages = parseIntOrNull(v.pages);

if (pages == null || pages <= 0) {
  throw new Error("Pages ist erforderlich.");
}
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
      "author_nationality",
      "place_of_birth",
      "male_female",
      "publisher_name_display",
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
      "authors_number",
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

    if (!isEdit && createReadingStatus) payload.reading_status = createReadingStatus;
    return payload;
  }

  async function onSubmit(e) {
    e.preventDefault();
    showMsg("", "info");

    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      showMsg(err?.message || "Ungültige Eingabe", "error");
      return;
    }

    if (isEdit && Object.keys(payload).length === 0) {
      showMsg("Keine Änderungen.", "info");
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

      let successMsg = payload.draft_id ? "Vorhandenes Buch aktualisiert ✔" : isEdit ? "Gespeichert." : "Gespeichert ✔";

      const foundBarcode = String(conflictBarcode || "").trim();
      if (!isEdit && foundBarcode) {
        const newId = saved?.id || saved?._id;
        try {
          await recordBarcodeConflict(newId, {
            barcode: foundBarcode,
            note: String(conflictNote || "").trim() || undefined,
          });
          successMsg += ` · Barcode-Fund "${foundBarcode}" vermerkt (ungelöst).`;
        } catch (conflictErr) {
          // Book itself is already saved successfully -- don't lose that.
          // Just surface that the conflict note failed separately.
          successMsg += ` · ⚠ Barcode-Fund "${foundBarcode}" konnte NICHT vermerkt werden: ${conflictErr?.message || conflictErr}`;
        }
      }

      showMsg(successMsg, "success");
      if (!isEdit) {
        setV({ ...emptyForm });
        setExistingMatches([]);
        setExistingMatch(null);
        setConflictBarcode("");
        setConflictNote("");
      }
    } catch (err) {
      console.error("Buch konnte nicht gespeichert werden", err);
      showMsg(friendlySaveErrorMessage(err), "error");
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
  gap: 0px;
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
  align-items: stretch;
  gap: 0;
  overflow: visible;
  position: relative;
}

.bfd-row + .bfd-row {
  margin-top: 0px;
}

.bfd-tight-row {
  margin-top: 0 !important;
}

.bfd-tight-row + .bfd-tight-row {
  margin-top: 0 !important;
}

.bfd-row.bfd-tight-row {
  margin-bottom: 0 !important;
}

.bfd-row.bfd-tight-row .bfd-input {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
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
  box-sizing: border-box;
  border: 3px solid rgba(0,0,0,.65);
}

.bfd-input-wide {
  display: block;
  flex: none !important;
  width: 100% !important;
  max-width: 100% !important;
  height: 0.95em !important;
  line-height: 0.9 !important;
  box-sizing: border-box !important;
}

.bfd-wide-wrap {
  flex: 1 1 100% !important;
  width: 100% !important;
  box-sizing: border-box;
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
  width: 3.1ch !important;
}

.bfd-input[placeholder="Pages"] {
  width: 3.0ch !important;
  text-align: center;
}

.bfd-top-frame {
  width: 100%;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  overflow: visible;
}

.bfd-top-frame .bfd-row {
  margin: 0 !important;
}

.bfd-top-frame + .bfd-row {
  margin-top: 0 !important;
}

.bfd-top-fill {
  flex: 1 1 auto;
  align-self: stretch;
  min-height: 0;
  border: 3px solid rgba(0,0,0,.65);
  border-left: 0;
  box-sizing: border-box;
  background: #eee;

  display: flex;
  align-items: center;
  justify-content: center;

  font: inherit;
  font-size: 0.5em;
  font-weight: 900;
  line-height: 1;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  padding: 0 0.4em;
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

.bfd-btn-lookup {
  flex: 1 1 100%;
  width: 100%;
  height: 0.95em;
  min-height: 0;
  font-size: clamp(76px, 12vw, 138px);
  line-height: 0.9;
  padding: 0 0.2em;
}

.bfd-btn-primary {
  flex: 1 1 100%;
  width: 100%;
  height: 0.95em;
  min-height: 0;
  font-size: clamp(76px, 12vw, 138px);
  line-height: 0.9;
  padding: 0 0.2em;
}

.bfd-msg {
  font-size: clamp(24px, 5vw, 42px);
  font-weight: 900;
  padding: 12px 14px;
  min-height: 78px;
  border-radius: 8px;
  border: 3px solid transparent;
}

.bfd-msg--error {
  color: #b00020;
  background: rgba(200, 0, 0, 0.06);
  border-color: rgba(200, 0, 0, 0.35);
}

.bfd-msg--success {
  color: #1b6e2c;
  background: rgba(0, 140, 60, 0.06);
  border-color: rgba(0, 140, 60, 0.3);
}

.bfd-msg--info {
  color: inherit;
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.12);
}

.bfd-ac-wrap {
  position: relative;
  height: auto;
  min-height: 0;
  flex: 0 0 auto;
  overflow: visible;
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

.bfd-btn-clear {
  background: #fdecea;
  border-color: rgba(180,0,0,0.4);
}
`}</style>
      {!isEdit && existingMatches.length ? (
        <div className="bfd-msg bfd-existing" onMouseLeave={() => setHoveredMatch(null)}>
          <div className="bfd-existing-text">
            Treffer gefunden — bitte das richtige Buch wählen:
          </div>

          <div className="bfd-existing-actions">
            <button
              type="button"
              className="bfd-btn bfd-btn-clear"
              disabled={busy}
              onClick={() => {
                setV({ ...emptyForm });
                setExistingMatch(null);
                setExistingMatches([]);
              }}
            >
              ✕ Leeren
            </button>
            <button
              type="button"
              className="bfd-btn bfd-btn-muted"
              disabled={busy}
              onClick={() => {
                setExistingMatch(null);
                setExistingMatches([]);
              }}
            >
              ➕ Neues Buch anlegen
            </button>
            {(() => {
              // Flag probable duplicates: same title, timestamps ≥1 day apart
              const titleNorm = (s) => String(s || "").trim().toLowerCase();
              const groups = {};
              existingMatches.forEach((m) => {
                const key = titleNorm(m.title_display || m.main_title_display);
                if (key) (groups[key] = groups[key] || []).push(m);
              });
              const probableDuplicateIds = new Set();
              Object.values(groups).forEach((grp) => {
                if (grp.length < 2) return;
                const times = grp.map((m) => new Date(m.added_at || m.registered_at || 0).getTime());
                const span = Math.max(...times) - Math.min(...times);
                if (span >= 86400000) grp.forEach((m) => probableDuplicateIds.add(m.id));
              });

              return existingMatches.map((m) => {
              const dateRaw = m.added_at || m.registered_at;
              const dateLabel = dateRaw
                ? new Date(dateRaw).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
                : null;
              const rel = relativeTime(dateRaw);
              const isSelected = existingMatch?.id === m.id;
              const isDuplicate = identicalCovers.has(m.id) || probableDuplicateIds.has(m.id);
              const isDuplicateCover = identicalCovers.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`bfd-btn ${isSelected ? "bfd-btn-update" : "bfd-btn-muted"}`}
                  disabled={busy}
                  style={{ display: "flex", flexDirection: "column", alignItems: "stretch", padding: 0, overflow: "hidden", minWidth: 140 }}
                  onMouseEnter={() => setHoveredMatch(m)}
                  onFocus={() => setHoveredMatch(m)}
                  onClick={() => {
                    matchJustSelectedRef.current = true;
                    setExistingMatch(m);
                    setV((prev) => ({
                      ...prev,
                      pages: toStr(m.pages ?? prev.pages),
                      isbn13: toStr(m.isbn13 ?? prev.isbn13),
                      isbn10: toStr(m.isbn10 ?? prev.isbn10),
                      title_display: toStr(m.title_display ?? m.main_title_display ?? prev.title_display),
                      subtitle_display: toStr(m.subtitle_display ?? prev.subtitle_display),
                      author_id: toStr(m.author_id ?? prev.author_id),
                      authors_number: toStr(m.authors_number ?? prev.authors_number),
                      name_display: toStr(m.name_display ?? m.author_name_display ?? m.author_display ?? prev.name_display),
                      author_lastname: toStr(m.author_lastname ?? prev.author_lastname),
                      author_firstname: toStr(m.author_firstname ?? prev.author_firstname),
                      publisher_id: toStr(m.publisher_id ?? prev.publisher_id),
                      publisher_name_display: toStr(m.publisher_name_display ?? m.publisher_name ?? prev.publisher_name_display),
                    }));
                  }}
                >
                  <MatchCoverThumb src={m.coverUrl} id={m.id} />
                  <div style={{ padding: "8px 10px", textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.2 }}>
                      {m.title_display || m.main_title_display || "ohne Titel"}
                    </div>
                    {(m.author_display || m.author_name_display) && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginTop: 2 }}>
                        {m.author_display || m.author_name_display}
                      </div>
                    )}
                    {m.pages && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#777", marginTop: 2 }}>
                        {m.pages} S.{displayIsbnForBook(m) ? ` · ISBN ${displayIsbnForBook(m)}` : ""}
                      </div>
                    )}
                    {dateLabel && (
                      <div style={{ fontSize: 11, fontWeight: 800, color: isSelected ? "#2e7d32" : "#999", marginTop: 4 }}>
                        {dateLabel}{rel ? ` · ${rel}` : ""}
                      </div>
                    )}
                    {isDuplicateCover && (
                      <div style={{ fontSize: 11, fontWeight: 900, color: "#b00", marginTop: 3 }}>
                        ⚠ identisches Cover = Duplikat
                      </div>
                    )}
                    {!isDuplicateCover && isDuplicate && (
                      <div style={{ fontSize: 11, fontWeight: 900, color: "#b00", marginTop: 3 }}>
                        ⚠ mögl. Duplikat
                      </div>
                    )}
                  </div>
                </button>
              );
            });
            })()}
          </div>

          {hoveredMatch ? (
            <CoverPreview id={hoveredMatch.id} src={hoveredMatch.coverUrl} />
          ) : null}
        </div>
      ) : null}

      {msg ? (
        <div
          ref={msgRef}
          role={msgType === "error" ? "alert" : "status"}
          className={`bfd-msg bfd-msg--${msgType}`}
        >
          {msg}
        </div>
      ) : null}

    <div className="bfd-top-frame">
  <div className="bfd-row">
    <input {...numberProps("width_cm", "Width", "2.8ch")} />
    <input {...numberProps("height_cm", "Height", "2.8ch")} />
    <input {...fieldProps("pages", "Pages", { inputMode: "numeric", style: { width: "3.0ch" }, required: true, })} />

    <span className="bfd-top-fill">
      {barcodePreviewLoading
        ? "Prüfe…"
        : barcodePreview?.candidate
          ? <BookCodeVisual code={barcodePreview.candidate} />
          : ""}
    </span>
  </div>

  <div className="bfd-row bfd-tight-row">
    <div style={{ display: "flex", alignItems: "stretch", width: "100%", gap: "0.1em" }}>
      <input {...fieldProps("isbn10", "ISBN-10", { className: "bfd-input", style: { flex: "1 1 0", minWidth: 0, width: 0 } })} />
      <button
        type="button"
        className="bfd-btn"
        disabled={isbnBusy}
        onClick={doIsbnLookup}
        title="ISBN lookup"
        style={{ flexShrink: 0, padding: "0 0.12em", fontSize: "clamp(40px, 6vw, 70px)", height: "0.95em", lineHeight: 1 }}
      >
        {isbnBusy ? "…" : "🔍"}
      </button>
    </div>
  </div>

  <div className="bfd-row bfd-tight-row">
    <input {...fieldProps("isbn13", "ISBN-13", { className: "bfd-input bfd-input-wide" })} />
  </div>

  <div className="bfd-row bfd-tight-row">
  <div className="bfd-ac-wrap" style={{ flex: "1 1 0", minWidth: 0 }}>
    <input
      {...fieldProps("name_display", "Author", {
        className: "bfd-input",
        style: { width: "100%" },
      })}
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
    {...fieldProps("authors_number", "#", {
      inputMode: "numeric",
      style: { width: "1.35ch", textAlign: "center" },
    })}
  />
</div>
</div>
      <div className="bfd-row bfd-tight-row">
        <input
          {...fieldProps("title_display", "Title", {
            className: "bfd-input bfd-input-wide",
          })}
        />
      </div>

      <div className="bfd-row">
        <input
          {...fieldProps("subtitle_display", "Subtitle", {
            className: "bfd-input bfd-input-wide",
          })}
        />
      </div>

      <div className="bfd-row bfd-tight-row">
        <div className="bfd-ac-wrap bfd-wide-wrap">
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
      </div>

      {!isEdit ? (
        <div className="bfd-row" style={{ flexDirection: "column", gap: 6, border: "2px dashed #d08a00", padding: 10, marginBottom: 12 }}>
          <strong style={{ fontSize: 16 }}>Barcode-Fund (bereits vergeben / Konflikt)</strong>
          <span style={{ fontSize: 13, color: "#666" }}>
            Nur ausfüllen, wenn auf dem physischen Buch ein Barcode klebt, der laut System schon einem
            anderen Buch zugeordnet ist. Wird als ungelöster Konflikt vermerkt — verändert die normale
            Barcode-Zuweisung oben NICHT.
          </span>
          <input
            className="bfd-input"
            placeholder="Gefundener Barcode, z. B. dik030"
            value={conflictBarcode}
            disabled={busy}
            onChange={(e) => setConflictBarcode(e.target.value)}
          />
          <input
            className="bfd-input"
            placeholder="Notiz (optional)"
            value={conflictNote}
            disabled={busy}
            onChange={(e) => setConflictNote(e.target.value)}
          />
        </div>
      ) : null}

      <div className="bfd-row">
        <button className="bfd-btn bfd-btn-primary" disabled={busy} type="submit">
          {busy ? "…" : existingMatch?.id ? "Ausgewähltes Buch registrieren" : submitLabel}
        </button>

        <button
          type="button"
          className="bfd-btn bfd-btn-clear"
          disabled={busy}
          onClick={() => {
            setV({ ...emptyForm });
            setExistingMatch(null);
            setExistingMatches([]);
            showMsg("", "info");
          }}
        >
          ✕ Leeren
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

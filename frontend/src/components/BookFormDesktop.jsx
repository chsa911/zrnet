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
import { BookCodeVisual } from "../utils/bookCodeDisplay";
import { PAGE_NUM_POS_HELP, buildPhysCode, formatPhysCode, isValidPageNumPos, normalizeLastWord, pageNumPosLabel } from "../utils/pageNumPos";
import usePhysCodeCheck, { physCodeKnownText, similarText } from "../utils/usePhysCodeCheck";
import { countryEntry, countryName, countryOptions, normalizeCountryInput } from "../utils/countryCodes";
import { cityOptions, cityPlace } from "../utils/cityDefaults";
import KeywordsField, { mergeKeywords } from "./bookForm/fields/KeywordsField";
import {
  friendlySaveErrorMessage,
  newRequestId,
  notifyOpenIssuesChanged,
  openIssueHint,
} from "../utils/saveFeedback";

const API_ROOT = import.meta.env.VITE_API_ROOT || "";

// Sprache des Exemplars (books.language) – Backend erwartet ISO-Code wie "de" oder "pt-br"
const LANGUAGE_OPTIONS = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "Englisch" },
  { value: "fr", label: "Französisch" },
  { value: "es", label: "Spanisch" },
  { value: "it", label: "Italienisch" },
  { value: "nl", label: "Niederländisch" },
  { value: "pt", label: "Portugiesisch" },
  { value: "sv", label: "Schwedisch" },
  { value: "da", label: "Dänisch" },
  { value: "no", label: "Norwegisch" },
  { value: "fi", label: "Finnisch" },
  { value: "pl", label: "Polnisch" },
  { value: "cs", label: "Tschechisch" },
  { value: "ru", label: "Russisch" },
  { value: "tr", label: "Türkisch" },
  { value: "el", label: "Griechisch" },
  { value: "la", label: "Latein" },
  { value: "ja", label: "Japanisch" },
  { value: "zh", label: "Chinesisch" },
];

// Datum + Genauigkeit -> Eingabeformat: year "1999", month "05.1999", day/unbekannt "03.05.1999"
function lifeDateForInput(raw, precision) {
  const t = String(raw ?? "").trim();
  let m;
  if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})/))) {
    if (precision === "year") return m[1];
    if (precision === "month") return `${m[2]}.${m[1]}`;
    return `${m[3]}.${m[2]}.${m[1]}`;
  }
  if ((m = t.match(/^(\d{4})-(\d{2})$/))) return `${m[2]}.${m[1]}`;
  return t;
}
const DEATH_DATE_RE = /^(\d{4}|\d{1,2}\.\d{4}|\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2})$/;

// Vorbelegung Nationalität bei Neuanlage; überschreibt nie eine schon gespeicherte Nationalität des Autors
const DEFAULT_AUTHOR_NATIONALITY = "D";
// Vorbelegung Originalsprache bei Neuanlage (Deutsch)
const DEFAULT_ORIGINAL_LANGUAGE = "de";
// Vorbelegung Genre bei Neuanlage: Fiction (genres.abbr = "F")
const DEFAULT_GENRE_ABBR = "F";
// Vorbelegung Position der Seitenzahl bei Neuanlage: unten rechts
const DEFAULT_PAGE_NUM_POS = "ur";

// Handlungs-Region (books.action_continent) – gleiche Codes wie auf der Suche/Update-Seite
const REGION_OPTIONS = [
  { value: "0", label: "Asien" },
  { value: "1", label: "Afrika" },
  { value: "2", label: "Nordamerika" },
  { value: "3", label: "Südamerika" },
  { value: "4", label: "Mitteleuropa" },
  { value: "5", label: "Ostaustralien" },
  { value: "6", label: "Weltweit" },
  { value: "7", label: "Westaustralien" },
  { value: "8", label: "Nordeuropa" },
  { value: "9", label: "Südeuropa" },
  { value: "10", label: "Fiktiv" },
];

// Vorschläge für das Feld Bundesland (freie Eingabe bleibt möglich, z. B. Tirol, Wallis)
const GERMAN_STATES = [
  "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hessen",
  "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen", "Rheinland-Pfalz",
  "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen",
];

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

// Titel 2, 3, … : so viele Felder wie "# Titel" minus 1 (max. 19 zusätzliche)
const MAX_EXTRA_TITLES = 19;
function extraTitleCount(numberTitles) {
  const n = parseInt(String(numberTitles ?? "").trim(), 10);
  if (!Number.isFinite(n) || n <= 1) return 0;
  return Math.min(n - 1, MAX_EXTRA_TITLES);
}
function extraTitlesForSave(list, numberTitles) {
  const arr = (Array.isArray(list) ? list : [])
    .slice(0, extraTitleCount(numberTitles))
    .map((t) => String(t ?? "").trim());
  while (arr.length && !arr[arr.length - 1]) arr.pop();
  return arr;
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
  author_nationality: DEFAULT_AUTHOR_NATIONALITY,
  place_of_birth: "",
  male_female: "",
  published_titles: "",
  number_of_millionsellers: "",
  publisher_name_display: "",
  title_display: "",
  number_titles: "1",
  extra_titles: [],
  subtitle_display: "",
  title_keyword: "",
  title_keyword_position: "",
  title_keyword2: "",
  title_keyword2_position: "",
  title_keyword3: "",
  title_keyword3_position: "",
  pages: "",
  page_num_pos: DEFAULT_PAGE_NUM_POS,
  chapters: "",
  last_word: "",
  width_cm: "",
  height_cm: "",
  purchase_url: "",
  isbn13: "",
  isbn10: "",
  original_language: DEFAULT_ORIGINAL_LANGUAGE,
  comment: "",
  genre_id: "",
  sub_genre_id: "",
  year_first_published: "",
  action_continent: "",
  action_country: "",
  action_state: "",
  action_city: "",
  action_place_fictional: "",
  action_time_year: "",
  landscape_ids: [],
  time_era_ids: [],
  keywords: [],        // Schlagwort-Namen
  keywords_draft: "",  // noch nicht bestätigter Text im Schlagwort-Feld
  language: "",
  author_death_date: "",
  author_birth_date: "",
  author_death_date_raw: "",
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
  extraPayload = null, // merged into the create payload (e.g. followup_attempt_ids)
}) {
  const isEdit = mode === "edit";
  const msgRef = useRef(null);
  const matchJustSelectedRef = useRef(false);
  // Lagereinträge mit gleicher ISBN, die der Benutzer bewusst abgewählt hat
  // ("Neues Buch anlegen") – werden nicht erneut automatisch ausgewählt.
  const dismissedIsbnMatchesRef = useRef(new Set());
  // Buch ohne Lagereintrag (z.B. aus der Zeit vor den Cover-Fotos) trotz gleicher ISBN
  // neu anlegen: Server-Schutz gegen Doppelanlage überspringen (force_new_entry)
  const forceNewEntryRef = useRef(false);

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
      author_nationality: toStr(pick(b, ["author_nationality"])) || (isEdit ? "" : DEFAULT_AUTHOR_NATIONALITY),
      place_of_birth: toStr(pick(b, ["place_of_birth"])),
      male_female: toStr(pick(b, ["male_female"])),
      published_titles: toStr(pick(b, ["published_titles"])),
      number_of_millionsellers: toStr(pick(b, ["number_of_millionsellers"])),
      publisher_name_display: toStr(pick(b, ["publisher_name_display"])),
      title_display: toStr(pick(b, ["title_display", "titleDisplay", "title"])),
      number_titles: toStr(pick(b, ["number_titles"])) || "1",
      extra_titles: Array.isArray(b.extra_titles) ? b.extra_titles.map(toStr) : [],
      subtitle_display: toStr(pick(b, ["subtitle_display"])),
      title_keyword: toStr(pick(b, ["title_keyword", "keyword"])),
      title_keyword_position: toStr(pick(b, ["title_keyword_position"])),
      title_keyword2: toStr(pick(b, ["title_keyword2"])),
      title_keyword2_position: toStr(pick(b, ["title_keyword2_position"])),
      title_keyword3: toStr(pick(b, ["title_keyword3"])),
      title_keyword3_position: toStr(pick(b, ["title_keyword3_position"])),
      pages: toStr(pick(b, ["pages"])),
      page_num_pos: toStr(pick(b, ["page_num_pos"])) || (isEdit ? "" : DEFAULT_PAGE_NUM_POS),
      chapters: toStr(pick(b, ["chapters"])),
      last_word: toStr(pick(b, ["last_word"])),
      width_cm: toStr(pick(b, ["width_cm", "width", "bbreite"])),
      height_cm: toStr(pick(b, ["height_cm", "height", "bhoehe"])),
      purchase_url: toStr(pick(b, ["purchase_url"])),
      isbn13: toStr(pick(b, ["isbn13"])),
      isbn10: toStr(pick(b, ["isbn10"])),
      original_language: toStr(pick(b, ["original_language"])).toLowerCase() || (isEdit ? "" : DEFAULT_ORIGINAL_LANGUAGE),
      comment: toStr(pick(b, ["comment"])),
      genre_id: toStr(pick(b, ["genre_id"])),
      sub_genre_id: toStr(pick(b, ["sub_genre_id"])),
      year_first_published: toStr(pick(b, ["year_first_published", "first_publish_year"])),
      action_continent: toStr(pick(b, ["action_continent"])),
      action_country: toStr(pick(b, ["action_country"])),
      action_state: toStr(pick(b, ["action_state"])),
      action_city: toStr(pick(b, ["action_city"])),
      action_place_fictional: toStr(pick(b, ["action_place_fictional"])),
      action_time_year: toStr(pick(b, ["action_time_year"])),
      landscape_ids: Array.isArray(b.landscape_ids) ? b.landscape_ids.map(toStr).filter(Boolean) : [],
      time_era_ids: Array.isArray(b.time_era_ids) ? b.time_era_ids.map(toStr).filter(Boolean) : [],
      keywords: Array.isArray(b.keywords)
        ? b.keywords.map((k) => toStr(k && typeof k === "object" ? k.name : k)).filter(Boolean)
        : [],
      keywords_draft: "",
      language: toStr(pick(b, ["language"])).toLowerCase(),
      author_birth_date: lifeDateForInput(toStr(pick(b, ["author_birth_date", "birth_date"])), toStr(pick(b, ["author_birth_date_precision"]))),
      author_death_date: lifeDateForInput(toStr(pick(b, ["author_death_date", "death_date"])), toStr(pick(b, ["author_death_date_precision"]))),
    };
  }, [initialBook]);

  const [v, setV] = useState(initial);
  // true, sobald die Nationalität von Hand geändert wurde (sonst ist "D" nur Vorbelegung)
  const nationalityTouchedRef = useRef(false);
  // true, sobald die Originalsprache von Hand gewählt wurde (sonst darf die ISBN-Suche "de" ersetzen)
  const origLangTouchedRef = useRef(false);
  // true, sobald Genre/Subgenre von Hand gewählt wurden (sonst wird Fiction vorbelegt)
  const genreTouchedRef = useRef(false);
  const requestIdRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [isbnBusy, setIsbnBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info"); // "success" | "error" | "info"
  // "main" = Hauptformular (große Pflichtfelder), "enrich" = Zusatzangaben (Jahr, Ort, Epoche, Autor …)
  const [view, setView] = useState("main");
  const enrichFirstRef = useRef(null);
  useEffect(() => {
    if (view !== "enrich") return;
    window.scrollTo?.({ top: 0 });
    enrichFirstRef.current?.focus?.();
  }, [view]);


  function showMsg(text, type = "info") {
    setMsg(text);
    setMsgType(type);
  }
  const [ac, setAc] = useState({ field: "", items: [] });
  const [barcodePreview, setBarcodePreview] = useState(null);
  const [barcodePreviewErr, setBarcodePreviewErr] = useState("");
  const [barcodePreviewLoading, setBarcodePreviewLoading] = useState(false);
  const [extras, setExtras] = useState({});

  // Genre (Fiction / Non-Fiction) + Subgenre lists from DB
  const [genres, setGenres] = useState([]);       // { id, abbr, name }
  const [subGenres, setSubGenres] = useState([]); // { id, genre_id, name, abbr }
  useEffect(() => {
    let alive = true;
    fetch(`${API_ROOT}/api/public/sub-genres`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive || !Array.isArray(data)) return;
        const gm = new Map();
        for (const sg of data) {
          if (sg?.genre_id != null && !gm.has(String(sg.genre_id))) {
            gm.set(String(sg.genre_id), { id: String(sg.genre_id), abbr: sg.genre_abbr || "", name: sg.genre_name || sg.genre_abbr || "" });
          }
        }
        setGenres([...gm.values()].sort((a, b) => a.name.localeCompare(b.name, "de")));
        setSubGenres(
          data
            .map((sg) => ({ id: String(sg.id), genre_id: String(sg.genre_id), name: sg.name || sg.abbr || "", abbr: sg.abbr || "" }))
            .sort((a, b) => a.name.localeCompare(b.name, "de"))
        );
      })
      .catch((e) => console.error("[BookFormDesktop] sub-genres load failed", e));
    return () => { alive = false; };
  }, []);
  // Landschaften (Himalaya › K2 ...) und Epochen (Mittelalter, Kulturrevolution ...) aus der DB.
  // Jeder Eintrag bringt Region/Land mit, die beim Auswählen in leere Felder übernommen werden.
  const [landscapes, setLandscapes] = useState([]); // { id, label, depth, continent, country }
  const [timeEras, setTimeEras] = useState([]);     // { id, label, depth, start_year, end_year, continent, country }
  const [dbCities, setDbCities] = useState([]); // schon verwendete Städte { name, continent, country, state }
  const cityList = useMemo(() => cityOptions(dbCities), [dbCities]);
  const [dbFictional, setDbFictional] = useState([]); // schon verwendete erfundene Orte (Atlantis …)
  const [dbCountries, setDbCountries] = useState([]); // schon verwendete Länderwerte (eigene Kürzel)
  const countryList = useMemo(() => countryOptions(dbCountries), [dbCountries]);
  const [placeListsTick, setPlaceListsTick] = useState(0); // nach dem Speichern neu laden (neue Einträge)
  useEffect(() => {
    let alive = true;
    const load = (path, set) =>
      fetch(`${API_ROOT}/api/public/places/${path}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          if (!alive || !Array.isArray(data)) return;
          set(data.map((x) => (x && typeof x === "object" ? { ...x, id: String(x.id ?? x.name ?? "") } : { id: String(x) })));
        })
        .catch((e) => console.error(`[BookFormDesktop] ${path} load failed`, e));
    load("landscapes", setLandscapes);
    load("time-eras", setTimeEras);
    load("countries", (rows) => setDbCountries(rows.map((x) => x.id)));
    load("fictional", (rows) => setDbFictional(rows.map((x) => x.id)));
    load("cities", setDbCities);
    return () => { alive = false; };
  }, [placeListsTick]);

  // Landschaft/Epoche: freie Texteingabe mit Vorschlägen.
  //   - passt der Text zu einem vorhandenen Eintrag, wird dessen ID gespeichert
  //     und leere Region/Land/Bundesland werden sofort ausgefüllt;
  //   - sonst wird der Text gespeichert und beim Speichern angelegt,
  //     auch als Pfad: "Anden › Cerro Torre" (oder "Anden > Cerro Torre").
  // Das Feld bearbeitet den ersten Eintrag; weitere Zuordnungen (z. B. aus Skripten) bleiben erhalten.
  const normTag = (t) => String(t || "").toLowerCase().replace(/\s*(›|>|»)\s*/g, " › ").replace(/\s+/g, " ").trim();
  const isUuidLike = (t) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(t || ""));

  function findPlaceTag(list, text) {
    const n = normTag(text);
    if (!n) return null;
    const byLabel = list.find((x) => normTag(x.label) === n);
    if (byLabel) return byLabel;
    if (n.includes("›")) return null;
    const byName = list.filter((x) => normTag(x.name) === n);
    return byName.length === 1 ? byName[0] : null;
  }

  function placeTagText(ids, list) {
    const first = (ids || [])[0];
    if (!first) return "";
    const item = list.find((x) => x.id === first);
    if (item) return item.label;
    return isUuidLike(first) ? "" : first;
  }

  // Leere Region/Land/Bundesland aus einer Vorgabe füllen (Landschaft, Epoche, Stadt).
  // Nichts wird überschrieben; widerspricht die Region, wird gar nichts ergänzt.
  function fillPlaceDefaults(prev, next, place) {
    if (!place) return next;
    const cont = place.continent == null ? "" : String(place.continent);
    const curCont = String(prev.action_continent ?? "").trim();
    if (cont && curCont && curCont !== cont) return next;
    if (cont && !curCont) next.action_continent = cont;
    if (place.country && !String(prev.action_country || "").trim()) next.action_country = place.country;
    if (
      place.state &&
      !String(prev.action_state || "").trim() &&
      String(next.action_country || "").trim().toUpperCase() === String(place.country || "").toUpperCase()
    ) {
      next.action_state = place.state;
    }
    return next;
  }

  function typePlaceTag(key, list, text) {
    const item = findPlaceTag(list, text);
    setV((prev) => {
      const rest = (prev[key] || []).slice(1);
      if (!item) {
        return { ...prev, [key]: String(text || "").trim() ? [text, ...rest] : rest };
      }
      const next = { ...prev, [key]: [item.id, ...rest.filter((x) => x !== item.id)] };
      return fillPlaceDefaults(prev, next, item);
    });
  }

  const placeTagTitle = (ids, list, fallback) => {
    const labels = (ids || []).map((id) => list.find((x) => x.id === id)?.label || (isUuidLike(id) ? "" : `${id} (neu)`)).filter(Boolean);
    return labels.length ? `${fallback}\nAktuell: ${labels.join(", ")}` : fallback;
  };
  const eraLabel = (e) =>
    e.start_year != null && e.end_year != null ? `${e.label} (${e.start_year}–${e.end_year})` : e.label;

  const visibleSubGenres = useMemo(
    () => (v.genre_id ? subGenres.filter((sg) => sg.genre_id === String(v.genre_id)) : subGenres),
    [subGenres, v.genre_id]
  );
  const defaultGenreId = useMemo(() => {
    const g =
      genres.find((x) => String(x.abbr || "").toLowerCase() === DEFAULT_GENRE_ABBR.toLowerCase()) ||
      genres.find((x) => /^fiction/i.test(String(x.name || "")));
    return g ? g.id : "";
  }, [genres]);
  useEffect(() => {
    if (isEdit || genreTouchedRef.current || !defaultGenreId) return;
    if (v.genre_id || v.sub_genre_id) return;
    setV((prev) => (prev.genre_id || prev.sub_genre_id ? prev : { ...prev, genre_id: defaultGenreId }));
  }, [isEdit, defaultGenreId, v.genre_id, v.sub_genre_id]);
  const [existingMatches, setExistingMatches] = useState([]);
  const [existingMatch, setExistingMatch] = useState(null);
  const [hoveredMatch, setHoveredMatch] = useState(null);
  // in_stock books with the same title AND author (independent of page count)
  const [titleAuthorMatches, setTitleAuthorMatches] = useState([]);
  const titleAuthorMatchesRef = useRef([]);
  titleAuthorMatchesRef.current = titleAuthorMatches;
  const allMatches = useMemo(() => {
    const seen = new Set();
    const out = [];
    // 1. gleiche ISBN (sicherster Treffer) zuerst
    for (const m of existingMatches) {
      if (!m?.id || seen.has(m.id) || m.match_reason !== "isbn") continue;
      seen.add(m.id);
      out.push({ ...m, _matchReason: "isbn" });
    }
    // 2. gleicher Titel + Autor
    for (const m of titleAuthorMatches) {
      if (!m?.id || seen.has(m.id)) continue;
      seen.add(m.id);
      out.push({ ...m, _matchReason: "title_author" });
    }
    // 3. gleiche bzw. ähnliche Seitenzahl (vom Server schon nach Abstand sortiert)
    for (const m of existingMatches) {
      if (!m?.id) continue;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      out.push({ ...m, _matchReason: m.match_reason === "pages_exact" ? "pages_exact" : "pages" });
    }
    return out;
  }, [titleAuthorMatches, existingMatches]);
  const identicalCovers = useIdenticalCovers(allMatches);

  const knownKeys = useMemo(() => new Set(Object.keys(emptyForm).map(norm)), []);
  const excludeKey = (excludeUnknownKeys || []).map(String).join("\u0000");

  useEffect(() => {
    setV(initial);
    nationalityTouchedRef.current = false;
    origLangTouchedRef.current = false;
    genreTouchedRef.current = false;
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
    // Eine gültige ISBN reicht für die Suche – so erscheint der Lagereintrag schon
    // direkt nach dem Scannen, noch bevor die Seitenzahl eingegeben ist.
    const isbnN = normalizeIsbnInputs(v.isbn13, v.isbn10);
    const hasIsbn = isbnN.lookupOk;

    // Search/selection are keyed on `pages` only. Filling in title/ISBN/author/
    // publisher must NOT clear an already-found draft match — that's the natural
    // next step after entering the page count, and clearing here caused the
    // match to "flash and disappear" before the user could pick it, leading the
    // form to fall through and create a duplicate book record.
    if (pages == null && !hasIsbn) {
      // If a match was just clicked, the fields were filled programmatically —
      // don't clear the selection. Only clear on manual user edits.
      if (matchJustSelectedRef.current) {
        matchJustSelectedRef.current = false;
        return;
      }
      setExistingMatches([]);
      setExistingMatch((prev) =>
        prev?.id && titleAuthorMatchesRef.current.some((x) => x.id === prev.id) ? prev : null
      );
      return;
    }
    matchJustSelectedRef.current = false;

    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        // Send ISBN alongside pages (when present) so an exact ISBN match
        // can surface a draft even if its stored page count is off by more
        // than the ±5 tolerance the backend applies to pages-only matches
        // (e.g. a typo/misread during the quick photo-upload step). The
        // backend OR's these together, so this only ever widens the match —
        // it never narrows or removes a match that pages-only would have
        // found, so it can't reintroduce the "flash and disappear" issue.
        const r = await findDraft(
          { pages: pages ?? undefined, isbn13: isbnN.isbn13 || v.isbn13, isbn10: isbnN.isbn10 || v.isbn10 },
          { signal: ctrl.signal }
        );
        const items = Array.isArray(r?.items) ? r.items : [];
        setExistingMatches(items);
        setExistingMatch((prev) =>
          prev?.id &&
          (items.some((x) => x.id === prev.id) ||
            titleAuthorMatchesRef.current.some((x) => x.id === prev.id))
            ? prev
            : null
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

  // Second search: every in_stock book with the same title AND author,
  // whatever its page count, so an existing draft is always offered.
  useEffect(() => {
    if (isEdit) {
      setTitleAuthorMatches([]);
      return;
    }
    const title = String(v.title_display || "").trim();
    const author = String(v.name_display || v.author_lastname || "").trim();
    if (title.length < 2 || author.length < 2) {
      setTitleAuthorMatches([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await findDraft(
          { title_display: title, name_display: author, title_and_author: 1 },
          { signal: ctrl.signal }
        );
        setTitleAuthorMatches(Array.isArray(r?.items) ? r.items : []);
      } catch (e) {
        if (e?.name !== "AbortError") {
          console.error("[BookFormDesktop] title/author draft search failed", e);
          showMsg(`Suche nach vorhandenen Exemplaren fehlgeschlagen: ${e?.message || e}`, "error");
        }
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [isEdit, v.title_display, v.name_display, v.author_lastname]);

  // Lagereintrag übernehmen: Auswahl merken und seine Daten ins Formular holen
  function selectMatch(m) {
    if (!m?.id) return;
    matchJustSelectedRef.current = true;
    forceNewEntryRef.current = false;
    setExistingMatch(m);
    setV((prev) => ({
      ...prev,
      pages: toStr(m.pages ?? prev.pages),
      isbn13: toStr(m.isbn13 ?? prev.isbn13),
      isbn10: toStr(m.isbn10 ?? prev.isbn10),
      title_display: toStr(m.title_display ?? m.main_title_display ?? prev.title_display),
      subtitle_display: toStr(m.subtitle_display ?? prev.subtitle_display),
      number_titles: toStr(m.number_titles ?? prev.number_titles),
      extra_titles: Array.isArray(m.extra_titles) ? m.extra_titles.map(toStr) : prev.extra_titles,
      author_id: toStr(m.author_id ?? prev.author_id),
      authors_number: toStr(m.authors_number ?? prev.authors_number),
      name_display: toStr(m.name_display ?? m.author_name_display ?? m.author_display ?? prev.name_display),
      author_lastname: toStr(m.author_lastname ?? prev.author_lastname),
      author_firstname: toStr(m.author_firstname ?? prev.author_firstname),
      publisher_id: toStr(m.publisher_id ?? prev.publisher_id),
      publisher_name_display: toStr(m.publisher_name_display ?? m.publisher_name ?? prev.publisher_name_display),
    }));
  }

  // Genau ein Lagereintrag mit gleicher ISBN -> automatisch auswählen.
  // Bei mehreren (z.B. Platzhalter mit derselben ISBN) entscheidet der Benutzer.
  useEffect(() => {
    if (isEdit || existingMatch?.id) return;
    const byIsbn = existingMatches.filter(
      (m) => m?.match_reason === "isbn" && !dismissedIsbnMatchesRef.current.has(m.id)
    );
    if (byIsbn.length !== 1) return;
    selectMatch(byIsbn[0]);
    showMsg(
      "Lagereintrag mit gleicher ISBN gefunden und ausgewählt ✔ – bitte am Cover-Foto prüfen. Ist es ein anderes Exemplar ohne Lagereintrag, „Neues Buch anlegen“ wählen.",
      "info"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, existingMatches]);

  // phys_code (Breite-Höhe-Seiten-Position-Autor) muss eindeutig sein
  const physCode = buildPhysCode(v);
  const physCheck = usePhysCodeCheck(physCode, isEdit ? (bookId || initialBook?._id || initialBook?.id) : existingMatch?.id);

  function setField(key, val) {
    setV((prev) => {
      const next = { ...prev, [key]: val };
      if (!isEdit) {
        if (["author_lastname", "author_firstname", "name_display"].includes(key)) {
          next.author_id = "";
          // anderer Autor: Nationalität des vorher gewählten Autors nicht übernehmen
          if (!nationalityTouchedRef.current) next.author_nationality = DEFAULT_AUTHOR_NATIONALITY;
        }
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
        original_language: ((found) =>
          !isEdit && !origLangTouchedRef.current
            ? found || prev.original_language
            : prev.original_language || found)(((m) => (/^[a-z]{2}$/.test(m) ? m : ""))(String(s.original_language || s.language || "").trim().toLowerCase().replace(/^(eng)$/, "en").replace(/^(ger|deu)$/, "de").replace(/^(fre|fra)$/, "fr").replace(/^(spa)$/, "es").replace(/^(ita)$/, "it"))),
        author_id: prev.author_id || s.author_id || "",
        author_lastname: prev.author_lastname || s.author_lastname || last || "",
        author_firstname: prev.author_firstname || s.author_firstname || first || "",
        name_display: prev.name_display || s.name_display || display || "",
        publisher_id: prev.publisher_id || s.publisher_id || "",
        publisher_name_display: prev.publisher_name_display || s.publisher_name_display || "",
      }));
      if (Array.isArray(r?.warnings) && r.warnings.length) {
        showMsg(`ISBN gefunden – bitte Daten prüfen:\n⚠ ${r.warnings.join("\n⚠ ")}`, "error");
      } else {
        showMsg("ISBN gefunden ✔", "success");
      }
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

// Pages ist bei Neuanlage Pflicht, 0 ist gültig (Buch ohne Seitenzahlen).
// Im Edit-Modus gibt es keine Pflichtfelder.
if (!isEdit && (pages == null || pages < 0)) {
  throw new Error("Pages ist erforderlich (0 = keine Seitenzahl).");
}
    // Registrierung (nicht Wishlist): Position der Seitenzahl ist Pflicht,
    // damit der eindeutige Buch-Code (phys_code) gebildet werden kann.
    if (!isEdit && createReadingStatus !== "wishlist") {
      const missing = [];
      if (!String(v.title_display || "").trim()) missing.push("Titel");
      if (!String(v.author_id || "").trim() && !String(v.author_lastname || "").trim() && !String(v.name_display || "").trim()) missing.push("Autor");
      if (!String(v.publisher_id || "").trim() && !String(v.publisher_name_display || "").trim()) missing.push("Verlag");
      if (!(parseFloatOrNull(v.width_cm) > 0)) missing.push("Breite");
      if (!(parseFloatOrNull(v.height_cm) > 0)) missing.push("Höhe");
      { const ch = parseIntOrNull(v.chapters); if (ch == null || ch < 0) missing.push("Kapitel (0 = keine)"); }
      if (missing.length) throw new Error(`Pflichtfelder fehlen: ${missing.join(", ")}.`);
      if (!isValidPageNumPos(v.page_num_pos)) {
        throw new Error("Position der Seitenzahl ist erforderlich: ol om or = oben, ml mr = mitte, ul um ur = unten (links/mitte/rechts), 00 = keine.");
      }
      if (!normalizeLastWord(v.last_word)) {
        throw new Error("Letztes Wort im Buch ist erforderlich (00 = kein Text).");
      }
      if (!buildPhysCode(v)) {
        throw new Error("Buch-Nummer unvollständig: Breite, Höhe, Position der Seitenzahl und letztes Wort angeben.");
      }
    }
    if (!isEdit && assignBarcode && !finalBarcode) {
      if (!(wCm > 0 && hCm > 0)) throw new Error("Breite + Höhe oder BookCode nötig.");
    }

    if (!lockBarcode && !isEdit && assignBarcode && finalBarcode) payload.barcode = finalBarcode;
    if (wCm !== null) payload.width_cm = wCm;
    if (hCm !== null) payload.height_cm = hCm;

    {
      const dd = String(v.author_death_date || "").trim();
      if (dd && !DEATH_DATE_RE.test(dd)) throw new Error("Todesdatum: z. B. 1999 oder 03.05.1999");
      const bd = String(v.author_birth_date || "").trim();
      if (bd && !DEATH_DATE_RE.test(bd)) throw new Error("Geburtsdatum: z. B. 12.04.1947 oder nur 1947");
      const ol = String(v.original_language || "").trim();
      const ty = String(v.action_time_year || "").trim();
      if (ty && !(/^\d{1,4}$/.test(ty) && Number(ty) <= 3000)) throw new Error("Handlungsjahr: ganze Jahreszahl, z. B. 1968 (0–3000).");
      if (ol && !/^[a-z]{2}$/.test(ol)) throw new Error(`Originalsprache „${ol}“ ungültig – bitte aus der Liste wählen (2-Buchstaben-Code).`);
    }

    const strings = [
      "action_country",
      "action_state",
      "action_city",
      "action_place_fictional",
      "language",
      "author_birth_date",
      "author_death_date",
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
      "page_num_pos",
      "last_word",
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

    if (!isEdit && !nationalityTouchedRef.current && String(v.author_nationality || "").trim() === DEFAULT_AUTHOR_NATIONALITY) {
      // nur Vorbelegung: Backend setzt "D" nur, wenn der Autor noch keine Nationalität hat
      delete payload.author_nationality;
      payload.author_nationality_default = DEFAULT_AUTHOR_NATIONALITY;
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
      "number_titles",
      "title_keyword_position",
      "title_keyword2_position",
      "title_keyword3_position",
      "pages",
      "chapters",
      "published_titles",
      "number_of_millionsellers",
      "genre_id",
      "sub_genre_id",
      "year_first_published",
      "action_continent",
      "action_time_year",
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

    {
      const next = extraTitlesForSave(v.extra_titles, v.number_titles);
      const prev = extraTitlesForSave(initial.extra_titles, initial.number_titles);
      if (!isEdit) {
        if (next.length) payload.extra_titles = next;
      } else if (JSON.stringify(next) !== JSON.stringify(prev)) {
        payload.extra_titles = next;
      }
    }

    for (const k of ["landscape_ids", "time_era_ids"]) {
      const next = (v[k] || []).map((x) => String(x || "").trim()).filter(Boolean);
      const prev = (initial[k] || []).map((x) => String(x || "").trim()).filter(Boolean);
      if (!isEdit) {
        if (next.length) payload[k] = next;
      } else if (JSON.stringify(next) !== JSON.stringify(prev)) {
        payload[k] = next;
      }
    }

    {
      // Schlagworte: Namen; das Backend legt unbekannte an (routes/keywords.js)
      const next = mergeKeywords(v.keywords, v.keywords_draft);
      const prev = mergeKeywords(initial.keywords, "");
      if (!isEdit) {
        if (next.length) payload.keywords = next;
      } else if (JSON.stringify(next) !== JSON.stringify(prev)) {
        payload.keywords = next;
      }
    }

    if (isEdit && showUnknownFields) {
      for (const [k, next] of Object.entries(extras || {})) {
        if (next !== toStr((initialBook || {})[k])) payload[k] = next === "" ? null : next;
      }
    }

    if (!isEdit && existingMatch?.id) payload.draft_id = existingMatch.id;
    if (!isEdit && !existingMatch?.id && forceNewEntryRef.current) payload.force_new_entry = true;

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
    if (!isEdit && extraPayload && typeof extraPayload === "object") {
      Object.assign(payload, extraPayload);
    }

    // Same id for every retry of this entry: if a previous attempt reached the
    // server but the answer got lost, the backend returns that book instead of
    // creating a duplicate (and assigning a second barcode).
    if (!isEdit && !payload.draft_id) {
      if (!requestIdRef.current) requestIdRef.current = newRequestId();
      payload.requestId = requestIdRef.current;
    }

    setBusy(true);
    showMsg("Speichere …", "info");
    try {
      let saved;
      if (isEdit) {
        saved = await updateBook(bookId || initialBook?._id || initialBook?.id, payload);
      } else if (payload.draft_id) {
        saved = await registerExistingBook(payload.draft_id, payload);
      } else {
        saved = await registerBook(payload);
      }

      // Only report success when the server confirmed a stored record.
      if (!isEdit && !(saved?.id || saved?._id)) {
        throw Object.assign(new Error("missing_book_id_in_response"), { code: "missing_book_id_in_response" });
      }
      requestIdRef.current = null;
      if (payload.landscape_ids || payload.time_era_ids || payload.keywords || payload.action_place_fictional || payload.action_city) setPlaceListsTick((n) => n + 1);
      onSuccess?.({ payload, saved });

      let successMsg = payload.draft_id ? "Vorhandenes Buch aktualisiert ✔" : isEdit ? "Gespeichert." : "Gespeichert ✔";
      const assignedBarcode = String(saved?.barcode || "").trim();
      if (!isEdit && assignedBarcode) {
        successMsg += ` · Zugewiesener Barcode: ${assignedBarcode}`;
      }


      showMsg(successMsg, "success");
      if (!isEdit) {
        setV({ ...emptyForm }); nationalityTouchedRef.current = false; origLangTouchedRef.current = false; genreTouchedRef.current = false;
        setView("main");
        setExistingMatches([]);
        setExistingMatch(null);
        dismissedIsbnMatchesRef.current = new Set();
        forceNewEntryRef.current = false;
      }
    } catch (err) {
      // Server-Schutz: Lagereintrag mit gleicher ISBN vorhanden -> anbieten statt doppelt anlegen
      if (!isEdit && err?.code === "in_stock_isbn_match") {
        const cands = Array.isArray(err?.data?.candidates) ? err.data.candidates : [];
        setExistingMatches((prev) => {
          const ids = new Set(cands.map((c) => c.id));
          return [...cands, ...prev.filter((p) => !ids.has(p.id))];
        });
        if (cands.length === 1) selectMatch(cands[0]);
        showMsg(
          `⚠ NICHT gespeichert: ${err?.data?.message || "Zu dieser ISBN gibt es bereits einen Lagereintrag."}` +
            (cands.length === 1 ? " Der Lagereintrag ist jetzt ausgewählt – bitte erneut speichern." : ""),
          "error"
        );
        return;
      }
      console.error("Buch konnte nicht gespeichert werden", err);
      const hint = isEdit ? "" : openIssueHint(err);
      showMsg(`❌ NICHT gespeichert: ${friendlySaveErrorMessage(err)}${hint}`, "error");
      if (hint) notifyOpenIssuesChanged();
    } finally {
      setBusy(false);
    }
  }

  // Wie viele Zusatzangaben (Enrichment) sind schon eingetragen? Reine Vorbelegungen zählen nicht.
  const enrichCount = (() => {
    const keys = [
      "year_first_published", "language",
      "action_continent", "action_country", "action_state", "action_city", "action_place_fictional",
      "action_time_year", "author_birth_date", "author_death_date", "place_of_birth", "male_female",
      "published_titles", "number_of_millionsellers", "title_keyword", "title_keyword2", "title_keyword3",
      "purchase_url", "comment",
    ];
    let n = keys.filter((k) => String(v[k] ?? "").trim()).length;
    if ((v.landscape_ids || []).length) n += 1;
    if ((v.time_era_ids || []).length) n += 1;
    const ol = String(v.original_language || "").trim();
    if (ol && (isEdit || origLangTouchedRef.current || ol !== DEFAULT_ORIGINAL_LANGUAGE)) n += 1;
    const nat = String(v.author_nationality || "").trim();
    if (nat && (isEdit || nationalityTouchedRef.current || nat !== DEFAULT_AUTHOR_NATIONALITY)) n += 1;
    return n;
  })();

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

.bfd-keywords {
  flex: 1 1 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3em;
  min-height: 2.2em;
  padding: 0.25em 0.4em;
  border: 3px solid rgba(0,0,0,.65);
  border-top: 0;
  box-sizing: border-box;
  background: #fff;
  font-size: clamp(16px, 1.6vw, 24px);
  font-weight: 900;
}

.bfd-keywords-label {
  color: rgba(0,0,0,.55);
  margin-right: 0.2em;
}

.bfd-keyword {
  display: inline-flex;
  align-items: center;
  gap: 0.15em;
  padding: 0.1em 0.2em 0.1em 0.55em;
  border-radius: 999px;
  background: #222;
  color: #fff;
  line-height: 1.2;
}

.bfd-keyword-x {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  padding: 0 0.3em;
  opacity: 0.7;
}

.bfd-keyword-x:hover {
  opacity: 1;
}

.bfd-keywords-input {
  flex: 1 1 8em;
  min-width: 6em;
  font: inherit;
  color: #333;
  border: 0;
  outline: none;
  background: transparent;
  padding: 0.1em 0;
}

.bfd-keywords-input::placeholder {
  color: rgba(0,0,0,.4);
}

.bfd-stack {
  flex: 0 0 auto;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  width: clamp(160px, 16vw, 260px);
  border: 3px solid rgba(0,0,0,.65);
  border-left: 0;
  box-sizing: border-box;
}

.bfd-stack-field {
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
  font: inherit;
  font-size: clamp(16px, 1.6vw, 24px);
  font-weight: 900;
  color: #333;
  background: #fff;
  border: 0;
  border-radius: 0;
  padding: 0 0.4em;
  box-sizing: border-box;
  cursor: pointer;
}

/* Ortsangaben: 5 Felder untereinander (Jahr, Region, Land, Bundesland, Stadt) */
.bfd-stack--place .bfd-stack-field {
  font-size: clamp(13px, 1.25vw, 19px);
  line-height: 1.1;
}

.bfd-stack--compact .bfd-stack-field {
  font-size: clamp(12px, 1.15vw, 18px);
}

.bfd-stack-field::placeholder {
  color: rgba(0,0,0,.55);
  font-weight: 900;
}

.bfd-stack-field + .bfd-stack-field,
.bfd-stack datalist + .bfd-stack-field {
  border-top: 3px solid rgba(0,0,0,.65);
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
  white-space: pre-line;
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

/* Genre: Fiction / Non-Fiction als große Umschalter */
.bfd-genre-btn {
  font-size: clamp(18px, 2vw, 30px);
  text-align: left;
  color: #666;
  background: #fff;
}
.bfd-genre-btn.is-active {
  background: #111;
  color: #fff;
}

/* Knopf zum Enrichment-Formular (füllt den Rest der ISBN-10-Zeile) */
.bfd-btn-enrich {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  font-size: clamp(34px, 5vw, 64px);
  line-height: 1;
  background: #e8f0ff;
  overflow: hidden;
  white-space: nowrap;
}
.bfd-enrich-count {
  font-size: 0.4em;
  color: #444;
  margin-top: 0.15em;
}

/* ---------- Enrichment-Formular ---------- */
.bfd-enr {
  display: grid;
  gap: 22px;
}
.bfd-enr-head {
  display: flex;
  align-items: stretch;
  gap: 0;
}
.bfd-btn-back {
  font-size: clamp(34px, 5vw, 64px);
  min-height: 0;
  background: #e8f0ff;
}
.bfd-enr-title {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 0.3em;
  font-size: clamp(40px, 6vw, 80px);
  line-height: 1;
  border: 3px solid rgba(0,0,0,.65);
  border-left: 0;
  min-width: 0;
}
.bfd-enr-subtitle {
  font-size: 0.32em;
  color: #555;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bfd-enr-section-title {
  font-size: clamp(16px, 1.6vw, 24px);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #fff;
  background: #333;
  padding: 2px 10px;
  display: inline-block;
}
.bfd-enr-row {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0;
  font-size: clamp(76px, 12vw, 138px); /* gleiche Größe wie .bfd-input -> ch-Breiten stimmen */
}
.bfd-enr-cell {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin: 0;
}
.bfd-enr-label {
  font-size: clamp(13px, 1.2vw, 18px);
  line-height: 1.3;
  color: #555;
  padding: 4px 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bfd-enr-field {
  width: 100%;
  min-width: 0;
  background: #fff;
}
/* Auswahllisten: Schrift kleiner, damit "Mitteleuropa" usw. lesbar bleibt – Feldhöhe gleich wie Eingabefelder */
select.bfd-enr-field {
  font-size: 0.42em;
  height: 2.26em; /* = 0.95em der großen Eingabefelder */
  line-height: 1;
  padding: 0 0.3em;
  cursor: pointer;
}
.bfd-enr-textarea {
  height: 1.9em;
  line-height: 0.95;
  resize: vertical;
}
`}</style>
      {!isEdit && allMatches.length ? (
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
                requestIdRef.current = null;
                dismissedIsbnMatchesRef.current = new Set();
                forceNewEntryRef.current = false;
                setV({ ...emptyForm }); nationalityTouchedRef.current = false; origLangTouchedRef.current = false; genreTouchedRef.current = false;
                setExistingMatch(null);
                setExistingMatches([]);
                setTitleAuthorMatches([]);
              }}
            >
              ✕ Leeren
            </button>
            <button
              type="button"
              className="bfd-btn bfd-btn-muted"
              disabled={busy}
              onClick={() => {
                // Anderes Exemplar ohne Lagereintrag: Lagereinträge mit gleicher ISBN nicht wieder
                // automatisch auswählen und den Server-Schutz überspringen.
                for (const m of allMatches) {
                  if (m._matchReason === "isbn") dismissedIsbnMatchesRef.current.add(m.id);
                }
                forceNewEntryRef.current = true;
                setExistingMatch(null);
                setExistingMatches([]);
                setTitleAuthorMatches([]);
                showMsg("Es wird ein neues Buch ohne Lagereintrag angelegt (z. B. Buch aus der Zeit vor den Cover-Fotos).", "info");
              }}
            >
              ➕ Neues Buch anlegen{allMatches.some((m) => m._matchReason === "isbn") ? " (ohne Lagereintrag)" : ""}
            </button>
            {(() => {
              // Flag probable duplicates: same title, timestamps ≥1 day apart
              const titleNorm = (s) => String(s || "").trim().toLowerCase();
              const groups = {};
              allMatches.forEach((m) => {
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

              return allMatches.map((m) => {
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
                  onClick={() => selectMatch(m)}
                >
                  <MatchCoverThumb src={m.coverUrl} id={m.id} />
                  <div style={{ padding: "8px 10px", textAlign: "left" }}>
                    <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", color: m._matchReason === "isbn" || m._matchReason === "title_author" ? "#1b5e20" : m._matchReason === "pages_exact" ? "#1565c0" : "#888", marginBottom: 2 }}>
                      {m._matchReason === "isbn"
                        ? "✔ Gleiche ISBN · auf Lager"
                        : m._matchReason === "title_author"
                          ? "Gleicher Titel + Autor · auf Lager"
                          : m._matchReason === "pages_exact"
                            ? "Gleiche Seitenzahl"
                            : "Ähnliche Seitenzahl"}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.2 }}>
                      {m.title_display || m.main_title_display || (m.title_keyword ? `Stichwort: ${m.title_keyword}` : "ohne Titel")}
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

    {view === "enrich" ? (
    <div
      className="bfd-enr"
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.preventDefault(); setView("main"); }
      }}
    >
      <div className="bfd-enr-head">
        <button type="button" className="bfd-btn bfd-btn-back" onClick={() => setView("main")} title="Zurück zum Hauptformular (Esc)">
          ‹ Zurück
        </button>
        <div className="bfd-enr-title">
          Enrichment
          <span className="bfd-enr-subtitle">
            {[v.title_display, v.name_display].map((x) => String(x || "").trim()).filter(Boolean).join(" · ") || "neues Buch"}
          </span>
        </div>
      </div>

      <div className="bfd-enr-section">
        <div className="bfd-enr-section-title">Buch</div>
        <div className="bfd-enr-row">
          <label className="bfd-enr-cell" style={{ flex: "1 1 4.6ch" }}>
            <span className="bfd-enr-label">Erscheinungsjahr</span>
            <input
              className="bfd-input bfd-enr-field" ref={enrichFirstRef}
              value={v.year_first_published}
              placeholder="Erscheinungsjahr"
              inputMode="numeric"
              maxLength={4}
              disabled={busy}
              aria-label="Erscheinungsjahr"
              title="Erscheinungsjahr (Erstveröffentlichung)"
              onChange={(e) => setField("year_first_published", String(e.target.value || "").replace(/\D/g, "").slice(0, 4))}
            />
          </label>
          <label className="bfd-enr-cell" style={{ flex: "1 1 5ch" }}>
            <span className="bfd-enr-label">Sprache</span>
            <select
              className="bfd-input bfd-enr-field"
              value={v.language}
              disabled={busy}
              aria-label="Sprache des Buchs"
              title="Sprache des Buchs (leer = Deutsch bei Neuanlage)"
              onChange={(e) => setField("language", e.target.value)}
            >
              <option value="">Sprache</option>
              {v.language && !LANGUAGE_OPTIONS.some((l) => l.value === v.language) ? (
                <option value={v.language}>{v.language}</option>
              ) : null}
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </label>
          <label className="bfd-enr-cell" style={{ flex: "1 1 5ch" }}>
            <span className="bfd-enr-label">Originalsprache</span>
            <select
              className="bfd-input bfd-enr-field"
              value={v.original_language}
              disabled={busy}
              aria-label="Originalsprache"
              title="Originalsprache"
              onChange={(e) => { origLangTouchedRef.current = true; setField("original_language", e.target.value); }}
            >
              <option value="">Originalsprache</option>
              {v.original_language && !LANGUAGE_OPTIONS.some((l) => l.value === v.original_language) ? (
                <option value={v.original_language}>{v.original_language}</option>
              ) : null}
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </label>
        </div>
        {/* Subgenre entfällt: alles außer Fiction / Non-Fiction läuft über Schlagworte (Hauptformular).
            books.sub_genre_id bleibt in der DB und wird hier nicht mehr verändert. */}
      </div>

      <div className="bfd-enr-section">
        <div className="bfd-enr-section-title">Handlungsort</div>
        <div className="bfd-enr-row">
          <label className="bfd-enr-cell" style={{ flex: "1 1 6ch" }}>
            <span className="bfd-enr-label">Region</span>
            <select
              className="bfd-input bfd-enr-field"
              value={v.action_continent}
              disabled={busy}
              aria-label="Region"
              title="Region (Handlungsort)"
              onChange={(e) => setField("action_continent", e.target.value)}
            >
              <option value="">Region</option>
              {REGION_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="bfd-enr-cell" style={{ flex: "1 1 4ch" }}>
            <span className="bfd-enr-label">Land</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.action_country}
              placeholder="Land"
              disabled={busy}
              maxLength={100}
              list="bfd-country-list"
              aria-label="Land"
              title={`Land (Handlungsort) – Kürzel wie D, A, PK oder Name/frei eintippen. Füllt eine leere Region aus.${countryName(v.action_country, v.action_continent) ? ` · ${v.action_country} = ${countryName(v.action_country, v.action_continent)}` : ""}`}
              onChange={(e) => setField("action_country", e.target.value)}
              onBlur={(e) => {
                const n = normalizeCountryInput(e.target.value);
                setV((prev) => {
                  const next = { ...prev };
                  const curRegion = String(prev.action_continent ?? "").trim();
                  // Name passt nicht zur eingetragenen Region (z. B. "Kuba" bei Asien): Text so lassen,
                  // sonst würde aus Kuba ein "C" = China
                  if (n.region != null && curRegion && curRegion !== String(n.region)) return prev;
                  if (n.value !== e.target.value) next.action_country = n.value;
                  // Land -> Region, nur wenn die Region noch leer ist und das Land eindeutig
                  if (n.region != null && !String(prev.action_continent ?? "").trim()) next.action_continent = String(n.region);
                  return next;
                });
              }}
            />
            <datalist id="bfd-country-list">
              {countryList.map((c) => (
                <option key={c.key} value={c.value} label={c.label} />
              ))}
            </datalist>
          </label>
          <label className="bfd-enr-cell" style={{ flex: "1 1 6ch" }}>
            <span className="bfd-enr-label">Bundesland</span>
            <input
              className="bfd-input bfd-enr-field"
              list="bfd-state-list"
              value={v.action_state}
              placeholder="Bundesland"
              disabled={busy}
              maxLength={100}
              aria-label="Bundesland"
              title="Bundesland / Provinz (Handlungsort)"
              onChange={(e) => setField("action_state", e.target.value)}
            />
            <datalist id="bfd-state-list">
              {GERMAN_STATES.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </label>
        </div>
        <div className="bfd-enr-row">
          <label className="bfd-enr-cell" style={{ flex: "1 1 6ch" }}>
            <span className="bfd-enr-label">Stadt</span>
            <input
              className="bfd-input bfd-enr-field"
              list="bfd-city-list"
              value={v.action_city}
              placeholder="Stadt"
              disabled={busy}
              maxLength={100}
              aria-label="Stadt"
              title="Stadt (Handlungsort) – frei eintippen. Bekannte Städte (z. B. Peking) füllen leere Region/Land/Bundesland aus."
              onChange={(e) => setField("action_city", e.target.value)}
              onBlur={(e) => {
                // erst beim Verlassen des Feldes, sonst würde "Bern" beim Tippen von "Bernau" schon die Schweiz setzen
                const place = cityPlace(e.target.value, dbCities);
                if (place) setV((prev) => fillPlaceDefaults(prev, { ...prev }, place));
              }}
            />
            <datalist id="bfd-city-list">
              {cityList.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </label>
          <label className="bfd-enr-cell" style={{ flex: "1 1 6ch" }}>
            <span className="bfd-enr-label">Landschaft</span>
            <input
              className="bfd-input bfd-enr-field"
              list="bfd-landscape-list"
              value={placeTagText(v.landscape_ids, landscapes)}
              placeholder="Landschaft"
              disabled={busy}
              maxLength={200}
              aria-label="Landschaft"
              title={placeTagTitle(v.landscape_ids, landscapes, "Landschaft (Gebirge, Gipfel …) – Vorschlag wählen oder neu eintippen, z. B. „Anden › Cerro Torre“. Füllt leere Region/Land/Bundesland aus.")}
              onChange={(e) => typePlaceTag("landscape_ids", landscapes, e.target.value)}
            />
            <datalist id="bfd-landscape-list">
              {landscapes.map((x) => (
                <option key={x.id} value={x.label} />
              ))}
            </datalist>
          </label>
        </div>
        <div className="bfd-enr-row">
          <label className="bfd-enr-cell" style={{ flex: "1 1 8ch" }}>
            <span className="bfd-enr-label">Fiktiver Ort</span>
            <input
              className="bfd-input bfd-enr-field"
              list="bfd-fictional-list"
              value={v.action_place_fictional}
              placeholder="Fiktiver Ort"
              disabled={busy}
              maxLength={200}
              aria-label="Fiktiver Ort"
              title="Erfundener Ort oder erfundene Welt (z. B. Atlantis, Mittelerde, ein ausgedachtes Dorf). Spielt das Buch ganz in einer erfundenen Welt: Region „Fiktiv“."
              onChange={(e) => setField("action_place_fictional", e.target.value)}
            />
            <datalist id="bfd-fictional-list">
              {dbFictional.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          </label>
        </div>
      </div>

      <div className="bfd-enr-section">
        <div className="bfd-enr-section-title">Handlungszeit</div>
        <div className="bfd-enr-row">
          <label className="bfd-enr-cell" style={{ flex: "1 1 4.6ch" }}>
            <span className="bfd-enr-label">Handlungsjahr</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.action_time_year}
              placeholder="Handlungsjahr"
              inputMode="numeric"
              maxLength={4}
              disabled={busy}
              aria-label="Handlungsjahr"
              title="Jahr, in dem die Handlung spielt (z. B. 1968) – damit werden Epochen über Jahr + Ort erkannt"
              onChange={(e) => setField("action_time_year", String(e.target.value || "").replace(/\D/g, "").slice(0, 4))}
            />
          </label>
          <label className="bfd-enr-cell" style={{ flex: "1 1 8ch" }}>
            <span className="bfd-enr-label">Epoche</span>
            <input
              className="bfd-input bfd-enr-field"
              list="bfd-era-list"
              value={placeTagText(v.time_era_ids, timeEras)}
              placeholder="Epoche"
              disabled={busy}
              maxLength={200}
              aria-label="Epoche"
              title={placeTagTitle(v.time_era_ids, timeEras, "Epoche – Vorschlag wählen oder neu eintippen, z. B. „Weimarer Republik“. Füllt leere Region/Land aus.")}
              onChange={(e) => typePlaceTag("time_era_ids", timeEras, e.target.value)}
            />
            <datalist id="bfd-era-list">
              {timeEras.map((x) => (
                <option key={x.id} value={x.label} label={eraLabel(x)} />
              ))}
            </datalist>
          </label>
        </div>
      </div>

      <div className="bfd-enr-section">
        <div className="bfd-enr-section-title">Autor</div>
        <div className="bfd-enr-row">
          <label className="bfd-enr-cell" style={{ flex: "1 1 4ch" }}>
            <span className="bfd-enr-label">Nationalität</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.author_nationality}
              placeholder="Nationalität Autor"
              disabled={busy}
              maxLength={60}
              list="bfd-country-list"
              aria-label="Nationalität des Autors"
              title={`Nationalität des Autors (Land, z. B. D, RCH, USA – oder Name/frei eintippen)${countryName(v.author_nationality) ? ` · ${v.author_nationality} = ${countryName(v.author_nationality)}` : ""}`}
              onChange={(e) => { nationalityTouchedRef.current = true; setField("author_nationality", e.target.value); }}
              onBlur={(e) => {
                // ohne Region ist "C" mehrdeutig (China/Kuba): solche Namen bleiben ausgeschrieben
                const raw = e.target.value;
                const norm = normalizeCountryInput(raw);
                const n = countryEntry(norm.value) || !countryName(norm.value) ? norm.value : raw.trim();
                if (n !== raw) { nationalityTouchedRef.current = true; setField("author_nationality", n); }
              }}
            />
          </label>
          <label className="bfd-enr-cell" style={{ flex: "1 1 4ch" }}>
            <span className="bfd-enr-label">Geschlecht</span>
            <select
              className="bfd-input bfd-enr-field"
              value={v.male_female}
              disabled={busy}
              aria-label="Geschlecht Autor"
              onChange={(e) => setField("male_female", e.target.value)}
            >
              <option value=""></option>
              {v.male_female && !["male", "female"].includes(v.male_female) ? (
                <option value={v.male_female}>{v.male_female}</option>
              ) : null}
              <option value="male">männlich</option>
              <option value="female">weiblich</option>
            </select>
          </label>
          <label className="bfd-enr-cell" style={{ flex: "1 1 6ch" }}>
            <span className="bfd-enr-label">Geburtsort</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.place_of_birth}
              placeholder="Geburtsort"
              disabled={busy}
              aria-label="Geburtsort"
              maxLength={100}
              onChange={(e) => setField("place_of_birth", e.target.value)}
            />
          </label>
        </div>
        <div className="bfd-enr-row">
          <label className="bfd-enr-cell" style={{ flex: "1 1 5.5ch" }}>
            <span className="bfd-enr-label">Geburtsdatum</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.author_birth_date}
              placeholder="Geburtsdatum Autor"
              disabled={busy}
              maxLength={10}
              aria-label="Geburtsdatum des Autors"
              title="Geburtsdatum des Autors – z. B. 12.04.1947 oder nur 1947"
              onChange={(e) => setField("author_birth_date", String(e.target.value || "").replace(/[^\d.-]/g, "").slice(0, 10))}
            />
          </label>
          <label className="bfd-enr-cell" style={{ flex: "1 1 5.5ch" }}>
            <span className="bfd-enr-label">Todesdatum</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.author_death_date}
              placeholder="Todesdatum Autor"
              disabled={busy}
              maxLength={10}
              aria-label="Todesdatum des Autors"
              title="Todesdatum des Autors – z. B. 03.05.1999 oder nur 1999 (leer = lebt)"
              onChange={(e) => setField("author_death_date", String(e.target.value || "").replace(/[^\d.-]/g, "").slice(0, 10))}
            />
          </label>
        </div>
        <div className="bfd-enr-row">
          <label className="bfd-enr-cell" style={{ flex: "1 1 3.6ch" }}>
            <span className="bfd-enr-label">Veröffentlichte Titel</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.published_titles}
              placeholder="Titel gesamt"
              inputMode="numeric"
              maxLength={5}
              disabled={busy}
              aria-label="Titel gesamt"
              onChange={(e) => setField("published_titles", String(e.target.value || "").replace(/\D/g, "").slice(0, 5))}
            />
          </label>
          <label className="bfd-enr-cell" style={{ flex: "1 1 3.6ch" }}>
            <span className="bfd-enr-label">Millionseller</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.number_of_millionsellers}
              placeholder="Millionseller"
              inputMode="numeric"
              maxLength={4}
              disabled={busy}
              aria-label="Millionseller"
              onChange={(e) => setField("number_of_millionsellers", String(e.target.value || "").replace(/\D/g, "").slice(0, 4))}
            />
          </label>
        </div>
      </div>

      <div className="bfd-enr-section">
        <div className="bfd-enr-section-title">Titel-Stichworte</div>
        <div className="bfd-enr-row">
          <label className="bfd-enr-cell" style={{ flex: "1 1 8ch" }}>
            <span className="bfd-enr-label">Stichwort 1</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.title_keyword}
              placeholder="Stichwort"
              disabled={busy}
              aria-label="Stichwort"
              maxLength={200}
              onChange={(e) => setField("title_keyword", e.target.value)}
            />
          </label>
          <label className="bfd-enr-cell" style={{ flex: "1 1 1.6ch" }}>
            <span className="bfd-enr-label">Pos</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.title_keyword_position}
              placeholder="Pos"
              inputMode="numeric"
              maxLength={2}
              disabled={busy}
              aria-label="Pos"
              onChange={(e) => setField("title_keyword_position", String(e.target.value || "").replace(/\D/g, "").slice(0, 2))}
            />
          </label>
        </div>
        <div className="bfd-enr-row">
          <label className="bfd-enr-cell" style={{ flex: "1 1 8ch" }}>
            <span className="bfd-enr-label">Stichwort 2</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.title_keyword2}
              placeholder="Stichwort 2"
              disabled={busy}
              aria-label="Stichwort 2"
              maxLength={200}
              onChange={(e) => setField("title_keyword2", e.target.value)}
            />
          </label>
          <label className="bfd-enr-cell" style={{ flex: "1 1 1.6ch" }}>
            <span className="bfd-enr-label">Pos</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.title_keyword2_position}
              placeholder="Pos"
              inputMode="numeric"
              maxLength={2}
              disabled={busy}
              aria-label="Pos"
              onChange={(e) => setField("title_keyword2_position", String(e.target.value || "").replace(/\D/g, "").slice(0, 2))}
            />
          </label>
        </div>
        <div className="bfd-enr-row">
          <label className="bfd-enr-cell" style={{ flex: "1 1 8ch" }}>
            <span className="bfd-enr-label">Stichwort 3</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.title_keyword3}
              placeholder="Stichwort 3"
              disabled={busy}
              aria-label="Stichwort 3"
              maxLength={200}
              onChange={(e) => setField("title_keyword3", e.target.value)}
            />
          </label>
          <label className="bfd-enr-cell" style={{ flex: "1 1 1.6ch" }}>
            <span className="bfd-enr-label">Pos</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.title_keyword3_position}
              placeholder="Pos"
              inputMode="numeric"
              maxLength={2}
              disabled={busy}
              aria-label="Pos"
              onChange={(e) => setField("title_keyword3_position", String(e.target.value || "").replace(/\D/g, "").slice(0, 2))}
            />
          </label>
        </div>
      </div>

      <div className="bfd-enr-section">
        <div className="bfd-enr-section-title">Sonstiges</div>
        <div className="bfd-enr-row">
          <label className="bfd-enr-cell" style={{ flex: "1 1 10ch" }}>
            <span className="bfd-enr-label">Kauf-Link</span>
            <input
              className="bfd-input bfd-enr-field"
              value={v.purchase_url}
              placeholder="https://…"
              disabled={busy}
              aria-label="https://…"
              type="url"
              maxLength={1000}
              autoCapitalize="off"
              spellCheck={false}
              onChange={(e) => setField("purchase_url", e.target.value)}
            />
          </label>
        </div>
        <div className="bfd-enr-row">
          <label className="bfd-enr-cell" style={{ flex: "1 1 10ch" }}>
            <span className="bfd-enr-label">Kommentar</span>
            <textarea
              className="bfd-input bfd-enr-field bfd-enr-textarea"
              value={v.comment}
              placeholder="Kommentar"
              disabled={busy}
              aria-label="Kommentar"
              rows={2}
              onChange={(e) => setField("comment", e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
    ) : (
    <>
    <div className="bfd-top-frame">
  <div className="bfd-row">
    <input {...numberProps("width_cm", "Width", "2.8ch")} />
    <input {...numberProps("height_cm", "Height", "2.8ch")} />
    <input {...fieldProps("pages", "Pages", { inputMode: "numeric", style: { width: "3.0ch" }, required: !isEdit, title: "Letzte Seite, die mit einer Seitenzahl bedruckt ist (0 = keine Seitenzahl)" })} />
    <input
      {...fieldProps("page_num_pos", "Pos", { maxLength: 2, autoCapitalize: "off", autoComplete: "off", spellCheck: false, style: { width: "3.0ch" } })}
      title={isValidPageNumPos(v.page_num_pos) ? `Position der Seitenzahl: ${pageNumPosLabel(v.page_num_pos)}` : PAGE_NUM_POS_HELP}
      aria-label="Position der Seitenzahl"
      onChange={(e) => {
        // zwei Zeichen: ol om or / ml mr / ul um ur / 00 (keine Seitenzahl)
        const t = String(e.target.value || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 2);
        if (t === "" || /^[omu0]$/.test(t) || /^(ol|om|or|ml|mr|ul|um|ur|00)$/.test(t)) setField("page_num_pos", t);
      }}
    />
    <input
      {...fieldProps("chapters", "Kap", { inputMode: "numeric", style: { width: "2.8ch" }, required: !isEdit, title: "Anzahl Kapitel (0 = keine Kapitel)" })}
      title="Anzahl Kapitel (leer = 0)"
      aria-label="Anzahl Kapitel"
    />
    <input
      {...fieldProps("last_word", "Wort", { autoCapitalize: "off", autoComplete: "off", spellCheck: false, maxLength: 100, style: { width: "3.6ch" } })}
      title={
        normalizeLastWord(v.last_word)
          ? `Letztes Wort „${String(v.last_word).trim()}“ → ${normalizeLastWord(v.last_word)} in der Buch-Nummer`
          : "Letztes Wort im ganzen Buch (ganzes Wort oder 2 Buchstaben, 00 = kein Text)"
      }
      aria-label="Letztes Wort im ganzen Buch"
    />
    {physCode ? (
      <span
        title={
          physCheck.known.length
            ? physCodeKnownText(physCode, physCheck.known)
            : physCheck.similar.length
              ? similarText(physCheck.similar)
              : "Buch-Nummer: Breite Höhe Seiten Position Kapitel Wort"
        }
        style={{
          fontFamily: "monospace",
          fontSize: 16,
          alignSelf: "center",
          whiteSpace: "nowrap",
          padding: "0 8px",
          color: physCheck.known.length ? "#1d4ed8" : physCheck.similar.length ? "#b45309" : undefined,
          fontWeight: physCheck.known.length || physCheck.similar.length ? 800 : undefined,
        }}
      >
        {formatPhysCode(physCode)}
        {physCheck.known.length ? ` ↺ schon ${physCheck.known.length}× erfasst` : physCheck.checking ? "" : physCheck.similar.length ? " ≈ ähnlich" : " ✓"}
      </span>
    ) : null}

    <span className="bfd-top-fill">
      {barcodePreviewLoading
        ? "Prüfe…"
        : barcodePreview?.candidate
          ? <BookCodeVisual code={barcodePreview.candidate} />
          : ""}
    </span>

    <div className="bfd-genre bfd-stack">
      {genres.map((g) => (
        <button
          key={g.id}
          type="button"
          className={`bfd-stack-field bfd-genre-btn${String(v.genre_id) === g.id ? " is-active" : ""}`}
          disabled={busy}
          aria-pressed={String(v.genre_id) === g.id}
          title={`Genre: ${g.name}`}
          onClick={() => {
            genreTouchedRef.current = true;
            setV((prev) => ({ ...prev, genre_id: g.id }));
          }}
        >
          {g.name}
        </button>
      ))}
    </div>
  </div>

  <div className="bfd-row bfd-tight-row">
    <KeywordsField
      value={v.keywords}
      draft={v.keywords_draft}
      disabled={busy}
      reloadTick={placeListsTick}
      onChange={(names, draft) => setV((prev) => ({ ...prev, keywords: names, keywords_draft: draft }))}
    />
  </div>

  <div className="bfd-row bfd-tight-row">
    <div style={{ display: "flex", alignItems: "stretch", width: "100%", gap: "0.1em" }}>
      <input {...fieldProps("isbn10", "ISBN-10", { className: "bfd-input", style: { flex: "0 0 auto", width: "calc(10ch + 0.06em + 6px)", minWidth: 0 } })} />
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
      <button
        type="button"
        className="bfd-btn bfd-btn-enrich"
        disabled={busy}
        onClick={() => setView("enrich")}
        title="Weitere Angaben: Erscheinungsjahr, Sprache, Handlungsort, Epoche, Autor-Daten, Stichworte …"
      >
        <span>Enrichment ›</span>
        <span className="bfd-enrich-count">
          {enrichCount ? `${enrichCount} ${enrichCount === 1 ? "Wert" : "Werte"} eingetragen` : "Jahr · Land · Epoche …"}
        </span>
      </button>
    </div>
  </div>

  <div className="bfd-row bfd-tight-row">
    <input {...fieldProps("isbn13", "ISBN-13", { className: "bfd-input", style: { flex: "1 1 auto", width: "100%", minWidth: 0 } })} />
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
        <div style={{ display: "flex", alignItems: "stretch", width: "100%", gap: "0.1em" }}>
          <input
            {...fieldProps("number_titles", "#", {
              inputMode: "numeric",
              style: { width: "1.35ch", textAlign: "center", flexShrink: 0 },
            })}
            title="Anzahl Titel in diesem Buch (Sammelband), Standard 1"
            aria-label="Anzahl Titel in diesem Buch"
          />
          <input
            {...fieldProps("title_display", "Title", {
              className: "bfd-input",
              style: { flex: "1 1 0", minWidth: 0, width: 0 },
            })}
          />
        </div>
      </div>

      {Array.from({ length: extraTitleCount(v.number_titles) }, (_, i) => (
        <div className="bfd-row bfd-tight-row" key={`extra-title-${i}`}>
          <input
            className="bfd-input bfd-input-wide"
            placeholder={`Title ${i + 2}`}
            aria-label={`Titel ${i + 2}`}
            value={(v.extra_titles || [])[i] ?? ""}
            disabled={busy}
            onChange={(e) => {
              const val = e.target.value;
              setV((prev) => {
                const list = [...(prev.extra_titles || [])];
                while (list.length < i) list.push("");
                list[i] = val;
                return { ...prev, extra_titles: list };
              });
            }}
          />
        </div>
      ))}

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
    </>
    )}


      <div className="bfd-row">
        <button className="bfd-btn bfd-btn-primary" disabled={busy} type="submit">
          {busy ? "…" : existingMatch?.id ? "Ausgewähltes Buch registrieren" : submitLabel}
        </button>

        <button
          type="button"
          className="bfd-btn bfd-btn-clear"
          disabled={busy}
          onClick={() => {
            requestIdRef.current = null;
            setV({ ...emptyForm }); nationalityTouchedRef.current = false; origLangTouchedRef.current = false; genreTouchedRef.current = false;
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

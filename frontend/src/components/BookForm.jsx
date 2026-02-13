// frontend/src/components/BookForm.jsx
import { useEffect, useMemo, useState } from "react";
import { autocomplete, registerBook, updateBook } from "../api/books";
import { previewBarcode } from "../api/barcodes";
import { useAppContext } from "../context/AppContext";

/* ---------- helpers ---------- */
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function newRequestId() {
  // tiny uuid-ish request id
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

function getBarcodeFromBook(b) {
  if (!b) return "";
  // support common variants
  return b.barcode || b.BMarkb || b.BMark || b.code || b.Barcode || "";
}

const LOCKED_KEYS = new Set([
  "_id",
  "id",
  "__v",
  "createdAt",
  "updatedAt",
  "created_at",
  "updated_at",
  "requestId",
]);

const BARCODE_ALIASES = new Set(["barcode", "bmarkb", "bmark", "code"]);

function isBarcodeKey(k) {
  return BARCODE_ALIASES.has(norm(k));
}

function isLockedKey(k) {
  return LOCKED_KEYS.has(k) || isBarcodeKey(k);
}

function rawForInput(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return "";
    }
  }
  return String(v);
}

function parseFromRaw(original, raw) {
  if (typeof raw === "boolean") return raw;

  const s = String(raw ?? "");
  const trimmed = s.trim();

  if (original === undefined) return s;

  if (typeof original === "string") return s;

  if (typeof original === "number") {
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : original;
  }

  if (typeof original === "boolean") {
    const n = norm(trimmed);
    if (["true", "1", "yes", "y", "ja"].includes(n)) return true;
    if (["false", "0", "no", "n", "nein"].includes(n)) return false;
    return original;
  }

  if (Array.isArray(original)) {
    if (!trimmed) return [];
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  if (typeof original === "object") {
    if (!trimmed) return null;
    try {
      return JSON.parse(s);
    } catch {
      return original; // keep safe
    }
  }

  return s;
}

function deepEqual(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function normalizeStr(v) {
  const s = String(v ?? "").trim();
  return s ? s : "";
}

/* ---------- shared base form shape (single source of truth) ---------- */
const DEFAULT_FORM = {
  BBreite: "",
  BHoehe: "",
  BAutor: "",
  BKw: "",
  BKP: 1,
  BKw1: "",
  BK1P: "",
  BKw2: "",
  BK2P: "",
  BVerlag: "",
  BSeiten: "",
  BTop: false,

  // classification
  isFiction: "", // '', 'true', 'false'
  genre: "",
  subGenre: "",
  themes: "",

  // commerce / identifiers (optional)
  isbn13_raw: "",
  purchase_source: "",
  purchase_url: "",

  // NEW: original language (optional)
  original_language: "",
};

const BASE_KEYS = new Set(Object.keys(DEFAULT_FORM));

export default function BookForm({
  mode = "create", // "create" | "edit"
  bookId = null, // required for edit
  initialBook = null, // book object for edit
  lockBarcode = true,

  // NEW: allow creating wishlist/in_stock placeholders (no barcode)
  assignBarcode = true, // create only: if false, no preview + no barcode field used
  createReadingStatus = "in_progress", // create only: 'in_progress' | 'wishlist' | 'in_stock'

  showUnknownFields = false, // in edit: show fields not in DEFAULT_FORM
  excludeUnknownKeys = ["status"], // avoid duplicating your status UI
  submitLabel = "Speichern",
  onCancel,
  onSuccess, // (info) => void, info = { mode, payload, saved }
}) {
  const { refreshBooks } = useAppContext();

  const [form, setForm] = useState(DEFAULT_FORM);
  const [extra, setExtra] = useState({}); // raw inputs for unknown fields (edit)

  const [suggestedMark, setSuggestedMark] = useState(null);
  const [barcode, setBarcode] = useState(""); // create-mode only (override)

  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [suggestions, setSuggestions] = useState({
    BAutor: [],
    BKw: [],
    BKw1: [],
    BKw2: [],
    BVerlag: [],
  });

  // purchase link enrichment (session-time)
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchaseCandidates, setPurchaseCandidates] = useState([]);
  const [purchaseBest, setPurchaseBest] = useState(null);
  const [purchaseLastIsbn, setPurchaseLastIsbn] = useState("");

  function applyPurchaseCandidate(c) {
    if (!c?.url) return;
    setForm((f) => ({
      ...f,
      purchase_url: c.url,
      purchase_source: c.provider_code || f.purchase_source,
    }));
  }

  async function fetchPurchaseSuggestions() {
    const raw = normalizeStr(form.isbn13_raw);
    if (!raw) return;

    setPurchaseBusy(true);
    setPurchaseError("");
    try {
      const res = await fetch(
        `/api/enrich/isbn?isbn=${encodeURIComponent(raw)}`,
        { credentials: "include" }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "enrich_failed");

      const best = data?.purchase?.best || null;
      const candidates = Array.isArray(data?.purchase?.candidates)
        ? data.purchase.candidates
        : [];

      setPurchaseBest(best);
      setPurchaseCandidates(candidates);
      setPurchaseLastIsbn(raw);
    } catch (err) {
      setPurchaseBest(null);
      setPurchaseCandidates([]);
      setPurchaseError(
        typeof err === "string" ? err : err?.message || "enrich_failed"
      );
    } finally {
      setPurchaseBusy(false);
    }
  }

  // Clear stale candidates when ISBN changes
  useEffect(() => {
    const raw = normalizeStr(form.isbn13_raw);
    if (!raw) {
      setPurchaseBest(null);
      setPurchaseCandidates([]);
      setPurchaseError("");
      setPurchaseLastIsbn("");
      return;
    }
    if (purchaseLastIsbn && raw !== purchaseLastIsbn) {
      setPurchaseBest(null);
      setPurchaseCandidates([]);
      setPurchaseError("");
    }
  }, [form.isbn13_raw]); // eslint-disable-line react-hooks/exhaustive-deps

  // init form in edit mode
  useEffect(() => {
    if (mode !== "edit") return;

    const b = initialBook || {};
    setForm((prev) => ({
      ...prev,
      BBreite: b.BBreite ?? "",
      BHoehe: b.BHoehe ?? "",
      BAutor: b.BAutor ?? a.name_display ?? "",
      BKw: b.BKw ?? b.title_keyword ?? "",
      BKP: b.BKP ?? b.title_keyword_position ?? 1,
      BKw1: b.BKw1 ?? b.title_keyword2 ?? "",
      BK1P: b.BK1P ?? b.title_keyword2_position ?? "",
      BKw2: b.BKw2 ?? b.title_keyword3 ?? "",
      BK2P: b.BK2P ?? b.title_keyword3_position ?? "",
      BVerlag: b.BVerlag ?? b.publisher ?? "",
      BSeiten: b.BSeiten ?? b.pages ?? "",
      BTop: !!(b.BTop ?? b.top_book),

      isFiction:
        b.isFiction === true ? "true" : b.isFiction === false ? "false" : "",
      genre: b.genre ?? "",
      subGenre: b.subGenre ?? b.sub_genre ?? "",
      themes: b.themes ?? "",

      isbn13_raw: b.isbn13_raw ?? b.isbn13 ?? b.isbn10 ?? "",
      purchase_source: b.purchase_source ?? b.purchaseSource ?? "",
      purchase_url: b.purchase_url ?? b.purchaseUrl ?? "",

      original_language: b.original_language ?? b.originalLanguage ?? "",
    }));

    // unknown fields
    if (showUnknownFields) {
      const ex = {};
      const excluded = new Set((excludeUnknownKeys || []).map((k) => norm(k)));

      for (const k of Object.keys(b)) {
        if (isLockedKey(k)) continue;
        if (BASE_KEYS.has(k)) continue;
        if (excluded.has(norm(k))) continue;
        ex[k] = rawForInput(b[k]);
      }
      setExtra(ex);
    } else {
      setExtra({});
    }

    // barcode display (edit)
    setSuggestedMark(null);
    setBarcode("");
    setPreviewError("");

    // purchase suggestion UI reset
    setPurchaseBest(null);
    setPurchaseCandidates([]);
    setPurchaseError("");
    setPurchaseLastIsbn("");
  }, [mode, initialBook, showUnknownFields, excludeUnknownKeys]);

  // derive normalized width/height strings (for create preview + number normalization)
  const normW = useMemo(
    () => (form.BBreite?.toString().trim().replace(",", ".") || ""),
    [form.BBreite]
  );
  const normH = useMemo(
    () => (form.BHoehe?.toString().trim().replace(",", ".") || ""),
    [form.BHoehe]
  );

  const requireDimensions = mode !== "create" ? true : !!assignBarcode;

  // Live preview barcode ONLY in create mode AND only if assignBarcode
  useEffect(() => {
    if (mode !== "create") return;

    if (!assignBarcode) {
      setSuggestedMark(null);
      setBarcode("");
      setPreviewError("");
      return;
    }

    if (!normW || !normH) {
      setSuggestedMark(null);
      setBarcode("");
      setPreviewError("");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const w = parseFloat(normW);
        const h = parseFloat(normH);
        if (!Number.isFinite(w) || !Number.isFinite(h)) return;

        setPreviewBusy(true);
        setPreviewError("");
        const { candidate } = await previewBarcode(w, h);
        const first = candidate ?? null;
        if (!cancelled) {
          setSuggestedMark(first);
          setBarcode((b) => (b ? b : first || ""));
        }
      } catch (err) {
        if (!cancelled) {
          setSuggestedMark(null);
          setPreviewError(
            typeof err === "string"
              ? err
              : err?.message || "Vorschau fehlgeschlagen"
          );
        }
      } finally {
        if (!cancelled) setPreviewBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, normW, normH, assignBarcode]);

  async function handleAutocomplete(field, value) {
    setForm((f) => ({ ...f, [field]: value }));

    const backendField = field === "BKw1" || field === "BKw2" ? "BKw" : field;
    if (value && value.length > 1) {
      try {
        const vals = await autocomplete(backendField, value);
        setSuggestions((s) => ({ ...s, [field]: vals }));
      } catch {
        /* ignore */
      }
    }
  }

  function setField(name) {
    return (e) =>
      setForm((f) => ({
        ...f,
        [name]:
          e.target.type === "checkbox" ? e.target.checked : e.target.value,
      }));
  }

  function fieldKind(k, originalVal, rawVal) {
    if (typeof rawVal === "boolean" || typeof originalVal === "boolean")
      return "boolean";
    if (typeof originalVal === "number") return "number";
    if (Array.isArray(originalVal)) return "array";
    if (typeof originalVal === "object" && originalVal !== null) return "object";
    const s = String(rawVal ?? "").trim();
    if (s.startsWith("{") || s.startsWith("[")) return "object";
    if (String(rawVal ?? "").length > 120) return "textarea";
    return "text";
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);

    try {
      // base normalization
      const payload = {
        ...form,
        BBreite: normW ? Number(normW) : null,
        BHoehe: normH ? Number(normH) : null,
        BKP: Number(form.BKP || 0),
        BK1P: form.BK1P !== "" ? Number(form.BK1P) : null,
        BK2P: form.BK2P !== "" ? Number(form.BK2P) : null,
        BSeiten: form.BSeiten !== "" ? Number(form.BSeiten || 0) : null,

        isFiction: form.isFiction === "" ? null : form.isFiction === "true",
        genre: form.genre?.trim() || null,
        subGenre: form.subGenre?.trim() || null,
        themes: form.themes?.trim() || null,

        isbn13_raw: form.isbn13_raw?.trim() || null,
        purchase_source: form.purchase_source?.trim() || null,
        purchase_url: form.purchase_url?.trim() || null,

        original_language: form.original_language?.trim()
          ? form.original_language.trim().toLowerCase()
          : null,
      };

      // unknown fields (edit)
      if (mode === "edit" && showUnknownFields && initialBook) {
        for (const k of Object.keys(extra || {})) {
          if (isLockedKey(k)) continue;
          const originalVal = initialBook[k];
          const nextVal = parseFromRaw(originalVal, extra[k]);

          // only send if changed
          if (!deepEqual(originalVal, nextVal)) payload[k] = nextVal;
        }
      }

      // validate dims when needed
      if (mode === "create" && assignBarcode) {
        if (!normW || !normH) throw new Error("Bitte Breite und Höhe angeben");
        const w = Number(normW);
        const h = Number(normH);
        if (!Number.isFinite(w) || !Number.isFinite(h))
          throw new Error("Breite/Höhe ungültig");
      }

      if (mode === "create") {
        // status passed to backend
        payload.reading_status = createReadingStatus;
        payload.status = createReadingStatus;

        // barcode only if we are assigning one
        if (assignBarcode) {
          const chosen = (barcode || suggestedMark || "").trim();
          if (chosen) payload.barcode = chosen;
        } else {
          delete payload.barcode;
        }

        payload.requestId = newRequestId();

        const saved = await registerBook(payload);
        refreshBooks?.();
        onSuccess?.({ mode, payload, saved });

        // reset
        setForm(DEFAULT_FORM);
        setSuggestedMark(null);
        setBarcode("");
        setPreviewError("");

        setPurchaseBest(null);
        setPurchaseCandidates([]);
        setPurchaseError("");
        setPurchaseLastIsbn("");
      } else {
        // edit mode: never send barcode
        for (const k of Object.keys(payload)) {
          if (isBarcodeKey(k)) delete payload[k];
        }
        delete payload.barcode;

        if (!bookId) throw new Error("Missing bookId for edit");

        const saved = await updateBook(bookId, payload);
        refreshBooks?.();
        onSuccess?.({ mode, payload, saved });
      }
    } catch (err) {
      alert(
        typeof err === "string"
          ? err
          : err?.message || "Fehler beim Speichern"
      );
    } finally {
      setBusy(false);
    }
  }

  const barcodeDisplay =
    mode === "edit" ? getBarcodeFromBook(initialBook) : barcode;

  const unknownKeys = useMemo(
    () => Object.keys(extra || {}).sort((a, b) => a.localeCompare(b)),
    [extra]
  );

  return (
    <form className="p-4 border rounded space-y-3" onSubmit={onSubmit}>
      <h2 className="text-xl font-bold">
        {mode === "create" ? "Register Book" : "Edit Book"}
      </h2>

      {/* TOP: width/height + suggestion card right next to them */}
      <div className="grid gap-2 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span>Breite (BBreite)</span>
          <input
            type="number"
            required={requireDimensions}
            value={form.BBreite}
            onChange={setField("BBreite")}
            className="border p-2 rounded"
            step="0.1"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span>Höhe (BHoehe)</span>
          <input
            type="number"
            required={requireDimensions}
            value={form.BHoehe}
            onChange={setField("BHoehe")}
            className="border p-2 rounded"
            step="0.1"
          />
        </label>

        <div className="border rounded p-3">
          <div className="text-sm font-semibold">Vorschlag BMark</div>
          <div className="text-lg font-bold mt-1">
            {assignBarcode ? suggestedMark ?? "—" : "—"}
          </div>

          {mode === "create" ? (
            assignBarcode ? (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="border px-3 py-1 rounded"
                  disabled={!suggestedMark}
                  onClick={() => suggestedMark && setBarcode(suggestedMark)}
                >
                  Vorschlag übernehmen
                </button>
                {previewBusy && (
                  <span className="text-gray-500 text-sm">Suche…</span>
                )}
                {previewError && (
                  <span className="text-red-600 text-sm">{previewError}</span>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-600 mt-2">
                Wishlist/In-Stock: Kein Barcode.
              </div>
            )
          ) : (
            <div className="text-sm text-gray-600 mt-2">Nur beim Registrieren.</div>
          )}
        </div>
      </div>

      {/* Rest fields */}
      <div className="grid gap-2 md:grid-cols-2">
        {/* Barcode override / display */}
        <label className="flex flex-col gap-1 md:col-span-2">
          <span>
            {mode === "create"
              ? assignBarcode
                ? "BMark (optional – überschreibt Vorschlag)"
                : "BMark (deaktiviert für Wishlist/In-Stock)"
              : "Barcode (gesperrt)"}
          </span>

          <input
            value={assignBarcode ? barcodeDisplay || "" : ""}
            disabled={mode === "edit" ? lockBarcode : !assignBarcode}
            onChange={(e) => {
              if (mode === "create" && assignBarcode) setBarcode(e.target.value);
            }}
            className="border p-2 rounded"
            placeholder={
              assignBarcode
                ? suggestedMark
                  ? `z.B. ${suggestedMark}`
                  : "z.B. eik202"
                : "—"
            }
          />

          {mode === "create" && assignBarcode ? (
            <small className="text-gray-600">
              Leer lassen, um den vorgeschlagenen freien Barcode zu verwenden.
            </small>
          ) : null}
        </label>

        <label className="flex flex-col gap-1">
          <span>Autor (BAutor)</span>
          <input
            list="autor-list"
            required
            value={form.BAutor}
            onChange={(e) => handleAutocomplete("BAutor", e.target.value)}
            className="border p-2 rounded"
          />
          <datalist id="autor-list">
            {suggestions.BAutor.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1">
          <span>Stichwort (BKw)</span>
          <input
            list="kw-list"
            required
            maxLength={25}
            value={form.BKw}
            onChange={(e) => handleAutocomplete("BKw", e.target.value)}
            className="border p-2 rounded"
          />
          <datalist id="kw-list">
            {suggestions.BKw.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1">
          <span>Position Stichwort (BKP)</span>
          <input
            type="number"
            required
            max={99}
            value={form.BKP}
            onChange={setField("BKP")}
            className="border p-2 rounded"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span>Verlag (BVerlag)</span>
          <input
            list="verlag-list"
            required
            maxLength={25}
            value={form.BVerlag}
            onChange={(e) => handleAutocomplete("BVerlag", e.target.value)}
            className="border p-2 rounded"
          />
          <datalist id="verlag-list">
            {suggestions.BVerlag.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1">
          <span>Seiten (BSeiten)</span>
          <input
            type="number"
            required
            max={9999}
            value={form.BSeiten}
            onChange={setField("BSeiten")}
            className="border p-2 rounded"
          />
        </label>

        {/* ISBN + Purchase */}
        <div className="md:col-span-2 mt-2 border rounded p-3 space-y-2">
          <div className="font-semibold">ISBN &amp; Kauf-Link (optional)</div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span>ISBN (scan/enter)</span>
              <input
                value={form.isbn13_raw}
                onChange={setField("isbn13_raw")}
                className="border p-2 rounded"
                placeholder="ISBN-13 oder ISBN-10"
              />
              <small className="text-gray-600">
                Wenn vorhanden: einscannen/eintippen. Backend speichert daraus
                isbn13/isbn10.
              </small>
            </label>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  type="button"
                  className="border px-3 py-2 rounded"
                  disabled={purchaseBusy || !normalizeStr(form.isbn13_raw)}
                  onClick={fetchPurchaseSuggestions}
                >
                  {purchaseBusy ? "Hole Links…" : "Kauf-Links holen"}
                </button>

                {purchaseBest ? (
                  <button
                    type="button"
                    className="border px-3 py-2 rounded"
                    onClick={() => applyPurchaseCandidate(purchaseBest)}
                  >
                    Besten übernehmen
                  </button>
                ) : null}
              </div>

              {purchaseError ? (
                <div className="text-sm text-red-600">{purchaseError}</div>
              ) : null}

              {purchaseBest ? (
                <div className="text-sm text-gray-700">
                  Vorschlag:{" "}
                  <b>{purchaseBest.provider_name || purchaseBest.provider_code}</b>{" "}
                  <span className="text-gray-500">({purchaseBest.url})</span>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Optional: Links werden aus <code>purchase_providers</code>{" "}
                  Templates erzeugt.
                </div>
              )}
            </div>
          </div>

          {purchaseCandidates.length > 0 ? (
            <div className="mt-2">
              <div className="text-sm font-semibold mb-1">Kandidaten</div>
              <div className="space-y-2">
                {purchaseCandidates.slice(0, 8).map((c) => (
                  <div
                    key={`${c.provider_code}-${c.url}`}
                    className="flex gap-2 items-center"
                  >
                    <div className="min-w-[140px] text-sm">
                      {c.provider_name || c.provider_code}
                    </div>
                    <div className="text-xs text-gray-600 truncate flex-1">
                      {c.url}
                    </div>
                    <button
                      type="button"
                      className="border px-3 py-1 rounded text-sm"
                      onClick={() => applyPurchaseCandidate(c)}
                    >
                      Übernehmen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-2 md:grid-cols-2 mt-2">
            <label className="flex flex-col gap-1">
              <span>purchase_source</span>
              <input
                value={form.purchase_source}
                onChange={setField("purchase_source")}
                className="border p-2 rounded"
                placeholder="z. B. thalia"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span>purchase_url</span>
              <input
                value={form.purchase_url}
                onChange={setField("purchase_url")}
                className="border p-2 rounded"
                placeholder="https://…"
              />
              <small className="text-gray-600">
                Leer lassen ist ok — Backend kann bei gültiger ISBN automatisch
                einen Vorschlag setzen.
              </small>
            </label>
          </div>
        </div>

        {/* Language */}
        <div className="md:col-span-2 mt-2 border rounded p-3 space-y-2">
          <div className="font-semibold">Sprache (optional)</div>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span>Originalsprache</span>
              <input
                value={form.original_language}
                onChange={setField("original_language")}
                className="border p-2 rounded"
                placeholder="z. B. en"
              />
              <small className="text-gray-600">
                2-Buchstaben-Code (z. B. de, en). Leer = unbekannt.
              </small>
            </label>
          </div>
        </div>

        {/* Genre / classification */}
        <div className="md:col-span-2 mt-2 border rounded p-3 space-y-2">
          <div className="font-semibold">Genre / Klassifikation (optional)</div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span>Typ</span>
              <select
                value={form.isFiction}
                onChange={setField("isFiction")}
                className="border p-2 rounded"
              >
                <option value="">Keine Angabe</option>
                <option value="true">Fiction</option>
                <option value="false">Non-Fiction</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span>Genre</span>
              <input
                value={form.genre}
                onChange={setField("genre")}
                className="border p-2 rounded"
                placeholder="z. B. Krimi"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span>Untergenre</span>
              <input
                value={form.subGenre}
                onChange={setField("subGenre")}
                className="border p-2 rounded"
                placeholder="z. B. Thriller"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span>Themen (Tags)</span>
              <input
                value={form.themes}
                onChange={setField("themes")}
                className="border p-2 rounded"
                placeholder="z. B. Bergsteigen, Alpen"
              />
              <small className="text-gray-600">
                Kommagetrennt, z. B. <i>Bergsteigen, Alpen</i>
              </small>
            </label>
          </div>
        </div>

        {/* Optional 2./3. Stichwort */}
        <label className="flex flex-col gap-1">
          <span>2. Stichwort (BKw1)</span>
          <input
            list="kw1-list"
            maxLength={25}
            value={form.BKw1}
            onChange={(e) => handleAutocomplete("BKw1", e.target.value)}
            className="border p-2 rounded"
            placeholder="optional"
          />
          <datalist id="kw1-list">
            {suggestions.BKw1.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1">
          <span>Position 2. Stichwort (BK1P)</span>
          <input
            type="number"
            max={99}
            value={form.BK1P}
            onChange={setField("BK1P")}
            className="border p-2 rounded"
            placeholder="optional"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span>3. Stichwort (BKw2)</span>
          <input
            list="kw2-list"
            maxLength={25}
            value={form.BKw2}
            onChange={(e) => handleAutocomplete("BKw2", e.target.value)}
            className="border p-2 rounded"
            placeholder="optional"
          />
          <datalist id="kw2-list">
            {suggestions.BKw2.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1">
          <span>Position 3. Stichwort (BK2P)</span>
          <input
            type="number"
            max={99}
            value={form.BK2P}
            onChange={setField("BK2P")}
            className="border p-2 rounded"
            placeholder="optional"
          />
        </label>

        <label className="flex items-center gap-2 mt-1 md:col-span-2">
          <input
            type="checkbox"
            checked={form.BTop}
            onChange={setField("BTop")}
          />
          <span>Top-Titel (BTop)</span>
        </label>
      </div>

      {/* Unknown fields (edit-only, optional) */}
      {mode === "edit" &&
      showUnknownFields &&
      initialBook &&
      unknownKeys.length > 0 ? (
        <div className="border rounded p-3 space-y-2">
          <div className="font-semibold">Weitere Felder (optional)</div>

          <div className="grid gap-2 md:grid-cols-2">
            {unknownKeys.map((k) => {
              const originalVal = initialBook[k];
              const rawVal = extra[k];
              const kind = fieldKind(k, originalVal, rawVal);

              return (
                <label key={k} className="flex flex-col gap-1">
                  <span>{k}</span>

                  {kind === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={!!rawVal}
                      onChange={(e) =>
                        setExtra((p) => ({
                          ...(p || {}),
                          [k]: e.target.checked,
                        }))
                      }
                    />
                  ) : kind === "object" ? (
                    <textarea
                      className="border p-2 rounded"
                      style={{ minHeight: 120, fontFamily: "monospace" }}
                      value={String(rawVal ?? "")}
                      onChange={(e) =>
                        setExtra((p) => ({ ...(p || {}), [k]: e.target.value }))
                      }
                    />
                  ) : kind === "textarea" ? (
                    <textarea
                      className="border p-2 rounded"
                      style={{ minHeight: 90 }}
                      value={String(rawVal ?? "")}
                      onChange={(e) =>
                        setExtra((p) => ({ ...(p || {}), [k]: e.target.value }))
                      }
                    />
                  ) : kind === "number" ? (
                    <input
                      type="number"
                      className="border p-2 rounded"
                      value={String(rawVal ?? "")}
                      onChange={(e) =>
                        setExtra((p) => ({ ...(p || {}), [k]: e.target.value }))
                      }
                    />
                  ) : kind === "array" ? (
                    <input
                      className="border p-2 rounded"
                      value={String(rawVal ?? "")}
                      placeholder="Kommagetrennt"
                      onChange={(e) =>
                        setExtra((p) => ({ ...(p || {}), [k]: e.target.value }))
                      }
                    />
                  ) : (
                    <input
                      className="border p-2 rounded"
                      value={String(rawVal ?? "")}
                      onChange={(e) =>
                        setExtra((p) => ({ ...(p || {}), [k]: e.target.value }))
                      }
                    />
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex gap-2 flex-wrap">
        <button
          disabled={busy}
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {busy ? "Speichern…" : submitLabel}
        </button>

        {onCancel ? (
          <button
            type="button"
            disabled={busy}
            className="border px-4 py-2 rounded"
            onClick={onCancel}
          >
            Abbrechen
          </button>
        ) : null}
      </div>
    </form>
  );
}
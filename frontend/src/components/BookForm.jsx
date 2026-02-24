// frontend/src/components/BookForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  autocomplete,
  findDraft,
  lookupIsbn,
  updateBook,
  uploadCover,
} from "../api/books";
import { previewBarcode } from "../api/barcodes";
import { upsertUploadJob, processUploadQueue } from "../utils/uploadQueue";

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

const parseIntOrNull = (s) => {
  const t = String(s ?? "").trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
};

const parseFloatOrNull = (s) => {
  const t = String(s ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/* ---------- ISBN helpers (never block upload) ---------- */
const normalizeIsbnInput = (s) => String(s || "").toUpperCase().replace(/[^0-9X]/g, "");

// Validate ISBN-10 checksum (X allowed only as check digit)
function isValidIsbn10(isbn10) {
  const s = normalizeIsbnInput(isbn10);
  if (s.length !== 10) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = s[i];
    const v = ch === "X" ? 10 : ch >= "0" && ch <= "9" ? Number(ch) : NaN;
    if (!Number.isFinite(v)) return false;
    sum += v * (10 - i);
  }
  return sum % 11 === 0;
}

// Validate ISBN-13 checksum
function isValidIsbn13(isbn13) {
  const s = normalizeIsbnInput(isbn13);
  if (s.length !== 13) return false;
  if (!/^[0-9]{13}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(s[i]);
    sum += d * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(s[12]);
}

// Ensure payload cannot be rejected due to ISBN formatting/validation.
// If ISBN is invalid, move it into isbn13_raw (safe text field) and remove isbn10/isbn13.
function sanitizeIsbnPayload(payload) {
  if (!payload) return;

  const raw13 = payload.isbn13 != null ? String(payload.isbn13).trim() : "";
  const raw10 = payload.isbn10 != null ? String(payload.isbn10).trim() : "";

  // keep exactly what user entered (prefer isbn13 input, else isbn10)
  const rawPreferred = raw13 || raw10;
  if (rawPreferred) payload.isbn13_raw = rawPreferred;

  const n13 = normalizeIsbnInput(raw13);
  const n10 = normalizeIsbnInput(raw10);

  // if valid, keep normalized structured field too
  if (n13 && n13.length === 13 && isValidIsbn13(n13)) {
    payload.isbn13 = n13;
    delete payload.isbn10;
    return;
  }
  if (n10 && n10.length === 10 && isValidIsbn10(n10)) {
    payload.isbn10 = n10;
    delete payload.isbn13;
    return;
  }

  // invalid -> do NOT send invalid isbn10/isbn13 fields (avoid server rejection)
  delete payload.isbn13;
  delete payload.isbn10;
}
function makeRequestId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

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

function splitAuthorName(name) {
  const s = String(name || "").trim();
  if (!s) return { first: "", last: "", display: "" };
  // handle "Last, First"
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
  return {
    first: parts.slice(0, -1).join(" "),
    last: parts.slice(-1)[0],
    display: s,
  };
}

function computeKeywordFromTitle(title) {
  const t = String(title || "").trim();
  if (!t) return { keyword: "", pos: "" };
  const articles = [
    "der",
    "die",
    "das",
    "ein",
    "eine",
    "einer",
    "eines",
    "the",
    "a",
    "an",
    "la",
    "le",
    "les",
    "el",
  ];
  const m = t.match(/^([A-Za-zÄÖÜäöüß]+)\s+(.*)$/);
  if (!m) return { keyword: t, pos: "0" };
  const first = m[1];
  const rest = m[2];
  if (articles.includes(first.toLowerCase())) {
    // BKP as a simple 1-based word offset
    return { keyword: rest.trim(), pos: "1" };
  }
  return { keyword: t, pos: "0" };
}

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
  excludeUnknownKeys = [],
}) {
  const isEdit = mode === "edit";

  const initial = useMemo(() => {
    const b = initialBook || {};
    return {
      barcode: toStr(pick(b, ["barcode", "BMarkb", "BMark", "code"])),

      // author fields
      BAutor: toStr(pick(b, ["BAutor", "author", "author_lastname", "Autor"])),
      author_firstname: toStr(pick(b, ["author_firstname", "authorFirstname"])),
      name_display: toStr(pick(b, ["name_display", "author_name_display"])),

      // book fields
      BVerlag: toStr(pick(b, ["BVerlag", "publisher"])),
      BKw: toStr(pick(b, ["BKw", "title_keyword", "keyword"])),
      BKP: toStr(pick(b, ["BKP", "title_keyword_position"])),
      BKw1: toStr(pick(b, ["BKw1", "title_keyword2"])),
      BK1P: toStr(pick(b, ["BK1P", "title_keyword2_position"])),
      BKw2: toStr(pick(b, ["BKw2", "title_keyword3"])),
      BK2P: toStr(pick(b, ["BK2P", "title_keyword3_position"])),
      BSeiten: toStr(pick(b, ["BSeiten", "pages"])),

      // size (cm) – only needed for barcode suggestion/auto-pick
      BBreite: toStr(pick(b, ["BBreite", "width"])),
      BHoehe: toStr(pick(b, ["BHoehe", "height"])),

      purchase_url: toStr(pick(b, ["purchase_url"])),
      isbn13: toStr(pick(b, ["isbn13"])),
      isbn10: toStr(pick(b, ["isbn10"])),
      original_language: toStr(pick(b, ["original_language"])),
      title_display: toStr(pick(b, ["title_display", "titleDisplay", "title"])),
    };
  }, [initialBook]);

  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const msgRef = useRef(null);
  useEffect(() => {
    if (!msg) return;
    msgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [msg]);

  // iPhone cover capture
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");

  // Draft detection (photo already exists) – used in registration mode
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftCandidates, setDraftCandidates] = useState([]);
  const [draftSelectedId, setDraftSelectedId] = useState("");

  useEffect(() => {
    if (isEdit) return;
    if (!assignBarcode) return;
    if (draftSelectedId) return;

    const isbn = String(v.isbn13 || "").trim() || String(v.isbn10 || "").trim();
    const pagesRaw = String(v.BSeiten || "").trim();
    const code = /^[0-9]+$/.test(pagesRaw) ? pagesRaw : "";

    const isbnClean = normalizeIsbnInput(isbn);
    const hasKey = (isbnClean.length === 10 || isbnClean.length === 13) || !!code;
    if (!hasKey) {
      setDraftCandidates([]);
      return;
    }

    let alive = true;
    const t = setTimeout(() => {
      (async () => {
        try {
          setDraftBusy(true);
          const r = await findDraft({ isbn: isbnClean || undefined, code: code || undefined });
          if (!alive) return;
          const items = Array.isArray(r?.items) ? r.items : Array.isArray(r) ? r : [];
          setDraftCandidates(items);
          if (items.length === 1) setDraftSelectedId(items[0].id);
        } catch {
          if (!alive) return;
          setDraftCandidates([]);
          setDraftSelectedId("");
        } finally {
          if (alive) setDraftBusy(false);
        }
      })();
    }, 350);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [isEdit, assignBarcode, v.isbn13, v.isbn10, v.BSeiten, draftSelectedId]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl("");
      return;
    }
    const u = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [coverFile]);

  // ISBN lookup
  const [isbnBusy, setIsbnBusy] = useState(false);

  // unknown/extra fields
  const knownKeys = useMemo(
    () =>
      new Set([
        "id",
        "_id",
        "createdat",
        "created_at",
        "updatedat",
        "updated_at",
        "registered_at",
        "registeredat",
        "added_at",
        "beind",
        "status",
        "reading_status",
        "reading_status_updated_at",
        "themes",
        "full_title",

        // explicit form keys
        "barcode",
        "bmark",
        "bmarkb",
        "code",
        "bautor",
        "author",
        "author_lastname",
        "author_firstname",
        "name_display",
        "author_name_display",
        "bverlag",
        "publisher",
        "title_display",
        "title",
        "titledisplay",
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
        "isbn13_raw",
        "original_language",

        // explicitly hide size fields (Breite/Höhe)
        "bbreite",
        "bhoehe",
        "width",
        "height",
      ]),
    []
  );

  const [extras, setExtras] = useState({});

  const excludeKey = (excludeUnknownKeys || []).map(String).join("\u0000");

  useEffect(() => {
    setV(initial);

    if (!showUnknownFields) {
      setExtras({});
      return;
    }

    const b = initialBook || {};
    const ex = {};
    const exclude = new Set((excludeUnknownKeys || []).map((k) => String(k)));

    for (const [k, raw] of Object.entries(b)) {
      if (!k) continue;
      if (exclude.has(k)) continue;
      if (knownKeys.has(norm(k))) continue;
      if (k.startsWith("_")) continue;
      if (typeof raw === "object" && raw !== null) continue;
      ex[k] = toStr(raw);
    }
    setExtras(ex);
  }, [initial, initialBook, showUnknownFields, excludeKey, knownKeys]);

  function setField(key, val) {
    setV((p) => ({ ...p, [key]: val }));
  }
  function setExtra(key, val) {
    setExtras((p) => ({ ...p, [key]: val }));
  }

  // light autocomplete
  const [ac, setAc] = useState({ field: "", items: [] });

  // barcode preview (based on BBreite/BHoehe)
  const [barcodePreview, setBarcodePreview] = useState(null);
  const [barcodePreviewErr, setBarcodePreviewErr] = useState("");

  useEffect(() => {
    if (isEdit || !assignBarcode) {
      setBarcodePreview(null);
      setBarcodePreviewErr("");
      return;
    }

    if (String(v.barcode || "").trim()) {
      setBarcodePreview(null);
      setBarcodePreviewErr("");
      return;
    }

    const w = parseFloatOrNull(v.BBreite);
    const h = parseFloatOrNull(v.BHoehe);
    if (!(Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0)) {
      setBarcodePreview(null);
      setBarcodePreviewErr("");
      return;
    }

    let alive = true;
    const t = setTimeout(() => {
      (async () => {
        try {
          setBarcodePreviewErr("");
          const p = await previewBarcode(w, h);
          if (!alive) return;
          setBarcodePreview(p);
        } catch (e) {
          if (!alive) return;
          setBarcodePreview(null);
          setBarcodePreviewErr(e?.message || "Kein Barcode Vorschlag");
        }
      })();
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [isEdit, assignBarcode, v.barcode, v.BBreite, v.BHoehe]);

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

  async function doIsbnLookup() {
    const isbnRaw = String(v.isbn13 || "").trim() || String(v.isbn10 || "").trim();
    const isbn = normalizeIsbnInput(isbnRaw);

    if (!isbn) {
      setMsg("Bitte ISBN eingeben (ISBN-13 oder ISBN-10). ");
      return;
    }

    if (!(isbn.length === 10 || isbn.length === 13)) {
      setMsg("ISBN Format unklar — du kannst trotzdem speichern (wird als raw gespeichert).");
      return;
    }

    setIsbnBusy(true);
    setMsg("");
    try {
      const timeoutMs = 60_000;
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
      );

      const r = await Promise.race([lookupIsbn(isbn), timeout]);
      const s = r?.suggested || {};

      const applyIfEmpty = (key, val) => {
        const cur = String(v[key] ?? "").trim();
        if (cur) return;
        if (val === undefined || val === null) return;
        setField(key, String(val));
      };

      applyIfEmpty("isbn13", s.isbn13);
      applyIfEmpty("isbn10", s.isbn10);
      applyIfEmpty("title_display", s.title_display);
      applyIfEmpty("BVerlag", s.BVerlag);
      applyIfEmpty("BSeiten", s.BSeiten);
      applyIfEmpty("purchase_url", s.purchase_url);
      applyIfEmpty("original_language", s.original_language);

      applyIfEmpty("BAutor", s.BAutor);
      applyIfEmpty("author_firstname", s.author_firstname);
      applyIfEmpty("name_display", s.name_display);

      applyIfEmpty("BKw", s.BKw);
      applyIfEmpty("BKP", s.BKP);

      if (!String(v.BKw || "").trim() && (s.title_display || v.title_display)) {
        const { keyword, pos } = computeKeywordFromTitle(s.title_display || v.title_display);
        if (keyword) setField("BKw", keyword);
        if (pos) setField("BKP", pos);
      }

      if (!String(v.BAutor || "").trim() && (s.author_name || s.name_display)) {
        const { first, last, display } = splitAuthorName(s.author_name || s.name_display);
        if (last) setField("BAutor", last);
        if (first) setField("author_firstname", first);
        if (display) setField("name_display", display);
      }

      setMsg("ISBN gefunden ✔ (Felder wurden ergänzt)");
    } catch (e) {
      if (String(e?.message || e) === "timeout") {
        setMsg("ISBN Suche dauert länger als 1 Minute — du kannst trotzdem speichern (Upload läuft weiter).");
      } else {
        setMsg((e?.message || "ISBN Lookup fehlgeschlagen") + " — Du kannst trotzdem speichern.");
      }
    } finally {
      setIsbnBusy(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    const payload = {};

    if (!isEdit && !assignBarcode && !coverFile) {
      return setMsg("Bitte zuerst ein Cover-Foto aufnehmen.");
    }

    if (!isEdit && assignBarcode && draftCandidates.length > 1 && !draftSelectedId) {
      return setMsg("Mehrere Drafts gefunden – bitte zuerst den richtigen auswählen.");
    }

    if (!isEdit) payload.assign_barcode = !!assignBarcode;

    const addIfChanged = (key, next, prev) => {
      if (next === prev) return;
      payload[key] = next;
    };

    const nextBarcode = v.barcode.trim();
    const suggestedBarcode = String(barcodePreview?.candidate || "").trim();
    const finalBarcode = nextBarcode || suggestedBarcode;

    const wCm = parseFloatOrNull(v.BBreite);
    const hCm = parseFloatOrNull(v.BHoehe);

    if (!isEdit && assignBarcode && !finalBarcode) {
      const ok = Number.isFinite(wCm) && wCm > 0 && Number.isFinite(hCm) && hCm > 0;
      if (!ok)
        return setMsg(
          "Bitte Barcode eingeben ODER Breite + Höhe (cm) angeben, damit ein Barcode automatisch gewählt werden kann."
        );
    }

    if (!lockBarcode && !isEdit && assignBarcode && finalBarcode) payload.barcode = finalBarcode;
    if (!isEdit && Number.isFinite(wCm) && wCm > 0) payload.BBreite = wCm;
    if (!isEdit && Number.isFinite(hCm) && hCm > 0) payload.BHoehe = hCm;

    const strPairs = [
      ["BAutor", v.BAutor, initial.BAutor],
      ["author_firstname", v.author_firstname, initial.author_firstname],
      ["name_display", v.name_display, initial.name_display],
      ["BVerlag", v.BVerlag, initial.BVerlag],
      ["title_display", v.title_display, initial.title_display],
      ["BKw", v.BKw, initial.BKw],
      ["BKw1", v.BKw1, initial.BKw1],
      ["BKw2", v.BKw2, initial.BKw2],
      ["purchase_url", v.purchase_url, initial.purchase_url],
      ["isbn13", v.isbn13, initial.isbn13],
      ["isbn10", v.isbn10, initial.isbn10],
      ["original_language", v.original_language, initial.original_language],
    ];

    for (const [k, nextRaw, prevRaw] of strPairs) {
      const next = nextRaw.trim() ? nextRaw.trim() : null;
      const prev = prevRaw.trim() ? prevRaw.trim() : null;
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
      const nextTrim = String(nextRaw ?? "").trim();
      const prevTrim = String(prevRaw ?? "").trim();

      if (!isEdit) {
        const next = parseIntOrNull(nextTrim);
        if (next !== null) payload[k] = next;
        continue;
      }

      if (!nextTrim) {
        if (prevTrim) payload[k] = null;
        continue;
      }

      const next = parseIntOrNull(nextTrim);
      if (next === null) return setMsg(`${k} ist keine gültige Zahl.`);
      const prev = parseIntOrNull(prevTrim);
      addIfChanged(k, next, prev);
    }

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
      // EDIT stays direct (small & safe)
      if (isEdit) {
        const saved = await updateBook(bookId || initialBook?._id || initialBook?.id, payload);

        const savedId =
          saved?.id ||
          saved?._id ||
          bookId ||
          initialBook?._id ||
          initialBook?.id;

        if (coverFile && savedId) {
          try {
            await uploadCover(savedId, coverFile);
            setCoverFile(null);
          } catch (e) {
            setMsg(`Gespeichert, aber Cover-Upload fehlgeschlagen: ${e?.message || "Fehler"}`);
          }
        }

        onSuccess && onSuccess({ payload, saved });
        setMsg("Gespeichert.");
        return;
      }

      // CREATE/FINALIZE => OFFLINE-FIRST QUEUE (never block user)
      const jobId = makeRequestId();

      const payload2 = { ...payload };
      sanitizeIsbnPayload(payload2);

      payload2.requestId = jobId;

      const job =
        assignBarcode && draftSelectedId
          ? (() => {
              const p2 = { ...payload2 };
              delete p2.assign_barcode;
              return {
                id: jobId,
                flow: "finalize",
                draftId: draftSelectedId,
                payload: p2,
                cover: coverFile || null,
                coverName: coverFile?.name || "cover.jpg",
              };
            })()
          : {
              id: jobId,
              flow: "create",
              payload: payload2,
              cover: coverFile || null,
              coverName: coverFile?.name || "cover.jpg",
            };

      await upsertUploadJob(job);

      setMsg("✅ Lokal gespeichert. Upload läuft im Hintergrund (Warteschlange).");
      setCoverFile(null);

      setV({ ...initial, barcode: "", BBreite: "", BHoehe: "" });
      setExtras({});
      setAc({ field: "", items: [] });
      setBarcodePreview(null);
      setBarcodePreviewErr("");
      setDraftCandidates([]);
      setDraftSelectedId("");

      onSuccess && onSuccess({ payload: payload2, saved: null, queued: true });

      processUploadQueue({ maxJobs: 2 }).catch(() => {});
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
          ref={msgRef}
          className="zr-card"
          style={{
            borderColor: msg.toLowerCase().includes("fehler")
              ? "rgba(200,0,0,0.25)"
              : "rgba(0,0,0,0.12)",
            background: msg.toLowerCase().includes("fehler")
              ? "rgba(200,0,0,0.04)"
              : "rgba(0,0,0,0.02)",
          }}
        >
          {msg}
        </div>
      ) : null}

      {!isEdit && assignBarcode ? (
        draftBusy ? (
          <div className="zr-card" style={{ opacity: 0.85 }}>
            Suche nach vorhandenem Draft (Foto) …
          </div>
        ) : draftCandidates.length ? (
          <div className="zr-card" style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 600 }}>
              {draftCandidates.length === 1
                ? "✅ Draft mit Foto gefunden – Registrierung aktualisiert diesen Eintrag"
                : "Mehrere Drafts gefunden – bitte auswählen"}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {draftCandidates.slice(0, 6).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDraftSelectedId(d.id)}
                  className="zr-card"
                  style={{
                    padding: 8,
                    cursor: "pointer",
                    borderColor: d.id === draftSelectedId ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.12)",
                  }}
                >
                  <img
                    src={d.coverUrl || `/assets/covers/${d.id}.jpg`}
                    alt="cover"
                    style={{ width: 72, height: 96, objectFit: "cover", display: "block" }}
                  />
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                    {String(d.added_at || "").slice(0, 10)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null
      ) : null}

      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Barcode{lockBarcode ? " (gesperrt)" : ""}</span>
          <input
            className="zr-input"
            value={v.barcode}
            disabled={lockBarcode || busy || isEdit}
            onChange={(e) => setField("barcode", e.target.value)}
            placeholder={
              assignBarcode
                ? barcodePreview?.candidate
                  ? `Vorschlag: ${barcodePreview.candidate}`
                  : "z.B. dk444"
                : "(leer)"
            }
          />
        </label>
      </div>

      {!isEdit && assignBarcode ? (
        <div className="zr-card" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>Breite/Höhe für Barcode-Vorschlag (optional)</div>

          <div className="zr-toolbar">
            <label style={{ display: "grid", gap: 6, flex: 1 }}>
              <span>Breite (cm) (BBreite)</span>
              <input
                className="zr-input"
                name="BBreite"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                pattern="[0-9]*[\\.,]?[0-9]*"
                value={v.BBreite}
                onChange={(e) => setField("BBreite", e.target.value)}
                onInput={(e) => setField("BBreite", e.currentTarget.value)}
                placeholder="z.B. 13,5"
                style={{ width: "100%" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, flex: 1 }}>
              <span>Höhe (cm) (BHoehe)</span>
              <input
                className="zr-input"
                name="BHoehe"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                pattern="[0-9]*[\\.,]?[0-9]*"
                value={v.BHoehe}
                onChange={(e) => setField("BHoehe", e.target.value)}
                onInput={(e) => setField("BHoehe", e.currentTarget.value)}
                placeholder="z.B. 21"
                style={{ width: "100%" }}
              />
            </label>
          </div>

          {barcodePreview?.candidate ? (
            <div className="zr-toolbar" style={{ alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>Vorschlag: {barcodePreview.candidate}</div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>
                  Wird beim Speichern automatisch verwendet (wenn das Barcode-Feld leer ist).
                </div>
              </div>
              <button
                type="button"
                className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                disabled={busy || !barcodePreview?.candidate}
                onClick={() => setField("barcode", barcodePreview.candidate)}
              >
                Übernehmen
              </button>
            </div>
          ) : barcodePreviewErr ? (
            <div style={{ opacity: 0.8, fontSize: 13 }}>{barcodePreviewErr}</div>
          ) : null}
        </div>
      ) : null}

      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Cover Foto (iPhone)</div>
        <div style={{ opacity: 0.8, fontSize: 13 }}>
          Tippen → Kamera öffnet sich → Foto wird lokal gespeichert und später hochgeladen.
        </div>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy}
          onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
        />

        {coverPreviewUrl ? (
          <img
            src={coverPreviewUrl}
            alt="Cover preview"
            style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
          />
        ) : null}
      </div>

      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 900, flex: 1 }}>ISBN (optional)</div>
          <button
            type="button"
            className="zr-btn2 zr-btn2--sm"
            disabled={busy || isbnBusy}
            onClick={doIsbnLookup}
            title="Nur Anreicherung — blockiert Speichern NICHT"
          >
            {isbnBusy ? "Suche…" : "ISBN suchen"}
          </button>
        </div>

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
      </div>

      {/* AUTOR */}
      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Autor</div>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Nachname (BAutor)</span>
          <input
            className="zr-input"
            value={v.BAutor}
            onChange={(e) => {
              setField("BAutor", e.target.value);
              runAutocomplete("author", e.target.value);
            }}
            onFocus={() => runAutocomplete("author", v.BAutor)}
          />
        </label>

        {ac.field === "author" && ac.items?.length ? (
          <div className="zr-card" style={{ padding: 8, background: "rgba(0,0,0,0.02)" }}>
            {ac.items.map((it) => (
              <button
                key={it}
                type="button"
                className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                style={{ marginRight: 6, marginBottom: 6 }}
                onClick={() => {
                  setField("BAutor", String(it));
                  setAc({ field: "", items: [] });
                }}
              >
                {it}
              </button>
            ))}
          </div>
        ) : null}

        <label style={{ display: "grid", gap: 6 }}>
          <span>Vorname (author_firstname)</span>
          <input className="zr-input" value={v.author_firstname} onChange={(e) => setField("author_firstname", e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Anzeige-Name (name_display)</span>
          <input className="zr-input" value={v.name_display} onChange={(e) => setField("name_display", e.target.value)} />
        </label>
      </div>

      {/* TITEL / VERLAG */}
      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Buch</div>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Titel (title_display)</span>
          <input
            className="zr-input"
            value={v.title_display}
            onChange={(e) => {
              setField("title_display", e.target.value);
              runAutocomplete("title", e.target.value);
            }}
            onFocus={() => runAutocomplete("title", v.title_display)}
          />
        </label>

        {ac.field === "title" && ac.items?.length ? (
          <div className="zr-card" style={{ padding: 8, background: "rgba(0,0,0,0.02)" }}>
            {ac.items.map((it) => (
              <button
                key={it}
                type="button"
                className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                style={{ marginRight: 6, marginBottom: 6 }}
                onClick={() => {
                  setField("title_display", String(it));
                  setAc({ field: "", items: [] });
                }}
              >
                {it}
              </button>
            ))}
          </div>
        ) : null}

        <label style={{ display: "grid", gap: 6 }}>
          <span>Verlag (BVerlag)</span>
          <input
            className="zr-input"
            value={v.BVerlag}
            onChange={(e) => {
              setField("BVerlag", e.target.value);
              runAutocomplete("publisher", e.target.value);
            }}
            onFocus={() => runAutocomplete("publisher", v.BVerlag)}
          />
        </label>

        {ac.field === "publisher" && ac.items?.length ? (
          <div className="zr-card" style={{ padding: 8, background: "rgba(0,0,0,0.02)" }}>
            {ac.items.map((it) => (
              <button
                key={it}
                type="button"
                className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                style={{ marginRight: 6, marginBottom: 6 }}
                onClick={() => {
                  setField("BVerlag", String(it));
                  setAc({ field: "", items: [] });
                }}
              >
                {it}
              </button>
            ))}
          </div>
        ) : null}

        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Seiten (BSeiten)</span>
            <input className="zr-input" value={v.BSeiten} onChange={(e) => setField("BSeiten", e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Originalsprache (original_language)</span>
            <input className="zr-input" value={v.original_language} onChange={(e) => setField("original_language", e.target.value)} />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Kauf-Link (purchase_url)</span>
          <input className="zr-input" value={v.purchase_url} onChange={(e) => setField("purchase_url", e.target.value)} />
        </label>
      </div>

      {/* KEYWORDS */}
      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Keywords</div>

        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>BKw</span>
            <input className="zr-input" value={v.BKw} onChange={(e) => setField("BKw", e.target.value)} />
          </label>
          <label style={{ display: "grid", gap: 6, width: 120 }}>
            <span>BKP</span>
            <input className="zr-input" value={v.BKP} onChange={(e) => setField("BKP", e.target.value)} />
          </label>
        </div>

        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>BKw1</span>
            <input className="zr-input" value={v.BKw1} onChange={(e) => setField("BKw1", e.target.value)} />
          </label>
          <label style={{ display: "grid", gap: 6, width: 120 }}>
            <span>BK1P</span>
            <input className="zr-input" value={v.BK1P} onChange={(e) => setField("BK1P", e.target.value)} />
          </label>
        </div>

        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>BKw2</span>
            <input className="zr-input" value={v.BKw2} onChange={(e) => setField("BKw2", e.target.value)} />
          </label>
          <label style={{ display: "grid", gap: 6, width: 120 }}>
            <span>BK2P</span>
            <input className="zr-input" value={v.BK2P} onChange={(e) => setField("BK2P", e.target.value)} />
          </label>
        </div>
      </div>

      {/* Unknown fields (edit-only) */}
      {isEdit && showUnknownFields && Object.keys(extras || {}).length ? (
        <div className="zr-card" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>Weitere Felder</div>
          {Object.entries(extras).map(([k, val]) => (
            <label key={k} style={{ display: "grid", gap: 6 }}>
              <span>{k}</span>
              <input className="zr-input" value={val} onChange={(e) => setExtra(k, e.target.value)} />
            </label>
          ))}
        </div>
      ) : null}

      <div className="zr-toolbar" style={{ marginTop: 4 }}>
        <button className="zr-btn2 zr-btn2--primary" disabled={busy} type="submit">
          {busy ? "…" : submitLabel}
        </button>
        {onCancel ? (
          <button
            className="zr-btn2 zr-btn2--ghost"
            type="button"
            onClick={onCancel}
            disabled={busy}
          >
            Abbrechen
          </button>
        ) : null}
      </div>
    </form>
  );
}
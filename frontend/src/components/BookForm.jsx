import React, { useEffect, useMemo, useRef, useState } from "react";
import { createWorker, PSM } from "tesseract.js";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { lookupIsbn, registerBook, updateBook, uploadCover } from "../api/books";
import {
  deleteUploadJob,
  getPendingUploadCount,
  processUploadQueue,
  upsertUploadJob,
} from "../utils/uploadQueue";
import { startIsbnScanner } from "../utils/isbnScanner";

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

/* ---------- ISBN helpers ---------- */
function stripIsbn(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^0-9X]/g, "");
}

function extractIsbnCandidate(raw) {
  const s = stripIsbn(raw);

  const bookland = s.match(/97[89]\d{10}/);
  if (bookland) return bookland[0];

  const ean13 = s.match(/\d{13}/);
  if (ean13) return ean13[0];

  const isbn10 = s.match(/\d{9}[0-9X]/);
  if (isbn10) return isbn10[0];

  return "";
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

function findIsbnInText(text) {
  const s = String(text || "").toUpperCase().replace(/[^0-9X]/g, " ");

  const m13 = s.match(/97[89][0-9 ]{10,20}/g) || [];
  for (const chunk of m13) {
    const digits = chunk.replace(/[^0-9]/g, "");
    for (let i = 0; i <= digits.length - 13; i++) {
      const cand = digits.slice(i, i + 13);
      if (isValidIsbn13(cand)) return cand;
    }
  }

  const m10 = s.match(/[0-9X ]{10,20}/g) || [];
  for (const chunk of m10) {
    const digits = chunk.replace(/[^0-9X]/g, "");
    for (let i = 0; i <= digits.length - 10; i++) {
      const cand = digits.slice(i, i + 10);
      if (isValidIsbn10(cand)) return cand;
    }
  }

  return "";
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
    "der", "die", "das", "ein", "eine", "einer", "eines",
    "the", "a", "an", "la", "le", "les", "el",
  ];
  const m = t.match(/^([A-Za-zÄÖÜäöüß]+)\s+(.*)$/);
  if (!m) return { keyword: t, pos: "0" };
  const first = m[1];
  const rest = m[2];
  if (articles.includes(first.toLowerCase())) {
    return { keyword: rest.trim(), pos: "1" };
  }
  return { keyword: t, pos: "0" };
}

/* ---------- image helpers ---------- */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht geladen werden."));
    };
    img.src = url;
  });
}

function imageToCanvas(img, maxEdge = 1800) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas konnte nicht initialisiert werden.");

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function cropCanvas(src, { x, y, width, height }) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas konnte nicht initialisiert werden.");
  ctx.drawImage(
    src,
    Math.round(x),
    Math.round(y),
    Math.round(width),
    Math.round(height),
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas;
}

function rotateCanvas(src, degrees) {
  const deg = ((degrees % 360) + 360) % 360;
  if (deg === 0) return src;

  const swap = deg === 90 || deg === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? src.height : src.width;
  canvas.height = swap ? src.width : src.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas konnte nicht initialisiert werden.");

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);

  return canvas;
}

async function normalizeCoverFile(file, maxEdge = 1600, quality = 0.78) {
  const img = await loadImageFromFile(file);
  const canvas = imageToCanvas(img, maxEdge);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Bild konnte nicht komprimiert werden."))),
      "image/jpeg",
      quality
    );
  });

  const name = String(file?.name || "cover.jpg").replace(/\.[^.]+$/, ".jpg");
  return new File([blob], name, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/* ---------- barcode / isbn from photo ---------- */
async function tryDecodeCanvas(canvas) {
  if ("BarcodeDetector" in globalThis) {
    try {
      const supported =
        typeof globalThis.BarcodeDetector?.getSupportedFormats === "function"
          ? await globalThis.BarcodeDetector.getSupportedFormats().catch(() => [])
          : [];

      const wanted = ["ean_13", "ean_8", "upc_a", "upc_e"];
      const formats = wanted.filter((f) => supported.includes(f));

      const detector = formats.length
        ? new globalThis.BarcodeDetector({ formats })
        : new globalThis.BarcodeDetector();

      const found = await detector.detect(canvas);
      for (const item of found || []) {
        const isbn = extractIsbnCandidate(item?.rawValue || "");
        if (isbn) return isbn;
      }
    } catch {
      // ignore
    }
  }

  const reader = new BrowserMultiFormatReader();
  try {
    const dataUrl = canvas.toDataURL("image/png");
    const result = await reader.decodeFromImageUrl(dataUrl);
    const raw = result?.getText?.() || result?.text || "";
    const isbn = extractIsbnCandidate(raw);
    if (isbn) return isbn;
  } catch {
    // ignore
  } finally {
    try {
      reader.reset?.();
    } catch {
      // ignore
    }
  }

  return "";
}

async function decodeIsbnFromImageFile(file) {
  const img = await loadImageFromFile(file);
  const full = imageToCanvas(img, 3200);
  const w = full.width;
  const h = full.height;

  const regions = [
    full,
    cropCanvas(full, { x: 0, y: Math.round(h * 0.45), width: w, height: Math.round(h * 0.55) }),
    cropCanvas(full, { x: 0, y: Math.round(h * 0.6), width: w, height: Math.round(h * 0.4) }),
    cropCanvas(full, {
      x: Math.round(w * 0.05),
      y: Math.round(h * 0.5),
      width: Math.round(w * 0.9),
      height: Math.round(h * 0.4),
    }),
    cropCanvas(full, {
      x: Math.round(w * 0.1),
      y: Math.round(h * 0.65),
      width: Math.round(w * 0.8),
      height: Math.round(h * 0.25),
    }),
  ];

  const attempts = [];
  for (const region of regions) {
    attempts.push(region);
    attempts.push(rotateCanvas(region, 90));
    attempts.push(rotateCanvas(region, 180));
    attempts.push(rotateCanvas(region, 270));
  }

  for (const canvas of attempts) {
    const isbn = await tryDecodeCanvas(canvas);
    if (isbn) return isbn;
  }

  const worker = await createWorker("eng");
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: "0123456789Xx- ",
    });

    const bottom = cropCanvas(full, {
      x: Math.round(w * 0.05),
      y: Math.round(h * 0.7),
      width: Math.round(w * 0.9),
      height: Math.round(h * 0.25),
    });

    const res = await worker.recognize(bottom);
    const isbn = findIsbnInText(res?.data?.text || "");
    if (isbn) return isbn;
  } finally {
    await worker.terminate();
  }

  throw new Error("Kein ISBN-Barcode im Foto erkannt. Bitte den Barcode groß und nah fotografieren.");
}

export default function BookForm({
  mode = "create",
  bookId,
  initialBook,
  lockBarcode = false,
  assignBarcode = false,
  createReadingStatus,
  submitLabel = mode === "create" ? "Speichern" : "Aktualisieren",
  onCancel,
  onSuccess,
}) {
  const isEdit = mode === "edit";

  const initial = useMemo(() => {
    const b = initialBook || {};
    return {
      barcode: toStr(pick(b, ["barcode", "BMarkb", "BMark", "code"])),
      author_id: toStr(pick(b, ["author_id"])),
      publisher_id: toStr(pick(b, ["publisher_id"])),

      author_lastname: toStr(pick(b, ["author_lastname"])),
      author_firstname: toStr(pick(b, ["author_firstname"])),
      name_display: toStr(pick(b, ["name_display", "author_name_display"])),
      author_abbreviation: toStr(pick(b, ["author_abbreviation", "abbreviation"])),
      published_titles: toStr(pick(b, ["published_titles"])),
      number_of_millionsellers: toStr(pick(b, ["number_of_millionsellers"])),
      author_nationality: toStr(pick(b, ["author_nationality"])),
      place_of_birth: toStr(pick(b, ["place_of_birth"])),
      male_female: toStr(pick(b, ["male_female"])),

      publisher_name_display: toStr(pick(b, ["publisher_name_display"])),
      publisher_abbr: toStr(pick(b, ["publisher_abbr"])),
      title_keyword: toStr(pick(b, ["title_keyword", "keyword"])),
      title_keyword_position: toStr(pick(b, ["title_keyword_position"])),
      title_keyword2: toStr(pick(b, ["title_keyword2"])),
      title_keyword2_position: toStr(pick(b, ["title_keyword2_position"])),
      title_keyword3: toStr(pick(b, ["title_keyword3"])),
      title_keyword3_position: toStr(pick(b, ["title_keyword3_position"])),
      pages: toStr(pick(b, ["pages"])),

      width_cm: toStr(pick(b, ["width_cm", "width"])),
      height_cm: toStr(pick(b, ["height_cm", "height"])),

      purchase_url: toStr(pick(b, ["purchase_url"])),
      isbn13: toStr(pick(b, ["isbn13"])),
      isbn10: toStr(pick(b, ["isbn10"])),
      original_language: toStr(pick(b, ["original_language"])),
      title_display: toStr(pick(b, ["title_display", "titleDisplay", "title"])),
      subtitle_display: toStr(pick(b, ["subtitle_display"])),
      comment: toStr(pick(b, ["comment"])),
    };
  }, [initialBook]);

  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [coverPrepBusy, setCoverPrepBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const isbnPhotoInputRef = useRef(null);
  const isbnVideoRef = useRef(null);
  const stopIsbnScannerRef = useRef(() => {});
  const [scanBusy, setScanBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const [isbnBusy, setIsbnBusy] = useState(false);

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");

  const [pendingUploads, setPendingUploads] = useState(0);
  const refreshPending = async () => {
    try {
      setPendingUploads(await getPendingUploadCount());
    } catch {
      // ignore
    }
  };

  

  const msgRef = useRef(null);

  useEffect(() => {
    refreshPending();
  }, []);

  useEffect(() => {
    if (!msg) return;
    msgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [msg]);

  useEffect(() => {
    return () => {
      try {
        stopIsbnScannerRef.current?.();
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl("");
      return;
    }
    const u = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [coverFile]);

  useEffect(() => {
    if (scannerOpen && isbnVideoRef.current) {
      let cancelled = false;
      let stop = () => {};

      setScanBusy(true);
      setScannerStarting(true);
      setMsg("");

      (async () => {
        try {
          stop = await startIsbnScanner({
            videoEl: isbnVideoRef.current,
            onDetected: async (isbn) => {
              if (cancelled) return;
              await handleLiveDetectedIsbn(isbn);
            },
          });

          if (cancelled) {
            stop?.();
            return;
          }

          stopIsbnScannerRef.current = stop || (() => {});
        } catch (err) {
          if (!cancelled) {
            closeIsbnScanner();
            setMsg(err?.message || "Scanner konnte nicht gestartet werden.");
          }
        } finally {
          if (!cancelled) setScannerStarting(false);
        }
      })();

      return () => {
        cancelled = true;
        try {
          stop?.();
        } catch {
          // ignore
        }
        stopIsbnScannerRef.current = () => {};
      };
    }
  }, [scannerOpen]);

  

  function setField(key, val) {
    setV((prev) => ({ ...prev, [key]: val }));
  }

  async function fillFromLookup(isbn) {
    setIsbnBusy(true);
    setMsg("");

    try {
      const r = await lookupIsbn(isbn);
      const s = r?.suggested || r || {};

      const title = s.title_display || s.title || "";
      const authorDisplay =
        s.name_display ||
        s.author_name_display ||
        (Array.isArray(s.authors) ? s.authors.filter(Boolean).join(", ") : "") ||
        "";

      let changed = false;

      setV((prev) => {
        const next = { ...prev };

        if (!String(prev.isbn13 || "").trim() && s.isbn13) {
          next.isbn13 = String(s.isbn13);
          changed = true;
        }
        if (!String(prev.isbn10 || "").trim() && s.isbn10) {
          next.isbn10 = String(s.isbn10);
          changed = true;
        }
        if (!String(prev.title_display || "").trim() && title) {
          next.title_display = String(title);
          changed = true;
        }
        if (!String(prev.subtitle_display || "").trim() && String(s.subtitle_display || "").trim()) {
          next.subtitle_display = String(s.subtitle_display).trim();
          changed = true;
        }
        if (!String(prev.pages || "").trim() && s.pages != null) {
          next.pages = String(s.pages);
          changed = true;
        }
        if (!String(prev.purchase_url || "").trim() && String(s.purchase_url || s.url || "").trim()) {
          next.purchase_url = String(s.purchase_url || s.url).trim();
          changed = true;
        }
        if (!String(prev.original_language || "").trim() && String(s.original_language || s.language || "").trim()) {
          next.original_language = String(s.original_language || s.language).trim();
          changed = true;
        }
        if (!String(prev.publisher_id || "").trim() && String(s.publisher_id || "").trim()) {
          next.publisher_id = String(s.publisher_id).trim();
          changed = true;
        }
        if (!String(prev.publisher_name_display || "").trim() && String(s.publisher_name_display || "").trim()) {
          next.publisher_name_display = String(s.publisher_name_display).trim();
          changed = true;
        }
        if (!String(prev.publisher_abbr || "").trim() && String(s.publisher_abbr || "").trim()) {
          next.publisher_abbr = String(s.publisher_abbr).trim();
          changed = true;
        }

        const { first, last, display } = splitAuthorName(authorDisplay);
        if (!String(prev.author_id || "").trim() && String(s.author_id || "").trim()) {
          next.author_id = String(s.author_id).trim();
          changed = true;
        }
        if (!String(prev.author_lastname || "").trim() && (s.author_lastname || last)) {
          next.author_lastname = String(s.author_lastname || last).trim();
          changed = true;
        }
        if (!String(prev.author_firstname || "").trim() && (s.author_firstname || first)) {
          next.author_firstname = String(s.author_firstname || first).trim();
          changed = true;
        }
        if (!String(prev.name_display || "").trim() && (s.name_display || display)) {
          next.name_display = String(s.name_display || display).trim();
          changed = true;
        }
        if (!String(prev.author_abbreviation || "").trim() && String(s.author_abbreviation || "").trim()) {
          next.author_abbreviation = String(s.author_abbreviation).trim();
          changed = true;
        }
        if (!String(prev.author_nationality || "").trim() && String(s.author_nationality || "").trim()) {
          next.author_nationality = String(s.author_nationality).trim();
          changed = true;
        }
        if (!String(prev.place_of_birth || "").trim() && String(s.place_of_birth || "").trim()) {
          next.place_of_birth = String(s.place_of_birth).trim();
          changed = true;
        }
        if (!String(prev.male_female || "").trim() && String(s.male_female || "").trim()) {
          next.male_female = String(s.male_female).trim();
          changed = true;
        }
        if (!String(prev.published_titles || "").trim() && s.published_titles != null) {
          next.published_titles = String(s.published_titles);
          changed = true;
        }
        if (!String(prev.number_of_millionsellers || "").trim() && s.number_of_millionsellers != null) {
          next.number_of_millionsellers = String(s.number_of_millionsellers);
          changed = true;
        }

        const titleForKeyword = title || prev.title_display;
        if (!String(prev.title_keyword || "").trim() && titleForKeyword) {
          const { keyword, pos } = computeKeywordFromTitle(titleForKeyword);
          if (keyword) {
            next.title_keyword = keyword;
            changed = true;
          }
          if (!String(prev.title_keyword_position || "").trim() && pos) {
            next.title_keyword_position = pos;
            changed = true;
          }
        }

        return next;
      });

      setMsg(
        changed
          ? "ISBN gefunden ✔ (Felder wurden ergänzt)"
          : "ISBN gefunden, aber es kamen nur wenige Metadaten zurück."
      );
    } catch (e) {
      setMsg(e?.message || "ISBN Lookup fehlgeschlagen");
    } finally {
      setIsbnBusy(false);
    }
  }

  async function doIsbnLookup() {
    const n = normalizeIsbnInputs(v.isbn13, v.isbn10);
    const isbn = n.isbn13 || n.isbn10 || "";

    if (!isbn) {
      setMsg("Bitte ISBN eingeben.");
      return;
    }

    if (!n.lookupOk) {
      setMsg("ISBN sieht ungültig aus. Du kannst trotzdem speichern.");
      return;
    }

    await fillFromLookup(isbn);
  }

  function closeIsbnScanner() {
    try {
      stopIsbnScannerRef.current?.();
    } catch {
      // ignore
    }
    stopIsbnScannerRef.current = () => {};
    setScannerOpen(false);
    setScannerStarting(false);
    setScanBusy(false);
  }

  function openIsbnPhotoFallback() {
    closeIsbnScanner();
    setTimeout(() => {
      isbnPhotoInputRef.current?.click();
    }, 50);
  }

  async function handleLiveDetectedIsbn(isbn) {
    const n = normalizeIsbnInputs(isbn, isbn);

    try {
      navigator.vibrate?.(60);
    } catch {
      // ignore
    }

    setV((prev) => ({
      ...prev,
      isbn13: n.isbn13 || prev.isbn13,
      isbn10: n.isbn10 || prev.isbn10,
    }));

    closeIsbnScanner();
    setMsg(`ISBN erkannt: ${isbn}`);

    if (n.lookupOk) {
      await fillFromLookup(isbn);
    }
  }

  function openIsbnScanner() {
    if (busy || scanBusy || coverPrepBusy || scannerOpen) return;
    setMsg("");
    setScannerOpen(true);
  }

  async function handleIsbnPhotoChange(e) {
    const file = e.target.files?.[0] || null;
    e.target.value = "";
    if (!file) return;

    setScanBusy(true);
    setMsg("");

    try {
      const isbn = await decodeIsbnFromImageFile(file);
      const n = normalizeIsbnInputs(isbn, isbn);

      setV((prev) => ({
        ...prev,
        isbn13: n.isbn13 || prev.isbn13,
        isbn10: n.isbn10 || prev.isbn10,
      }));

      setMsg(`ISBN erkannt: ${isbn}`);

      if (n.lookupOk) {
        await fillFromLookup(isbn);
      }
    } catch (err) {
      setMsg(err?.message || "ISBN konnte aus dem Foto nicht gelesen werden.");
    } finally {
      setScanBusy(false);
    }
  }

  async function handleCoverChange(e) {
    const raw = e.target.files?.[0] || null;
    if (!raw) return;

    setCoverPrepBusy(true);

    try {
      const normalized = await normalizeCoverFile(raw, 1600, 0.78);
      if ((normalized.size ?? 0) < 1024) {
        setMsg("Cover-Foto ist leer oder zu klein. Bitte erneut aufnehmen.");
        setCoverFile(null);
        return;
      }
      setCoverFile(normalized);
    } catch (err) {
      setMsg(err?.message || "Cover-Foto konnte nicht vorbereitet werden.");
      setCoverFile(null);
    } finally {
      setCoverPrepBusy(false);
    }
  }

  function buildPayload() {
    const payload = {};

    const strPairs = [
      ["author_lastname", v.author_lastname],
      ["author_firstname", v.author_firstname],
      ["name_display", v.name_display],
      ["author_abbreviation", v.author_abbreviation],
      ["author_nationality", v.author_nationality],
      ["place_of_birth", v.place_of_birth],
      ["male_female", v.male_female],
      ["publisher_name_display", v.publisher_name_display],
      ["publisher_abbr", v.publisher_abbr],
      ["title_display", v.title_display],
      ["subtitle_display", v.subtitle_display],
      ["title_keyword", v.title_keyword],
      ["title_keyword2", v.title_keyword2],
      ["title_keyword3", v.title_keyword3],
      ["purchase_url", v.purchase_url],
      ["original_language", v.original_language],
      ["comment", v.comment],
    ];

    for (const [k, raw] of strPairs) {
      const value = String(raw || "").trim();
      if (value) payload[k] = value;
    }

    if (String(v.author_id || "").trim()) payload.author_id = String(v.author_id).trim();
    if (String(v.publisher_id || "").trim()) payload.publisher_id = String(v.publisher_id).trim();

    const isbnN = normalizeIsbnInputs(v.isbn13, v.isbn10);
    if (isbnN.isbn13) payload.isbn13 = isbnN.isbn13;
    if (isbnN.isbn10) payload.isbn10 = isbnN.isbn10;
    if (!isbnN.isbn13 && !isbnN.isbn10 && isbnN.raw) payload.isbn13_raw = isbnN.raw;

    const pages = parseIntOrNull(v.pages);
    if (pages !== null) payload.pages = pages;

    const tk1 = parseIntOrNull(v.title_keyword_position);
    const tk2 = parseIntOrNull(v.title_keyword2_position);
    const tk3 = parseIntOrNull(v.title_keyword3_position);
    const pubTitles = parseIntOrNull(v.published_titles);
    const sellers = parseIntOrNull(v.number_of_millionsellers);

    if (tk1 !== null) payload.title_keyword_position = tk1;
    if (tk2 !== null) payload.title_keyword2_position = tk2;
    if (tk3 !== null) payload.title_keyword3_position = tk3;
    if (pubTitles !== null) payload.published_titles = pubTitles;
    if (sellers !== null) payload.number_of_millionsellers = sellers;

    return payload;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (coverPrepBusy) {
      setMsg("Cover wird noch vorbereitet. Bitte kurz warten.");
      return;
    }

    if (!coverFile && !isEdit) {
      setMsg("Bitte zuerst ein Cover-Foto aufnehmen.");
      return;
    }

    const payload = buildPayload();
    if (!isEdit && createReadingStatus) payload.reading_status = createReadingStatus;
    if (!isEdit) payload.assign_barcode = false;

    let jobId = null;

    if (!isEdit) {
      jobId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

      await upsertUploadJob({
        id: jobId,
        createdAt: Date.now(),
        status: "pending",
        retries: 0,
        flow: "create",
        payload: { ...payload, requestId: jobId },
        step: "create",
        cover: coverFile || null,
        coverName: coverFile?.name || "cover.jpg",
      });
      refreshPending();
    }

    setBusy(true);
    try {
      let saved;
      if (isEdit) {
        saved = await updateBook(bookId || initialBook?._id || initialBook?.id, payload);
      } else {
        const p2 = jobId ? { ...payload, requestId: jobId } : payload;
        saved = await registerBook(p2);
      }

      const savedId = saved?.id || saved?._id || bookId || initialBook?._id || initialBook?.id;

      if (jobId) {
        if (coverFile && savedId) {
          await upsertUploadJob({
            id: jobId,
            createdAt: Date.now(),
            status: "pending",
            retries: 0,
            flow: "create",
            payload: { ...payload, requestId: jobId },
            step: "cover",
            savedId,
            cover: coverFile,
            coverName: coverFile?.name || "cover.jpg",
          });
        } else {
          await deleteUploadJob(jobId);
        }
        refreshPending();
      }

      let coverUploadFailed = false;
      if (coverFile && savedId) {
        try {
          await uploadCover(savedId, coverFile);
          setCoverFile(null);
          if (jobId) await deleteUploadJob(jobId);
          refreshPending();
        } catch (err) {
          coverUploadFailed = true;
          setMsg(
            `${isEdit ? "Gespeichert" : "Gespeichert"}, aber Cover-Upload fehlgeschlagen: ${
              err?.message || "Fehler"
            }`
          );
        }
      }

      onSuccess && onSuccess({ payload, saved });

      if (!coverUploadFailed) {
        setMsg(isEdit ? "Gespeichert." : "Gespeichert ✔");
      }

      if (!isEdit) {
        setV({
          ...initial,
          isbn13: "",
          isbn10: "",
          pages: "",
        });
      }
    } catch (err) {
      setMsg(
        `${err?.message || "Fehler beim Speichern"}. ` +
          (jobId
            ? "Sicherheitsnetz aktiv: Daten wurden lokal gespeichert und können später erneut hochgeladen werden."
            : "")
      );
    } finally {
      setBusy(false);
      try {
        await processUploadQueue({ maxJobs: 10 });
      } catch {
        // ignore
      }
      refreshPending();
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate style={ display: "grid", gap: 12 }>
      <h2 style={ margin: 0 }>{isEdit ? "Edit Book" : "Register Book"}</h2>

      {msg ? (
        <div
          ref={msgRef}
          className="zr-card"
          style={
            borderColor: msg.toLowerCase().includes("fehler")
              ? "rgba(200,0,0,0.25)"
              : "rgba(0,0,0,0.12)",
            background: msg.toLowerCase().includes("fehler")
              ? "rgba(200,0,0,0.04)"
              : "rgba(0,0,0,0.02)",
          }
        >
          {msg}
        </div>
      ) : null}

      

      <div className="zr-card" style={ display: "grid", gap: 10 }>
        <div style={ fontWeight: 900 }>Cover Foto</div>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy || coverPrepBusy}
          onChange={handleCoverChange}
        />

        {coverPrepBusy ? (
          <div style={ opacity: 0.8, fontSize: 13 }>Cover wird vorbereitet…</div>
        ) : null}

        {coverPreviewUrl ? (
          <img
            src={coverPreviewUrl}
            alt="Cover preview"
            style={
              width: "100%",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
            }
          />
        ) : null}
      </div>

      <div className="zr-card" style={ display: "grid", gap: 10 }>
        <div style={ fontWeight: 900 }>ISBN</div>

        <input
          ref={isbnPhotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={ display: "none" }
          onChange={handleIsbnPhotoChange}
        />

        <div className="zr-toolbar">
          <button
            type="button"
            className="zr-btn2 zr-btn2--ghost"
            disabled={busy || coverPrepBusy || scanBusy}
            onClick={openIsbnScanner}
          >
            {scannerOpen ? "Scanner aktiv…" : "ISBN live scannen"}
          </button>

          <button
            type="button"
            className="zr-btn2 zr-btn2--ghost"
            disabled={busy || coverPrepBusy || scanBusy}
            onClick={() => isbnPhotoInputRef.current?.click()}
          >
            Aus Foto
          </button>

          <button
            type="button"
            className="zr-btn2 zr-btn2--ghost"
            disabled={busy || coverPrepBusy || isbnBusy}
            onClick={doIsbnLookup}
          >
            {isbnBusy ? "Suche…" : "ISBN Lookup"}
          </button>
        </div>

        <label style={ display: "grid", gap: 6 }>
          <span>ISBN-13</span>
          <input
            className="zr-input"
            value={v.isbn13}
            onChange={(e) => setField("isbn13", e.target.value)}
          />
        </label>

        <label style={ display: "grid", gap: 6 }>
          <span>ISBN-10</span>
          <input
            className="zr-input"
            value={v.isbn10}
            onChange={(e) => setField("isbn10", e.target.value)}
          />
        </label>
      </div>

      <label style={ display: "grid", gap: 6 }>
        <span>Seiten (pages)</span>
        <input
          className="zr-input"
          type="text"
          inputMode="numeric"
          value={v.pages}
          onChange={(e) => setField("pages", e.target.value)}
          placeholder="320"
        />
      </label>

      {scannerOpen ? (
        <div
          style={
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#000",
          }
        >
          <video
            ref={isbnVideoRef}
            autoPlay
            playsInline
            muted
            style={
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }
          />

          <button
            type="button"
            onClick={closeIsbnScanner}
            className="zr-btn2 zr-btn2--ghost"
            style={
              position: "absolute",
              top: 16,
              left: 16,
              zIndex: 2,
              background: "rgba(255,255,255,0.9)",
            }
          >
            ✕
          </button>

          <div
            style={
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
            }
          >
            <div
              style={
                width: "86%",
                maxWidth: 640,
                aspectRatio: "1.8 / 1",
                border: "2px solid rgba(255,255,255,0.96)",
                borderRadius: 18,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.36)",
              }
            />
          </div>

          <div
            className="zr-card"
            style={
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 16,
              zIndex: 2,
              background: "rgba(255,255,255,0.96)",
            }
          >
            <div style={ fontWeight: 800, marginBottom: 6 }>ISBN scannen</div>
            <div style={ fontSize: 14, opacity: 0.82 }>
              Barcode in den Rahmen halten. Der Scan stoppt automatisch.
            </div>
            <div style={ fontSize: 12, opacity: 0.7, marginTop: 4 }>
              {scannerStarting ? "Kamera startet…" : "Kein Foto nötig."}
            </div>

            <div style={ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }>
              <button
                type="button"
                className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                onClick={closeIsbnScanner}
              >
                Abbrechen
              </button>

              <button
                type="button"
                className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                onClick={openIsbnPhotoFallback}
              >
                Stattdessen aus Foto
              </button>
            </div>
          </div>
        </div>
      ) : null}

      

      <div className="zr-toolbar" style={ marginTop: 4 }>
        <button
          className="zr-btn2 zr-btn2--primary"
          disabled={busy || coverPrepBusy}
          type="submit"
        >
          {busy ? "…" : coverPrepBusy ? "Vorbereiten…" : submitLabel}
        </button>

        {pendingUploads ? (
          <button
            type="button"
            className="zr-btn2 zr-btn2--ghost"
            disabled={busy || coverPrepBusy}
            onClick={async () => {
              await processUploadQueue({ maxJobs: 10 });
              refreshPending();
              setMsg("Upload-Queue erneut versucht.");
            }
          >
            Pending Uploads: {pendingUploads}
          </button>
        ) : null}

        {onCancel ? (
          <button
            className="zr-btn2 zr-btn2--ghost"
            type="button"
            onClick={onCancel}
            disabled={busy || coverPrepBusy}
          >
            Abbrechen
          </button>
        ) : null}
      </div>
    </form>
  );
}

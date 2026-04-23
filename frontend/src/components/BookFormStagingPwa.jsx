import React, { useEffect, useMemo, useRef, useState } from "react";
import { createWorker, PSM } from "tesseract.js";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  lookupIsbn,
  registerBook,
  updateBook,
  uploadCover,
} from "../api/books";
import { previewBarcode } from "../api/barcodes";
import { startIsbnScanner } from "../utils/isbnScanner";

const toStr = (v) => (v === undefined || v === null ? "" : String(v));

function preventImplicitSubmit(e) {
  const tag = e.target?.tagName;
  const type = String(e.target?.type || "").toLowerCase();
  if (e.key === "Enter" && tag !== "TEXTAREA" && type !== "submit") {
    e.preventDefault();
  }
}

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
    attempts.push(region, rotateCanvas(region, 90), rotateCanvas(region, 180), rotateCanvas(region, 270));
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

function initialStateFromBook(b = {}) {
  return {
    barcode: toStr(b.barcode),
    width_cm: toStr(b.width_cm),
    height_cm: toStr(b.height_cm),
    author_abbreviation: toStr(b.author_abbreviation),
    publisher_abbr: toStr(b.publisher_abbr),
    author_firstname: toStr(b.author_firstname || b.author_first_name),
    author_lastname: toStr(b.author_lastname || b.author_last_name),
    name_display: toStr(b.name_display || b.author_name_display),
    title_display: toStr(b.title_display || b.title),
    subtitle_display: toStr(b.subtitle_display),
    publisher_name_display: toStr(b.publisher_name_display),
    pages: toStr(b.pages),
    isbn13: toStr(b.isbn13),
    isbn10: toStr(b.isbn10),
    purchase_url: toStr(b.purchase_url),
    original_language: toStr(b.original_language),
    comment: toStr(b.comment),
  };
}

export default function BookFormStagingPwa({
  mode = "create",
  bookId,
  initialBook,
  submitLabel = mode === "create" ? "Speichern" : "Aktualisieren",
  onCancel,
  onSuccess,
  assignBarcode = false,
  createReadingStatus,
}) {
  const isEdit = mode === "edit";
  const initial = useMemo(() => initialStateFromBook(initialBook || {}), [initialBook]);

  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [coverPrepBusy, setCoverPrepBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [isbnBusy, setIsbnBusy] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const [barcodePreview, setBarcodePreview] = useState(null);
  const [barcodePreviewErr, setBarcodePreviewErr] = useState("");
  const explicitSubmitRef = useRef(false);
  const isbnPhotoInputRef = useRef(null);
  const isbnVideoRef = useRef(null);
  const stopIsbnScannerRef = useRef(() => {});
  const msgRef = useRef(null);

  useEffect(() => {
    setV(initial);
  }, [initial]);

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
    const w = parseFloatOrNull(v.width_cm);
    const h = parseFloatOrNull(v.height_cm);
    if (!(Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0)) {
      setBarcodePreview(null);
      setBarcodePreviewErr("");
      return;
    }

    let alive = true;
    const t = setTimeout(() => {
      (async () => {
        try {
          const p = await previewBarcode(w, h);
          if (!alive) return;
          setBarcodePreviewErr("");
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
  }, [assignBarcode, isEdit, v.barcode, v.width_cm, v.height_cm]);

  useEffect(() => {
    if (!scannerOpen || !isbnVideoRef.current) return;

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
        if (cancelled) return;
        closeIsbnScanner();
        setMsg(err?.message || "Scanner konnte nicht gestartet werden.");
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
  }, [scannerOpen]);

  function setField(key, value) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  async function fillFromLookup(isbn) {
    setIsbnBusy(true);
    try {
      const r = await lookupIsbn(isbn);
      const s = r?.suggested || r || {};

      setV((prev) => ({
        ...prev,
        isbn13: prev.isbn13 || toStr(s.isbn13),
        isbn10: prev.isbn10 || toStr(s.isbn10),
        title_display: prev.title_display || toStr(s.title_display || s.title),
        subtitle_display: prev.subtitle_display || toStr(s.subtitle_display),
        pages: prev.pages || toStr(s.pages),
        name_display:
          prev.name_display ||
          toStr(
            s.name_display ||
              s.author_name_display ||
              (Array.isArray(s.authors) ? s.authors.filter(Boolean).join(", ") : "")
          ),
        publisher_name_display: prev.publisher_name_display || toStr(s.publisher_name_display),
        purchase_url: prev.purchase_url || toStr(s.purchase_url || s.purchaseUrl || s.url),
        original_language: prev.original_language || toStr(s.original_language || s.language),
        author_abbreviation: prev.author_abbreviation || toStr(s.author_abbreviation),
        publisher_abbr: prev.publisher_abbr || toStr(s.publisher_abbr),
        author_firstname: prev.author_firstname || toStr(s.author_firstname || s.author_first_name),
        author_lastname: prev.author_lastname || toStr(s.author_lastname || s.author_last_name),
      }));

      setMsg("ISBN gefunden ✔ (Daten wurden ergänzt)");
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
      setMsg("Bitte ISBN eingeben oder scannen.");
      return;
    }
    if (!n.lookupOk) {
      setMsg("ISBN sieht ungültig aus. Du kannst trotzdem speichern – Lookup wurde übersprungen.");
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

  function openIsbnScanner() {
    if (busy || scanBusy || coverPrepBusy || scannerOpen) return;
    setMsg("");
    setScannerOpen(true);
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
      isbn10: n.isbn13 ? "" : (n.isbn10 || prev.isbn10),
    }));

    closeIsbnScanner();
    setMsg(`ISBN erkannt: ${isbn}`);
    if (n.lookupOk) {
      await fillFromLookup(isbn);
    }
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

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!explicitSubmitRef.current) {
      setMsg("Bitte zum Speichern den Button verwenden.");
      return;
    }
    explicitSubmitRef.current = false;

    if (coverPrepBusy) {
      setMsg("Cover wird noch vorbereitet. Bitte kurz warten.");
      return;
    }
    if (!isEdit && !coverFile) {
      setMsg("Bitte zuerst ein Cover-Foto aufnehmen.");
      return;
    }

    const payload = {};
    if (!isEdit) payload.assign_barcode = !!assignBarcode;

    const nextBarcode = String(v.barcode || "").trim();
    const suggestedBarcode = String(barcodePreview?.candidate || "").trim();
    const finalBarcode = nextBarcode || suggestedBarcode;

    const widthCm = parseFloatOrNull(v.width_cm);
    const heightCm = parseFloatOrNull(v.height_cm);
    if (!isEdit && assignBarcode && !finalBarcode) {
      const ok =
        Number.isFinite(widthCm) && widthCm > 0 &&
        Number.isFinite(heightCm) && heightCm > 0;
      if (!ok) {
        setMsg("Bitte unter „Weitere Felder“ Barcode angeben oder Breite + Höhe eintragen.");
        return;
      }
    }

    if (!isEdit && assignBarcode && finalBarcode) payload.barcode = finalBarcode;
    if (!isEdit && Number.isFinite(widthCm) && widthCm > 0) payload.width_cm = widthCm;
    if (!isEdit && Number.isFinite(heightCm) && heightCm > 0) payload.height_cm = heightCm;

    const isbnN = normalizeIsbnInputs(v.isbn13, v.isbn10);
    if (isbnN.isbn13) payload.isbn13 = isbnN.isbn13;
    if (isbnN.isbn10) payload.isbn10 = isbnN.isbn10;
    if (!isbnN.isbn13 && !isbnN.isbn10 && isbnN.raw) payload.isbn13_raw = isbnN.raw;

    const pageCount = parseIntOrNull(v.pages);
    if (pageCount !== null) payload.pages = pageCount;

    const nullableStrings = [
      "author_firstname",
      "author_lastname",
      "name_display",
      "title_display",
      "subtitle_display",
      "publisher_name_display",
      "author_abbreviation",
      "publisher_abbr",
      "purchase_url",
      "original_language",
      "comment",
    ];

    for (const key of nullableStrings) {
      const value = String(v[key] || "").trim();
      if (value) payload[key] = value;
    }

    if (!isEdit && createReadingStatus) payload.reading_status = createReadingStatus;

    if (coverFile && (coverFile.size ?? 0) < 1024) {
      setMsg("Cover-Foto ist leer. Bitte Foto erneut aufnehmen.");
      return;
    }

    setBusy(true);
    try {
      let saved;
      if (isEdit) {
        saved = await updateBook(bookId || initialBook?._id || initialBook?.id, payload);
      } else {
        saved = await registerBook(payload);
      }

      const savedId =
        saved?.id ||
        saved?._id ||
        bookId ||
        initialBook?._id ||
        initialBook?.id;

      let coverUploadFailed = false;
      if (coverFile && savedId) {
        try {
          await uploadCover(savedId, coverFile);
          setCoverFile(null);
        } catch (e) {
          coverUploadFailed = true;
          setMsg(`${isEdit ? "Gespeichert" : "Gespeichert"}, aber Cover-Upload fehlgeschlagen: ${e?.message || "Fehler"}`);
        }
      }

      onSuccess && onSuccess({ payload, saved });
      if (!coverUploadFailed) setMsg(isEdit ? "Gespeichert." : "Gespeichert ✔");

      if (!isEdit) {
        setV(initialStateFromBook({}));
        setBarcodePreview(null);
        setBarcodePreviewErr("");
      }
    } catch (err) {
      setMsg(err?.message || "Fehler beim Speichern");
    } finally {
      setBusy(false);
      explicitSubmitRef.current = false;
    }
  }

  return (
    <form onSubmit={onSubmit} onKeyDown={preventImplicitSubmit} noValidate style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>{isEdit ? "Edit Book (PWA)" : "Register Book (PWA)"}</h2>

      {msg ? (
        <div
          ref={msgRef}
          className="zr-card"
          style={{
            borderColor: msg.toLowerCase().includes("fehler") ? "rgba(200,0,0,0.25)" : "rgba(0,0,0,0.12)",
            background: msg.toLowerCase().includes("fehler") ? "rgba(200,0,0,0.04)" : "rgba(0,0,0,0.02)",
          }}
        >
          {msg}
        </div>
      ) : null}

      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>1. Cover Foto</div>
        <div style={{ opacity: 0.8, fontSize: 13 }}>
          Erst Cover fotografieren. Danach kommt der Scan/Lookup-Flow.
        </div>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy || coverPrepBusy}
          onChange={handleCoverChange}
        />

        {coverPrepBusy ? <div style={{ opacity: 0.8, fontSize: 13 }}>Cover wird vorbereitet…</div> : null}

        {coverPreviewUrl ? (
          <img
            src={coverPreviewUrl}
            alt="Cover preview"
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
            }}
          />
        ) : null}
      </div>

      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>2. ISBN</div>

        <input
          ref={isbnPhotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleIsbnPhotoChange}
        />

        <div style={{ fontSize: 13, opacity: 0.85 }}>
          Scan ist der Hauptweg. Manuelle Eingabe bleibt möglich.
        </div>

        <div className="zr-toolbar" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="zr-btn2 zr-btn2--primary"
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
            {isbnBusy ? "Suche…" : "Lookup"}
          </button>
        </div>

        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>ISBN-13</span>
            <input
              className="zr-input"
              value={v.isbn13}
              onChange={(e) =>
                setV((prev) => ({
                  ...prev,
                  isbn13: e.target.value,
                  isbn10: e.target.value.trim() ? "" : prev.isbn10,
                }))
              }
            />
          </label>
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>ISBN-10</span>
            <input
              className="zr-input"
              value={v.isbn10}
              onChange={(e) => setField("isbn10", e.target.value)}
            />
          </label>
        </div>

        <div style={{ fontSize: 12, opacity: 0.72 }}>
          Nach Scan oder Foto läuft der Lookup automatisch. Bei manueller Eingabe kannst du Lookup drücken oder später speichern.
        </div>
      </div>

      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>3. Pages</div>
        <label style={{ display: "grid", gap: 6, maxWidth: 160 }}>
          <span>Pages</span>
          <input
            className="zr-input"
            type="text"
            inputMode="numeric"
            value={v.pages}
            onChange={(e) => setField("pages", e.target.value)}
            placeholder="320"
          />
        </label>
      </div>

      <div className="zr-toolbar" style={{ marginTop: 4 }}>
        <button
          className="zr-btn2 zr-btn2--primary"
          disabled={busy || coverPrepBusy}
          type="submit"
          onClick={() => {
            explicitSubmitRef.current = true;
          }}
        >
          {busy ? "…" : coverPrepBusy ? "Vorbereiten…" : submitLabel}
        </button>

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

      <details className="zr-card" style={{ display: "grid", gap: 10 }}>
        <summary style={{ cursor: "pointer", fontWeight: 900 }}>Rest / Weitere Felder</summary>

        <div className="zr-card" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>Barcode / Maße / Abkürzungen</div>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Barcode</span>
            <input
              className="zr-input"
              value={v.barcode}
              disabled={busy || isEdit}
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

          <div className="zr-toolbar" style={{ alignItems: "end", flexWrap: "wrap", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, flex: "0 0 auto" }}>
              <span>Breite (cm)</span>
              <input
                className="zr-input"
                type="text"
                inputMode="decimal"
                value={v.width_cm}
                onChange={(e) => setField("width_cm", e.target.value)}
                placeholder="13,5"
                style={{ width: "8ch", minWidth: 0 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, flex: "0 0 auto" }}>
              <span>Höhe (cm)</span>
              <input
                className="zr-input"
                type="text"
                inputMode="decimal"
                value={v.height_cm}
                onChange={(e) => setField("height_cm", e.target.value)}
                placeholder="21"
                style={{ width: "8ch", minWidth: 0 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, flex: "0 0 auto" }}>
              <span>Autor Abk.</span>
              <input
                className="zr-input"
                value={v.author_abbreviation}
                onChange={(e) => setField("author_abbreviation", e.target.value)}
                placeholder="KR"
                style={{ width: "8ch", minWidth: 0 }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, flex: "0 0 auto" }}>
              <span>Verlag Abk.</span>
              <input
                className="zr-input"
                value={v.publisher_abbr}
                onChange={(e) => setField("publisher_abbr", e.target.value)}
                placeholder="ROW"
                style={{ width: "9ch", minWidth: 0 }}
              />
            </label>
          </div>

          {barcodePreview?.candidate ? (
            <div className="zr-toolbar" style={{ alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>Vorschlag: {barcodePreview.candidate}</div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>
                  Wird beim Speichern automatisch verwendet, wenn das Barcode-Feld leer ist.
                </div>
              </div>
              <button
                type="button"
                className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                disabled={busy || coverPrepBusy || !barcodePreview?.candidate}
                onClick={() => setField("barcode", barcodePreview.candidate)}
              >
                Übernehmen
              </button>
            </div>
          ) : barcodePreviewErr ? (
            <div style={{ opacity: 0.8, fontSize: 13 }}>{barcodePreviewErr}</div>
          ) : null}
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Authorname display</span>
          <input
            className="zr-input"
            value={v.name_display}
            onChange={(e) => setField("name_display", e.target.value)}
          />
        </label>

        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Titel anzeigen (title_display)</span>
            <input
              className="zr-input"
              value={v.title_display}
              onChange={(e) => setField("title_display", e.target.value)}
            />
          </label>
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Untertitel</span>
            <input
              className="zr-input"
              value={v.subtitle_display}
              onChange={(e) => setField("subtitle_display", e.target.value)}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Verlag Anzeigename</span>
          <input
            className="zr-input"
            value={v.publisher_name_display}
            onChange={(e) => setField("publisher_name_display", e.target.value)}
          />
        </label>

        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Autor Vorname</span>
            <input
              className="zr-input"
              value={v.author_firstname}
              onChange={(e) => setField("author_firstname", e.target.value)}
            />
          </label>
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Autor Nachname</span>
            <input
              className="zr-input"
              value={v.author_lastname}
              onChange={(e) => setField("author_lastname", e.target.value)}
            />
          </label>
        </div>

        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Kauf-Link</span>
            <input
              className="zr-input"
              value={v.purchase_url}
              onChange={(e) => setField("purchase_url", e.target.value)}
              placeholder="https://…"
            />
          </label>
          <label style={{ display: "grid", gap: 6, width: 220 }}>
            <span>Originalsprache</span>
            <input
              className="zr-input"
              value={v.original_language}
              onChange={(e) => setField("original_language", e.target.value)}
              placeholder="z.B. en"
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Kommentar</span>
          <textarea
            className="zr-input"
            rows={3}
            value={v.comment}
            onChange={(e) => setField("comment", e.target.value)}
          />
        </label>
      </details>

      {scannerOpen ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000" }}>
          <video
            ref={isbnVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          <button
            type="button"
            onClick={closeIsbnScanner}
            className="zr-btn2 zr-btn2--ghost"
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              zIndex: 2,
              background: "rgba(255,255,255,0.9)",
            }}
          >
            ✕
          </button>

          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
            <div
              style={{
                width: "86%",
                maxWidth: 640,
                aspectRatio: "1.8 / 1",
                border: "2px solid rgba(255,255,255,0.96)",
                borderRadius: 18,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.36)",
              }}
            />
          </div>

          <div
            className="zr-card"
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 16,
              zIndex: 2,
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>ISBN scannen</div>
            <div style={{ fontSize: 14, opacity: 0.82 }}>
              Barcode in den Rahmen halten. Der Scan stoppt automatisch.
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              {scannerStarting ? "Kamera startet…" : "Kein Foto nötig."}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button type="button" className="zr-btn2 zr-btn2--ghost zr-btn2--sm" onClick={closeIsbnScanner}>
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
    </form>
  );
}

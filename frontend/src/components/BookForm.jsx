// frontend/src/components/BookForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createWorker, PSM } from "tesseract.js";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
  autocomplete,
  findDraft,
  lookupIsbn,
  registerBook,
  registerExistingBook,
  updateBook,
  uploadCover,
} from "../api/books";
import { previewBarcode } from "../api/barcodes";
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

const parseFloatOrNull = (s) => {
  const t = String(s ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
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

/* ---------- misc helpers ---------- */
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
    return { keyword: rest.trim(), pos: "1" };
  }
  return { keyword: t, pos: "0" };
}

function looksLikeReasonableTitle(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  if (t.length < 4 || t.length > 120) return false;
  if (!/[A-Za-zÄÖÜäöüß]/.test(t)) return false;
  if (/^[^A-Za-z]*$/.test(t)) return false;
  if (/^[A-Za-z]{1,2}$/.test(t)) return false;
  if (/[0-9]{3,}/.test(t)) return false;
  if (/[=:;]/.test(t)) return false;

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && words.every((w) => /^[A-Z]{1,2}$/.test(w))) return false;

  const letters = (t.match(/[A-Za-zÄÖÜäöüß]/g) || []).length;
  return letters >= 4;
}

function looksLikeReasonableAuthor(s) {
  const t = String(s || "").trim();
  if (!t) return false;
  if (t.length < 5 || t.length > 60) return false;
  if (!/[A-Za-zÄÖÜäöüß]/.test(t)) return false;

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  if (words.some((w) => w.replace(/[^A-Za-zÄÖÜäöüß-]/g, "").length < 2)) return false;

  return true;
}

/* ---------- OCR helpers ---------- */
function normalizeOcrLine(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/[|]/g, "I")
    .trim();
}

function usefulOcrLines(text) {
  const seen = new Set();
  const out = [];

  for (const raw of String(text || "").split(/\n+/)) {
    const s = normalizeOcrLine(raw);
    if (!s) continue;
    if (s.length < 2) continue;
    if (!/[A-Za-zÄÖÜäöüß]/.test(s)) continue;
    if (/^\d+$/.test(s)) continue;

    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }

  return out;
}

function cleanOcrCandidate(s) {
  return String(s || "")
    .replace(/[|]/g, "I")
    .replace(/[“”„"]/g, "")
    .replace(/[^\p{L}\p{N}\s.'\-:&!?]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countLetters(s) {
  return (String(s || "").match(/\p{L}/gu) || []).length;
}

function badSymbolCount(s) {
  return (String(s || "").match(/[=+_*~<>[\]{}\\/]/g) || []).length;
}

function scoreTitleLine(s) {
  const t = cleanOcrCandidate(s);
  if (!t) return -999;

  const words = t.split(/\s+/).filter(Boolean);
  const letters = countLetters(t);

  if (letters < 4) return -999;
  if (t.length < 4 || t.length > 80) return -999;
  if (words.length < 1 || words.length > 5) return -999;
  if (badSymbolCount(t) > 0) return -999;
  if (/[0-9]{3,}/.test(t)) return -999;

  let score = 0;

  if (words.length <= 3) score += 8;
  if (words.length === 2) score += 10;
  if (words.length === 1) score += 3;

  score += letters;

  if (/[=:;]/.test(t)) score -= 12;
  if (/[.]{2,}/.test(t)) score -= 8;

  const titleCaseWords = words.filter((w) => /^[A-ZÄÖÜ][a-zäöüß]/.test(w)).length;
  const allCapsWords = words.filter((w) => /^[A-ZÄÖÜ]{2,}$/.test(w)).length;
  score += titleCaseWords * 3;
  score += allCapsWords * 1;

  if (words.some((w) => /^[A-Z]{1,2}$/.test(w))) score -= 12;
  if (words.length === 2 && words.every((w) => w.length >= 4)) score += 12;
  if (/^[a-zäöüß]/.test(t)) score -= 12;
  if (t.length <= 20) score += 6;

  return score;
}

function scoreAuthorLine(s) {
  const t = cleanOcrCandidate(s);
  if (!t) return -999;

  const words = t.split(/\s+/).filter(Boolean);
  const letters = countLetters(t);

  if (letters < 5) return -999;
  if (t.length < 5 || t.length > 50) return -999;
  if (words.length < 2 || words.length > 4) return -999;
  if (badSymbolCount(t) > 0) return -999;
  if (/[0-9]/.test(t)) return -999;
  if (/(verlag|press|books|edition|editions|publishing|publisher)/i.test(t)) return -999;

  let score = 0;

  if (words.length === 2) score += 10;
  if (words.length === 3) score += 6;

  score += letters;

  const goodWords = words.filter(
    (w) => /^[A-ZÄÖÜ][a-zäöüß-]+$/.test(w) || /^[A-ZÄÖÜ]+$/.test(w)
  ).length;
  score += goodWords * 3;

  if (/[=:;]/.test(t)) score -= 12;

  return score;
}

function buildAdjacentCombos(lines, maxParts = 2) {
  const src = (lines || []).map(cleanOcrCandidate).filter(Boolean);
  const out = [];
  const seen = new Set();

  function add(line) {
    const t = cleanOcrCandidate(line);
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  }

  for (let i = 0; i < src.length; i++) {
    add(src[i]);

    let combo = src[i];
    for (let j = i + 1; j < Math.min(src.length, i + maxParts); j++) {
      combo = `${combo} ${src[j]}`.trim();
      add(combo);
    }
  }

  return out;
}

function toSimpleTitleCase(s) {
  return String(s || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (/^[A-ZÄÖÜ]{2,}$/.test(w)) {
        return w.charAt(0) + w.slice(1).toLowerCase();
      }
      if (/^[a-zäöüß]+$/.test(w)) {
        return w.charAt(0).toUpperCase() + w.slice(1);
      }
      return w;
    })
    .join(" ");
}

function normalizeCoverNameLikeText(s) {
  let t = cleanOcrCandidate(s)
    .replace(/\bERICH\s+SEGAL\b/gi, "Erich Segal")
    .replace(/\bLOVE\s+STORY\b/gi, "Love Story")
    .trim();

  if (/^[A-ZÄÖÜ\s-]+$/.test(t)) {
    t = toSimpleTitleCase(t);
  }

  return t;
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

async function fileToCanvas(file, maxEdge = 1800) {
  const img = await loadImageFromFile(file);
  return imageToCanvas(img, maxEdge);
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

function cloneCanvas(src) {
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas konnte nicht initialisiert werden.");
  ctx.drawImage(src, 0, 0);
  return canvas;
}

function makeGrayHighContrastCanvas(src, threshold = 160) {
  const canvas = cloneCanvas(src);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas konnte nicht initialisiert werden.");

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;

  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    const v = gray >= threshold ? 255 : 0;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }

  ctx.putImageData(img, 0, 0);
  return canvas;
}

function upscaleCanvas(src, factor = 2) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(src.width * factor));
  canvas.height = Math.max(1, Math.round(src.height * factor));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas konnte nicht initialisiert werden.");

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
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

function coverRects(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  return {
    top: { left: 0, top: 0, width: w, height: Math.round(h * 0.34) },
    middle: {
      left: 0,
      top: Math.round(h * 0.18),
      width: w,
      height: Math.round(h * 0.52),
    },
    bottom: {
      left: 0,
      top: Math.round(h * 0.72),
      width: w,
      height: Math.round(h * 0.28),
    },
  };
}

function guessCoverCandidates({ full, top, middle, bottom }) {
  const topLines = usefulOcrLines(top);
  const middleLines = usefulOcrLines(middle);
  const bottomLines = usefulOcrLines(bottom);
  const allLines = usefulOcrLines(full).map(cleanOcrCandidate);

  const titleSource = buildAdjacentCombos([...topLines, ...middleLines], 3);
  const authorSource = buildAdjacentCombos([...bottomLines, ...middleLines], 2);

  const titleCandidates = titleSource
    .map((line) => ({ line, score: scoreTitleLine(line) }))
    .filter((x) => x.score > -999)
    .sort((a, b) => b.score - a.score);

  const authorCandidates = authorSource
    .map((line) => ({ line, score: scoreAuthorLine(line) }))
    .filter((x) => x.score > -999)
    .sort((a, b) => b.score - a.score);

  return {
    title: titleCandidates[0]?.line || "",
    author: authorCandidates[0]?.line || "",
    q: allLines.slice(0, 6).join(" "),
    debugLines: allLines.slice(0, 8),
  };
}

async function recognizeBestOf(worker, canvases, psm = PSM.SINGLE_BLOCK) {
  await worker.setParameters({ tessedit_pageseg_mode: psm });

  let bestText = "";
  let bestScore = -1;

  for (const canvas of canvases) {
    const res = await worker.recognize(canvas);
    const text = String(res?.data?.text || "").trim();
    const conf = Number(res?.data?.confidence ?? 0);

    if (text && conf > bestScore) {
      bestText = text;
      bestScore = conf;
    }
  }

  return bestText;
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
    cropCanvas(full, {
      x: 0,
      y: Math.round(h * 0.45),
      width: w,
      height: Math.round(h * 0.55),
    }),
    cropCanvas(full, {
      x: 0,
      y: Math.round(h * 0.6),
      width: w,
      height: Math.round(h * 0.4),
    }),
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

  throw new Error(
    "Kein ISBN-Barcode im Foto erkannt. Bitte den Barcode groß und nah fotografieren."
  );
}

export default function BookForm({
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
  const ocrWorkerRef = useRef(null);
  const [coverInfoBusy, setCoverInfoBusy] = useState(false);

  const isbnPhotoInputRef = useRef(null);
  const isbnVideoRef = useRef(null);
  const stopIsbnScannerRef = useRef(() => {});
  const [scanBusy, setScanBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);

  const isbnState = useMemo(
    () => normalizeIsbnInputs(v.isbn13, v.isbn10),
    [v.isbn13, v.isbn10]
  );
  const hasIsbn = !!(isbnState.isbn13 || isbnState.isbn10);

  const [pendingUploads, setPendingUploads] = useState(0);
  const refreshPending = async () => {
    try {
      setPendingUploads(await getPendingUploadCount());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshPending();
  }, []);

  const msgRef = useRef(null);
  useEffect(() => {
    if (!msg) return;
    msgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [msg]);

  useEffect(() => {
    return () => {
      const worker = ocrWorkerRef.current;
      ocrWorkerRef.current = null;
      worker?.terminate?.();
    };
  }, []);

  useEffect(() => {
    return () => {
      try {
        stopIsbnScannerRef.current?.();
      } catch {
        // ignore
      }
    };
  }, []);

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");

  const [draftBusy, setDraftBusy] = useState(false);
  const [draftCandidates, setDraftCandidates] = useState([]);
  const [draftSelectedId, setDraftSelectedId] = useState("");

  const selectedDraft = useMemo(
    () => draftCandidates.find((d) => d.id === draftSelectedId) || null,
    [draftCandidates, draftSelectedId]
  );

  function draftTitle(d) {
    return [d?.title_display, d?.subtitle_display].filter(Boolean).join(": ") || d?.title_keyword || "";
  }

  function draftAuthor(d) {
  }

  useEffect(() => {
    if (isEdit) return;
    if (!assignBarcode) return;

    const n = normalizeIsbnInputs(v.isbn13, v.isbn10);
    const isbn = n.isbn13 || n.isbn10 || "";
    const pagesRaw = String(v.pages || "").trim();
    const code = /^[0-9]+$/.test(pagesRaw) ? pagesRaw : "";
    const titleDisplay = String(v.title_display || "").trim();
    const subtitleDisplay = String(v.subtitle_display || "").trim();
    const titleKeyword = String(v.title_keyword || "").trim();
    const authorLast = String(v.author_lastname || "").trim();
    const authorFirst = String(v.author_firstname || "").trim();
    const authorDisplay = String(v.name_display || "").trim();
    const publisherDisplay = String(v.publisher_name_display || "").trim();
    const publisherAbbr = String(v.publisher_abbr || "").trim();

    const hasKey = !!isbn || !!code || !!titleDisplay || !!subtitleDisplay || !!titleKeyword || !!authorLast || !!authorFirst || !!authorDisplay || !!publisherDisplay || !!publisherAbbr;
    if (!hasKey) {
      setDraftCandidates([]);
      setDraftSelectedId("");
      return;
    }

    let alive = true;
    const t = setTimeout(() => {
      (async () => {
        try {
          setDraftBusy(true);
          const r = await findDraft({
            isbn: isbn || undefined,
            code: code || undefined,
            title_display: titleDisplay || undefined,
            subtitle_display: subtitleDisplay || undefined,
            title_keyword: titleKeyword || undefined,
            author_lastname: authorLast || undefined,
            author_firstname: authorFirst || undefined,
            name_display: authorDisplay || undefined,
            publisher_name_display: publisherDisplay || undefined,
            publisher_abbr: publisherAbbr || undefined,
          });
          if (!alive) return;
          const items = Array.isArray(r?.items)
            ? r.items
            : Array.isArray(r)
            ? r
            : [];
          setDraftCandidates(items);
          setDraftSelectedId((prev) => {
            if (prev && items.some((x) => x.id === prev)) return prev;
            if (items.length === 1) return items[0].id;
            return "";
          });
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
  }, [
    isEdit,
    assignBarcode,
    v.isbn13,
    v.isbn10,
    v.pages,
    v.title_display,
    v.subtitle_display,
    v.title_keyword,
    v.author_lastname,
    v.author_firstname,
    v.name_display,
    v.publisher_name_display,
    v.publisher_abbr,
  ]);

  useEffect(() => {
    if (!selectedDraft) return;
    setV((prev) => ({
      ...prev,
      author_id: prev.author_id || selectedDraft.author_id || "",
      publisher_id: prev.publisher_id || selectedDraft.publisher_id || "",
      author_lastname: prev.author_lastname || selectedDraft.author_last_name || "",
      author_firstname: prev.author_firstname || selectedDraft.author_first_name || "",
      name_display: prev.name_display || selectedDraft.author_name_display || "",
      author_abbreviation: prev.author_abbreviation || selectedDraft.author_abbreviation || "",
      author_nationality: prev.author_nationality || selectedDraft.author_nationality || "",
      place_of_birth: prev.place_of_birth || selectedDraft.place_of_birth || "",
      male_female: prev.male_female || selectedDraft.male_female || "",
      published_titles: prev.published_titles || toStr(selectedDraft.published_titles),
      number_of_millionsellers:
        prev.number_of_millionsellers || toStr(selectedDraft.number_of_millionsellers),
      title_display: prev.title_display || selectedDraft.title_display || "",
      subtitle_display: prev.subtitle_display || selectedDraft.subtitle_display || "",
      title_keyword: prev.title_keyword || selectedDraft.title_keyword || "",
      publisher_name_display: prev.publisher_name_display || selectedDraft.publisher_name_display || "",
      publisher_abbr: prev.publisher_abbr || selectedDraft.publisher_abbr || "",
      pages: prev.pages || toStr(selectedDraft.pages),
      width_cm: prev.width_cm || toStr(selectedDraft.width_cm),
      height_cm: prev.height_cm || toStr(selectedDraft.height_cm),
      isbn13: prev.isbn13 || selectedDraft.isbn13 || "",
      isbn10: prev.isbn10 || selectedDraft.isbn10 || "",
      original_language: prev.original_language || selectedDraft.original_language || "",
      purchase_url: prev.purchase_url || selectedDraft.purchase_url || "",
      comment: prev.comment || selectedDraft.comment || "",
    }));
  }, [selectedDraft]);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl("");
      return;
    }
    const u = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [coverFile]);

  const [isbnBusy, setIsbnBusy] = useState(false);

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

        "barcode",
        "bmark",
        "bmarkb",
        "code",
        "author_id",
        "publisher_id",
        "bautor",
        "author",
        "author_lastname",
        "author_firstname",
        "name_display",
        "author_name_display",
        "author_abbreviation",
        "author_nationality",
        "place_of_birth",
        "male_female",
        "published_titles",
        "number_of_millionsellers",
        "bverlag",
        "publisher",
        "publisher_name_display",
        "publisher_abbr",
        "title_display",
        "subtitle_display",
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
        "comment",
        "isbn10",
        "isbn13",
        "original_language",

        "bbreite",
        "bhoehe",
        "width",
        "height",
      ].map((k) => norm(k))),
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
    setV((prev) => {
      const next = { ...prev, [key]: val };
      if (["author_lastname", "author_firstname", "name_display", "author_abbreviation"].includes(key)) {
        next.author_id = "";
      }
      if (["publisher_name_display", "publisher_abbr"].includes(key)) {
        next.publisher_id = "";
      }
      return next;
    });
  }

  function setExtra(key, val) {
    setExtras((p) => ({ ...p, [key]: val }));
  }

  function authorSuggestionLabel(it) {
    if (!it || typeof it === "string") return String(it || "");
    const display =
      String(it.name_display || "").trim() ||
      [it.first_name, it.last_name].filter(Boolean).join(" ").trim() ||
      String(it.last_name || "").trim();
    const abbr = String(it.abbreviation || "").trim();
    return [display, abbr].filter(Boolean).join(" · ");
  }

  function publisherSuggestionLabel(it) {
    if (!it || typeof it === "string") return String(it || "");
    const display = String(it.name_display || it.name || "").trim();
    const abbr = String(it.abbr || "").trim();
    return [display, abbr].filter(Boolean).join(" · ");
  }

  function suggestionKey(it, index) {
    if (it && typeof it === "object") return String(it.id || it.name_display || it.name || it.last_name || index);
    return String(it ?? index);
  }

  function applyAuthorMatch(match, { overwriteIdentity = true, fillOnly = false } = {}) {
    if (!match) return;
    setV((prev) => {
      const last = String(match.last_name || match.author_last_name || "").trim();
      const first = String(match.first_name || match.author_first_name || "").trim();
      const display =
        String(match.name_display || match.author_name_display || "").trim() ||
        [first, last].filter(Boolean).join(" ").trim();
      const next = { ...prev };
      if (String(match.id || match.author_id || "").trim()) {
        next.author_id = String(match.id || match.author_id).trim();
      }
      if (overwriteIdentity) {
        if (last) next.author_lastname = last;
        if (first) next.author_firstname = first;
        if (display) next.name_display = display;
      } else {
        if (!String(prev.author_lastname || "").trim() && last) next.author_lastname = last;
        if (!String(prev.author_firstname || "").trim() && first) next.author_firstname = first;
        if (!String(prev.name_display || "").trim() && display) next.name_display = display;
      }

      const meta = {
        author_abbreviation: String(match.abbreviation || match.author_abbreviation || "").trim(),
        author_nationality: String(match.author_nationality || "").trim(),
        place_of_birth: String(match.place_of_birth || "").trim(),
        male_female: String(match.male_female || "").trim(),
        published_titles: toStr(match.published_titles),
        number_of_millionsellers: toStr(match.number_of_millionsellers),
      };

      for (const [key, value] of Object.entries(meta)) {
        if (!value) continue;
        if (!fillOnly || !String(prev[key] || "").trim()) {
          next[key] = value;
        }
      }

      return next;
    });
  }

  function applyPublisherMatch(match, { overwriteIdentity = true, fillOnly = false } = {}) {
    if (!match) return;
    setV((prev) => {
      const display = String(match.name_display || match.publisher_name_display || match.name || "").trim();
      const abbr = String(match.abbr || match.publisher_abbr || "").trim();
      const next = { ...prev };
      if (String(match.id || match.publisher_id || "").trim()) {
        next.publisher_id = String(match.id || match.publisher_id).trim();
      }
      if (overwriteIdentity) {
        if (display) {
          next.publisher_name_display = display;
          next.publisher_name_display = display;
        }
      } else if (!String(prev.publisher_name_display || "").trim() && display) {
        next.publisher_name_display = display;
        next.publisher_name_display = display;
      }
      if (abbr && (!fillOnly || !String(prev.publisher_abbr || "").trim())) {
        next.publisher_abbr = abbr;
      }
      return next;
    });
  }

  function setAuthorIdentityField(key, value) {
    setV((prev) => ({ ...prev, author_id: "", [key]: value }));
  }

  function setPublisherIdentityField(key, value) {
    setV((prev) => ({
      ...prev,
      publisher_id: "",
      [key]: value,
    }));
  }

  const [ac, setAc] = useState({ field: "", items: [] });

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
  }, [isEdit, assignBarcode, v.barcode, v.width_cm, v.height_cm]);

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

  async function ensureOcrWorker() {
    if (ocrWorkerRef.current) return ocrWorkerRef.current;

    const worker = await createWorker("deu+eng");
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    });

    ocrWorkerRef.current = worker;
    return worker;
  }

  async function readCoverMetaFromImage(file) {
    const worker = await ensureOcrWorker();
    const canvas = await fileToCanvas(file, 2400);

    const w = canvas.width;
    const h = canvas.height;
    const rects = coverRects(canvas);

    const titleRect = {
      x: Math.round(w * 0.08),
      y: Math.round(h * 0.52),
      width: Math.round(w * 0.62),
      height: Math.round(h * 0.31),
    };

    const authorRect = {
      x: Math.round(w * 0.49),
      y: Math.round(h * 0.68),
      width: Math.round(w * 0.39),
      height: Math.round(h * 0.18),
    };

    const titleBase = cropCanvas(canvas, titleRect);
    const authorBase = cropCanvas(canvas, authorRect);

    const titleVariants = [
      upscaleCanvas(titleBase, 2),
      makeGrayHighContrastCanvas(upscaleCanvas(titleBase, 2), 140),
      makeGrayHighContrastCanvas(upscaleCanvas(titleBase, 2), 170),
    ];

    const authorVariants = [
      upscaleCanvas(authorBase, 2.2),
      makeGrayHighContrastCanvas(upscaleCanvas(authorBase, 2.2), 145),
      makeGrayHighContrastCanvas(upscaleCanvas(authorBase, 2.2), 170),
    ];

    const titleText = await recognizeBestOf(worker, titleVariants, PSM.SINGLE_BLOCK);
    const authorText = await recognizeBestOf(worker, authorVariants, PSM.SINGLE_LINE);

    const fullRes = await worker.recognize(canvas);
    const topRes = await worker.recognize(canvas, { rectangle: rects.top });
    const middleRes = await worker.recognize(canvas, { rectangle: rects.middle });
    const bottomRes = await worker.recognize(canvas, { rectangle: rects.bottom });

    const targetedTitle = normalizeCoverNameLikeText(titleText);
    const targetedAuthor = normalizeCoverNameLikeText(authorText);

    const fallback = guessCoverCandidates({
      full: fullRes?.data?.text || "",
      top: topRes?.data?.text || "",
      middle: middleRes?.data?.text || "",
      bottom: bottomRes?.data?.text || "",
    });

    const targetTitleScore = scoreTitleLine(targetedTitle);
    const fallbackTitleScore = scoreTitleLine(fallback.title);
    const targetAuthorScore = scoreAuthorLine(targetedAuthor);
    const fallbackAuthorScore = scoreAuthorLine(fallback.author);

    return {
      title:
        targetTitleScore >= fallbackTitleScore
          ? targetedTitle
          : normalizeCoverNameLikeText(fallback.title),
      author:
        targetAuthorScore >= fallbackAuthorScore
          ? targetedAuthor
          : normalizeCoverNameLikeText(fallback.author),
      q: usefulOcrLines(fullRes?.data?.text || "").slice(0, 6).join(" "),
      debugLines: usefulOcrLines(fullRes?.data?.text || "").slice(0, 8),
    };
  }

  async function fillFromLookup(isbn) {
    setIsbnBusy(true);
    setMsg("");

    try {
      const r = await lookupIsbn(isbn);
      const s = r?.suggested || r || {};

      const title = s.title_display || s.title || "";
      const subtitle = s.subtitle_display || "";
      const authorDisplay =
        s.name_display ||
        s.author_name_display ||
        (Array.isArray(s.authors) ? s.authors.filter(Boolean).join(", ") : "") ||
        "";
      const publisherDisplay = s.publisher_name_display || "";
      const pages = s.pages ?? null;
      const purchaseUrl = s.purchase_url || s.purchaseUrl || s.url || "";
      const originalLanguage = s.original_language || s.language || "";

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
        if (!String(prev.pages || "").trim() && pages != null) {
          next.pages = String(pages);
          changed = true;
        }
        if (!String(prev.purchase_url || "").trim() && purchaseUrl) {
          next.purchase_url = String(purchaseUrl);
          changed = true;
        }
        if (!String(prev.original_language || "").trim() && originalLanguage) {
          next.original_language = String(originalLanguage);
          changed = true;
        }
        if (!String(prev.publisher_id || "").trim() && String(s.publisher_id || "").trim()) {
          next.publisher_id = String(s.publisher_id).trim();
          changed = true;
        }
        if (!String(prev.publisher_name_display || "").trim() && publisherDisplay) {
          next.publisher_name_display = String(publisherDisplay);
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
        if (!String(prev.published_titles || "").trim() && s.published_titles != null && String(s.published_titles).trim()) {
          next.published_titles = String(s.published_titles).trim();
          changed = true;
        }
        if (!String(prev.number_of_millionsellers || "").trim() && s.number_of_millionsellers != null && String(s.number_of_millionsellers).trim()) {
          next.number_of_millionsellers = String(s.number_of_millionsellers).trim();
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

      if (changed) {
        setMsg("ISBN gefunden ✔ (Felder wurden ergänzt)");
      } else {
        setMsg("ISBN gefunden, aber es kamen nur wenige Metadaten zurück.");
      }
    } catch (e) {
      setMsg(e?.message || "ISBN Lookup fehlgeschlagen");
    } finally {
      setIsbnBusy(false);
    }
  }

  async function doCoverLookup() {
    if (!coverFile) {
      setMsg("Bitte zuerst ein Cover-Foto aufnehmen.");
      return;
    }

    if (hasIsbn) {
      setMsg("ISBN vorhanden – Cover OCR ist nur für Bücher ohne ISBN gedacht.");
      return;
    }

    setCoverInfoBusy(true);
    setMsg("");

    try {
      const ocr = await readCoverMetaFromImage(coverFile);

      const bestTitle = normalizeCoverNameLikeText(ocr.title || "");
      const bestAuthor = normalizeCoverNameLikeText(ocr.author || "");

      const titleOk = looksLikeReasonableTitle(bestTitle);
      const authorOk = looksLikeReasonableAuthor(bestAuthor);

      if (!titleOk && !authorOk) {
        setMsg("OCR unsicher – bitte Titel/Autor manuell eingeben.");
        return;
      }

      const next = {};

      if (titleOk && !String(v.title_display || "").trim()) {
        next.title_display = bestTitle;

        if (!String(v.title_keyword || "").trim()) {
          const { keyword, pos } = computeKeywordFromTitle(bestTitle);
          if (keyword) next.title_keyword = keyword;
          if (!String(v.title_keyword_position || "").trim() && pos) next.title_keyword_position = pos;
        }
      }

      if (authorOk) {
        const { first, last, display } = splitAuthorName(bestAuthor);
        if (!String(v.author_lastname || "").trim() && last) next.author_lastname = last;
        if (!String(v.author_firstname || "").trim() && first) next.author_firstname = first;
        if (!String(v.name_display || "").trim() && display) next.name_display = display;
      }

      if (Object.keys(next).length) {
        setV((prev) => ({ ...prev, ...next }));
        setMsg("Titel/Autor aus Cover erkannt ✔");
      } else {
        setMsg("OCR unsicher – bitte Titel/Autor manuell eingeben.");
      }
    } catch (e) {
      setMsg(e?.message || "Cover-Erkennung fehlgeschlagen.");
    } finally {
      setCoverInfoBusy(false);
    }
  }

  async function doIsbnLookup() {
    const n = normalizeIsbnInputs(v.isbn13, v.isbn10);
    const isbn = n.isbn13 || n.isbn10 || "";

    if (!isbn) {
      setMsg("Bitte ISBN eingeben (ISBN-13 oder ISBN-10).");
      return;
    }

    if (!n.lookupOk) {
      setMsg(
        "ISBN sieht ungültig aus (Prüfziffer). Du kannst trotzdem speichern – Lookup übersprungen."
      );
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

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    const payload = {};

    if (coverPrepBusy) {
      return setMsg("Cover wird noch vorbereitet. Bitte kurz warten.");
    }

    if (!isEdit && !assignBarcode && !coverFile) {
      return setMsg("Bitte zuerst ein Cover-Foto aufnehmen.");
    }

    if (!isEdit) payload.assign_barcode = !!assignBarcode;

    const addIfChanged = (key, next, prev) => {
      if (next === prev) return;
      payload[key] = next;
    };

    const nextBarcode = v.barcode.trim();
    const suggestedBarcode = String(barcodePreview?.candidate || "").trim();
    const finalBarcode = nextBarcode || suggestedBarcode;

    const wCm = parseFloatOrNull(v.width_cm);
    const hCm = parseFloatOrNull(v.height_cm);

    if (!isEdit && assignBarcode && !finalBarcode) {
      const ok =
        Number.isFinite(wCm) &&
        wCm > 0 &&
        Number.isFinite(hCm) &&
        hCm > 0;
      if (!ok) {
        return setMsg(
          "Bitte Barcode eingeben ODER Breite + Höhe (cm) angeben, damit ein Barcode automatisch gewählt werden kann."
        );
      }
    }

    if (!lockBarcode && !isEdit && assignBarcode && finalBarcode) {
      payload.barcode = finalBarcode;
    }
    if (!isEdit && Number.isFinite(wCm) && wCm > 0) payload.width_cm = wCm;
    if (!isEdit && Number.isFinite(hCm) && hCm > 0) payload.height_cm = hCm;

    const isbnN = normalizeIsbnInputs(v.isbn13, v.isbn10);

    const strPairs = [
      ["author_lastname", v.author_lastname, initial.author_lastname],
      ["author_firstname", v.author_firstname, initial.author_firstname],
      ["name_display", v.name_display, initial.name_display],
      ["author_abbreviation", v.author_abbreviation, initial.author_abbreviation],
      ["author_nationality", v.author_nationality, initial.author_nationality],
      ["place_of_birth", v.place_of_birth, initial.place_of_birth],
      ["male_female", v.male_female, initial.male_female],
      ["publisher_name_display", v.publisher_name_display, initial.publisher_name_display],
      ["publisher_abbr", v.publisher_abbr, initial.publisher_abbr],
      ["title_display", v.title_display, initial.title_display],
      ["subtitle_display", v.subtitle_display, initial.subtitle_display],
      ["title_keyword", v.title_keyword, initial.title_keyword],
      ["title_keyword2", v.title_keyword2, initial.title_keyword2],
      ["title_keyword3", v.title_keyword3, initial.title_keyword3],
      ["purchase_url", v.purchase_url, initial.purchase_url],
      ["original_language", v.original_language, initial.original_language],
      ["comment", v.comment, initial.comment],
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

    const nextAuthorId = String(v.author_id || "").trim() || null;
    const prevAuthorId = String(initial.author_id || "").trim() || null;
    const nextPublisherId = String(v.publisher_id || "").trim() || null;
    const prevPublisherId = String(initial.publisher_id || "").trim() || null;
    if (!isEdit) {
      if (nextAuthorId) payload.author_id = nextAuthorId;
      if (nextPublisherId) payload.publisher_id = nextPublisherId;
    } else {
      addIfChanged("author_id", nextAuthorId, prevAuthorId);
      addIfChanged("publisher_id", nextPublisherId, prevPublisherId);
    }

    if (!isEdit) {
      if (isbnN.isbn13) payload.isbn13 = isbnN.isbn13;
      if (isbnN.isbn10) payload.isbn10 = isbnN.isbn10;
      if (!isbnN.isbn13 && !isbnN.isbn10 && isbnN.raw) {
        payload.isbn13_raw = isbnN.raw;
      }
    } else {
      const prevN = normalizeIsbnInputs(initial.isbn13, initial.isbn10);
      const next13 = isbnN.isbn13;
      const next10 = isbnN.isbn10;
      const prev13 = prevN.isbn13;
      const prev10 = prevN.isbn10;
      if (next13 !== prev13) payload.isbn13 = next13 || null;
      if (next10 !== prev10) payload.isbn10 = next10 || null;
      if (!next13 && !next10 && isbnN.raw) payload.isbn13_raw = isbnN.raw;
    }

    const intPairs = [
      ["title_keyword_position", v.title_keyword_position, initial.title_keyword_position],
      ["title_keyword2_position", v.title_keyword2_position, initial.title_keyword2_position],
      ["title_keyword3_position", v.title_keyword3_position, initial.title_keyword3_position],
      ["pages", v.pages, initial.pages],
      ["published_titles", v.published_titles, initial.published_titles],
      ["number_of_millionsellers", v.number_of_millionsellers, initial.number_of_millionsellers],
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

    let jobId = null;
    if (!isEdit) {
      jobId =
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random()}`;
      const flow = assignBarcode && draftSelectedId ? "finalize" : "create";

      const jobPayload = { ...payload };
      if (flow === "create") jobPayload.requestId = jobId;
      if (flow === "finalize") delete jobPayload.assign_barcode;

      await upsertUploadJob({
        id: jobId,
        createdAt: Date.now(),
        status: "pending",
        retries: 0,
        flow,
        draftId: flow === "finalize" ? draftSelectedId : null,
        payload: jobPayload,
        step: "create",
        cover: coverFile || null,
        coverName: coverFile?.name || "cover.jpg",
      });
      refreshPending();
    }

    if (coverFile && (coverFile.size ?? 0) < 1024) {
      setMsg(
        "Cover-Foto ist leer (0 Bytes). Bitte Foto erneut aufnehmen (iOS/PWA Bug) und erneut speichern."
      );
      return;
    }

    setBusy(true);
    try {
      let saved;
      if (isEdit) {
        saved = await updateBook(
          bookId || initialBook?._id || initialBook?.id,
          payload
        );
      } else if (assignBarcode && draftSelectedId) {
        const p2 = { ...payload };
        delete p2.assign_barcode;
        saved = await registerExistingBook(draftSelectedId, p2);
      } else {
        const p2 = jobId ? { ...payload, requestId: jobId } : payload;
        saved = await registerBook(p2);
      }

      const savedId =
        saved?.id ||
        saved?._id ||
        draftSelectedId ||
        bookId ||
        initialBook?._id ||
        initialBook?.id;

      if (jobId) {
        const flow = assignBarcode && draftSelectedId ? "finalize" : "create";
        const jobPayload =
          flow === "finalize"
            ? (() => {
                const p2 = { ...payload };
                delete p2.assign_barcode;
                return p2;
              })()
            : { ...payload, requestId: jobId };

        if (coverFile && savedId) {
          await upsertUploadJob({
            id: jobId,
            createdAt: Date.now(),
            status: "pending",
            retries: 0,
            flow,
            draftId: flow === "finalize" ? draftSelectedId : null,
            payload: jobPayload,
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
        } catch (e) {
          coverUploadFailed = true;
          setMsg(
            `${isEdit ? "Gespeichert" : "Gespeichert"}, aber Cover-Upload fehlgeschlagen: ${
              e?.message || "Fehler"
            }`
          );
        }
      }

      onSuccess && onSuccess({ payload, saved });
      if (!coverUploadFailed) setMsg(isEdit ? "Gespeichert." : "Gespeichert ✔");

      if (!isEdit) {
        setV({ ...initial, barcode: "", width_cm: "", height_cm: "" });
        setExtras({});
        setAc({ field: "", items: [] });
        setBarcodePreview(null);
        setBarcodePreviewErr("");
        setDraftCandidates([]);
        setDraftSelectedId("");
      }
    } catch (err) {
      setMsg(
        `${err?.message || "Fehler beim Speichern"}. ` +
          (jobId
            ? "Sicherheitsnetz aktiv: Daten wurden lokal gespeichert und können später erneut hochgeladen werden (Online gehen → App öffnen)."
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
                ? "✅ Vorhandener Eintrag gefunden – Registrierung aktualisiert diesen Eintrag"
                : "Mehrere vorhandene Einträge gefunden – bitte auswählen"}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                  onClick={() => setDraftSelectedId("")}
                >
                  Als neuen Eintrag anlegen
                </button>
              </div>
              {draftCandidates.slice(0, 6).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDraftSelectedId(d.id)}
                  className="zr-card"
                  style={{
                    padding: 8,
                    cursor: "pointer",
                    borderColor:
                      d.id === draftSelectedId
                        ? "rgba(0,0,0,0.35)"
                        : "rgba(0,0,0,0.12)",
                    width: 220,
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <img
                      src={d.coverUrl || `/media/covers/${d.id}.jpg`}
                      alt="cover"
                      style={{
                        width: 72,
                        height: 96,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <div style={{ display: "grid", gap: 2, fontSize: 12 }}>
                      <div style={{ fontWeight: 700 }}>{draftTitle(d) || "Ohne Titel"}</div>
                      <div>{draftAuthor(d) || "—"}</div>
                      <div>{d.publisher_name_display || "—"}</div>
                      <div>Verlags-Abk.: {d.publisher_abbr || "—"}</div>
                      <div>Autor-Abk.: {d.author_abbreviation || "—"}</div>
                      <div>{d.isbn13 || d.isbn10 ? `ISBN: ${d.isbn13 || d.isbn10}` : "ohne ISBN"}</div>
                      <div>{String(d.added_at || "").slice(0, 10)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedDraft ? (
              <div className="zr-card" style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 700 }}>Übernommener vorhandener Eintrag</div>
                <div><strong>Titel:</strong> {selectedDraft.title_display || "—"}</div>
                <div><strong>Untertitel:</strong> {selectedDraft.subtitle_display || "—"}</div>
                <div><strong>Stichwort:</strong> {selectedDraft.title_keyword || "—"}</div>
                <div><strong>Autor Vorname:</strong> {selectedDraft.author_first_name || "—"}</div>
                <div><strong>Autor Nachname:</strong> {selectedDraft.author_last_name || "—"}</div>
                <div><strong>Autor Anzeigename:</strong> {selectedDraft.author_name_display || "—"}</div>
                <div><strong>Autor Abkürzung:</strong> {selectedDraft.author_abbreviation || "—"}</div>
                <div><strong>Verlag Anzeigename:</strong> {selectedDraft.publisher_name_display || "—"}</div>
                <div><strong>Verlag Abkürzung:</strong> {selectedDraft.publisher_abbr || "—"}</div>
                <div><strong>ISBN-13:</strong> {selectedDraft.isbn13 || "—"}</div>
                <div><strong>ISBN-10:</strong> {selectedDraft.isbn10 || "—"}</div>
                <div><strong>Seiten:</strong> {selectedDraft.pages ?? "—"}</div>
                <div><strong>Breite:</strong> {selectedDraft.width_cm ?? "—"}</div>
                <div><strong>Höhe:</strong> {selectedDraft.height_cm ?? "—"}</div>
                <div><strong>Sprache:</strong> {selectedDraft.original_language || "—"}</div>
                <div><strong>Kommentar:</strong> {selectedDraft.comment || "—"}</div>
                <div><strong>added_at:</strong> {selectedDraft.added_at || "—"}</div>
                <div><strong>registered_at:</strong> {selectedDraft.registered_at || "—"}</div>
                <div><strong>Status:</strong> {selectedDraft.reading_status || "—"}</div>
              </div>
            ) : null}
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
          <div style={{ fontWeight: 900 }}>
            Breite/Höhe für Barcode-Vorschlag (optional)
          </div>

          <div className="zr-toolbar">
            <label style={{ display: "grid", gap: 6, flex: 1 }}>
              <span>Breite (cm) (width_cm)</span>
              <input
                className="zr-input"
                name="width_cm"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                pattern="[0-9]*[\\.,]?[0-9]*"
                value={v.width_cm}
                onChange={(e) => setField("width_cm", e.target.value)}
                onInput={(e) => setField("width_cm", e.currentTarget.value)}
                placeholder="z.B. 13,5"
                style={{ width: "100%" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, flex: 1 }}>
              <span>Höhe (cm) (height_cm)</span>
              <input
                className="zr-input"
                name="height_cm"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                pattern="[0-9]*[\\.,]?[0-9]*"
                value={v.height_cm}
                onChange={(e) => setField("height_cm", e.target.value)}
                onInput={(e) => setField("height_cm", e.currentTarget.value)}
                placeholder="z.B. 21"
                style={{ width: "100%" }}
              />
            </label>
          </div>

          {barcodePreview?.candidate ? (
            <div className="zr-toolbar" style={{ alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>
                  Vorschlag: {barcodePreview.candidate}
                </div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>
                  Wird beim Speichern automatisch verwendet (wenn das Barcode-Feld leer ist).
                </div>
                <div style={{ opacity: 0.75, fontSize: 13 }}>
                  {barcodePreview.color ? `Serie: ${barcodePreview.color}` : null}
                  {barcodePreview.band ? ` • Band: ${barcodePreview.band}` : null}
                  {barcodePreview.availableCount != null
                    ? ` • verfügbar: ${barcodePreview.availableCount}`
                    : null}
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
      ) : null}

      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Cover Foto (iPhone)</div>
        <div style={{ opacity: 0.8, fontSize: 13 }}>
          Tippen → Kamera öffnet sich → Foto wird automatisch als <code>&lt;book_id&gt;.jpg</code>{" "}
          gespeichert.
        </div>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy || coverPrepBusy}
          onChange={handleCoverChange}
        />

        {coverPrepBusy ? (
          <div style={{ opacity: 0.8, fontSize: 13 }}>Cover wird vorbereitet…</div>
        ) : null}

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

      <div className="zr-toolbar" style={{ alignItems: "center", gap: 10 }}>
        <button
          type="button"
          className="zr-btn2 zr-btn2--ghost"
          disabled={busy || coverPrepBusy || coverInfoBusy || !coverFile || hasIsbn}
          onClick={doCoverLookup}
        >
          {coverInfoBusy ? "Erkenne…" : "Titel/Autor aus Cover"}
        </button>

        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {hasIsbn
            ? "ISBN vorhanden – Cover OCR ist deaktiviert."
            : "Nur für Bücher ohne ISBN."}
        </div>
      </div>

      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1, position: "relative" }}>
          <span>Autor (author_lastname)</span>
          <input
            className="zr-input"
            value={v.author_lastname}
            onChange={(e) => {
              setAuthorIdentityField("author_lastname", e.target.value);
              runAutocomplete("author_lastname", e.target.value);
            }}
            onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 150)}
          />
          {ac.field === "author_lastname" && ac.items.length ? (
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
              {ac.items.map((it, index) => (
                <button
                  key={suggestionKey(it, index)}
                  type="button"
                  className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    marginBottom: 4,
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (it && typeof it === "object") {
                      applyAuthorMatch(it, { overwriteIdentity: true, fillOnly: false });
                    } else {
                      const picked = String(it || "").trim();
                      const parts = picked.split(/\s+/).filter(Boolean);
                      const maybeLast = parts.length > 1 ? parts[parts.length - 1] : picked;
                      const maybeFirst = parts.length > 1 ? parts.slice(0, -1).join(" ") : "";
                      setV((prev) => ({
                        ...prev,
                        author_id: "",
                        author_lastname: maybeLast,
                        author_firstname: prev.author_firstname || maybeFirst,
                        name_display: prev.name_display || picked,
                      }));
                    }
                    setAc({ field: "", items: [] });
                  }}
                >
                  <span>{authorSuggestionLabel(it)}</span>
                  {it && typeof it === "object" ? (
                    <span style={{ fontSize: 12, opacity: 0.72 }}>
                      {[it.author_nationality, it.male_female].filter(Boolean).join(" · ") || "Autor aus DB"}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </label>

        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Vorname (optional)</span>
          <input
            className="zr-input"
            value={v.author_firstname}
            onChange={(e) => setAuthorIdentityField("author_firstname", e.target.value)}
          />
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Autor Anzeigename (name_display) (optional)</span>
        <input
          className="zr-input"
          value={v.name_display}
          onChange={(e) => setAuthorIdentityField("name_display", e.target.value)}
        />
      </label>

      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Autor Abkürzung (author_abbreviation) (optional)</span>
          <input
            className="zr-input"
            value={v.author_abbreviation}
            onChange={(e) => setAuthorIdentityField("author_abbreviation", e.target.value)}
          />
        </label>
      </div>

      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Nationalität (author_nationality) (optional)</span>
          <input
            className="zr-input"
            value={v.author_nationality}
            onChange={(e) => setField("author_nationality", e.target.value)}
          />
        </label>
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Geburtsort (place_of_birth) (optional)</span>
          <input
            className="zr-input"
            value={v.place_of_birth}
            onChange={(e) => setField("place_of_birth", e.target.value)}
          />
        </label>
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Geschlecht (male_female) (optional)</span>
          <input
            className="zr-input"
            value={v.male_female}
            onChange={(e) => setField("male_female", e.target.value)}
          />
        </label>
      </div>

      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Veröffentlichte Titel (published_titles) (optional)</span>
          <input
            className="zr-input"
            type="text"
            inputMode="numeric"
            value={v.published_titles}
            onChange={(e) => setField("published_titles", e.target.value)}
          />
        </label>
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Millionenseller (number_of_millionsellers) (optional)</span>
          <input
            className="zr-input"
            type="text"
            inputMode="numeric"
            value={v.number_of_millionsellers}
            onChange={(e) => setField("number_of_millionsellers", e.target.value)}
          />
        </label>
      </div>

      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Titel anzeigen (title_display) (optional)</span>
          <input
            className="zr-input"
            value={v.title_display}
            onChange={(e) => setField("title_display", e.target.value)}
          />
        </label>
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Untertitel (subtitle_display) (optional)</span>
          <input
            className="zr-input"
            value={v.subtitle_display}
            onChange={(e) => setField("subtitle_display", e.target.value)}
          />
        </label>
      </div>

      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Stichwort (title_keyword)</span>
          <input
            className="zr-input"
            value={v.title_keyword}
            onChange={(e) => {
              setField("title_keyword", e.target.value);
              runAutocomplete("title_keyword", e.target.value);
            }}
            onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 150)}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Position (title_keyword_position)</span>
          <input
            className="zr-input"
            type="text"
            inputMode="numeric"
            value={v.title_keyword_position}
            onChange={(e) => setField("title_keyword_position", e.target.value)}
          />
        </label>
      </div>

      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>Weitere Stichworte (optional)</div>
        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>title_keyword2</span>
            <input
              className="zr-input"
              value={v.title_keyword2}
              onChange={(e) => setField("title_keyword2", e.target.value)}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>title_keyword2_position</span>
            <input
              className="zr-input"
              type="text"
              inputMode="numeric"
              value={v.title_keyword2_position}
              onChange={(e) => setField("title_keyword2_position", e.target.value)}
            />
          </label>
        </div>
        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>title_keyword3</span>
            <input
              className="zr-input"
              value={v.title_keyword3}
              onChange={(e) => setField("title_keyword3", e.target.value)}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>title_keyword3_position</span>
            <input
              className="zr-input"
              type="text"
              inputMode="numeric"
              value={v.title_keyword3_position}
              onChange={(e) => setField("title_keyword3_position", e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="zr-toolbar">
        <label style={{ display: "grid", gap: 6, flex: 1, position: "relative" }}>
          <span>Verlag Anzeigename (publisher_name_display)</span>
          <input
            className="zr-input"
            value={v.publisher_name_display}
            onChange={(e) => {
              setPublisherIdentityField("publisher_name_display", e.target.value);
              runAutocomplete("publisher_name_display", e.target.value);
            }}
            onBlur={() => setTimeout(() => setAc({ field: "", items: [] }), 150)}
          />
          {ac.field === "publisher_name_display" && ac.items.length ? (
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
              {ac.items.map((it, index) => (
                <button
                  key={suggestionKey(it, index)}
                  type="button"
                  className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                  style={{
                    width: "100%",
                    justifyContent: "flex-start",
                    marginBottom: 4,
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (it && typeof it === "object") {
                      applyPublisherMatch(it, { overwriteIdentity: true, fillOnly: false });
                    } else {
                      const picked = String(it || "").trim();
                      setPublisherIdentityField("publisher_name_display", picked);
                    }
                    setAc({ field: "", items: [] });
                  }}
                >
                  <span>{publisherSuggestionLabel(it)}</span>
                  {it && typeof it === "object" && String(it.abbr || "").trim() ? (
                    <span style={{ fontSize: 12, opacity: 0.72 }}>Verlag aus DB</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </label>

        <label style={{ display: "grid", gap: 6, flex: 1 }}>
          <span>Verlag Abkürzung (publisher_abbr)</span>
          <input
            className="zr-input"
            value={v.publisher_abbr}
            onChange={(e) => setPublisherIdentityField("publisher_abbr", e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Seiten (pages)</span>
          <input
            className="zr-input"
            type="text"
            inputMode="numeric"
            value={v.pages}
            onChange={(e) => setField("pages", e.target.value)}
          />
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Kommentar (optional)</span>
        <textarea
          className="zr-input"
          rows={3}
          value={v.comment}
          onChange={(e) => setField("comment", e.target.value)}
        />
      </label>

      <div className="zr-card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>ISBN & Kauf-Link (optional)</div>

        <input
          ref={isbnPhotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleIsbnPhotoChange}
        />

        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>ISBN-13</span>
            <input
              className="zr-input"
              value={v.isbn13}
              onChange={(e) => setField("isbn13", e.target.value)}
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

        <div
          className="zr-toolbar"
          style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}
        >
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

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Live-Scanner: Barcode einfach in den Rahmen halten. Kein Foto nötig.
          </div>
        </div>

        <div className="zr-toolbar">
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>purchase_url</span>
            <input
              className="zr-input"
              value={v.purchase_url}
              onChange={(e) => setField("purchase_url", e.target.value)}
              placeholder="https://…"
            />
          </label>
          <label style={{ display: "grid", gap: 6, width: 220 }}>
            <span>Originalsprache (original_language)</span>
            <input
              className="zr-input"
              value={v.original_language}
              onChange={(e) => setField("original_language", e.target.value)}
              placeholder="z.B. en"
            />
          </label>
        </div>
      </div>

      {isEdit && showUnknownFields && Object.keys(extras || {}).length ? (
        <div className="zr-card" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 900 }}>Weitere Felder</div>
          {Object.keys(extras)
            .sort((a, b) => a.localeCompare(b))
            .map((k) => (
              <label key={k} style={{ display: "grid", gap: 6 }}>
                <span>{k}</span>
                <input
                  className="zr-input"
                  value={extras[k] ?? ""}
                  onChange={(e) => setExtra(k, e.target.value)}
                />
              </label>
            ))}
        </div>
      ) : null}

      {scannerOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "#000",
          }}
        >
          <video
            ref={isbnVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
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

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
            }}
          >
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

      <div className="zr-toolbar" style={{ marginTop: 4 }}>
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
            }}
            title="Versucht lokal gespeicherte Uploads erneut"
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
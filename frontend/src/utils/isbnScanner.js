// frontend/src/utils/isbnScanner.js
import { BrowserMultiFormatReader } from "@zxing/browser";

const BOOK_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

function cleanCode(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^0-9X]/g, "");
}

function extractIsbnCandidate(raw) {
  const s = cleanCode(raw);

  // Prefer real Bookland ISBN-13
  const bookland = s.match(/97[89]\d{10}/);
  if (bookland) return bookland[0];

  // Fallbacks
  const ean13 = s.match(/\d{13}/);
  if (ean13) return ean13[0];

  const isbn10 = s.match(/\d{9}[0-9X]/);
  if (isbn10) return isbn10[0];

  return "";
}

function stopVideo(videoEl) {
  const stream = videoEl?.srcObject;
  if (stream && typeof stream.getTracks === "function") {
    for (const track of stream.getTracks()) track.stop();
  }
  if (videoEl) videoEl.srcObject = null;
}

async function startNativeDetector(videoEl, onDetected) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });

  videoEl.srcObject = stream;
  videoEl.setAttribute("playsinline", "true");
  await videoEl.play();

  const supported =
    typeof globalThis.BarcodeDetector?.getSupportedFormats === "function"
      ? await globalThis.BarcodeDetector.getSupportedFormats().catch(() => [])
      : [];

  const formats = BOOK_FORMATS.filter((f) => supported.includes(f));
  const detector = formats.length
    ? new globalThis.BarcodeDetector({ formats })
    : new globalThis.BarcodeDetector();

  let stopped = false;
  let rafId = 0;

  const tick = async () => {
    if (stopped) return;

    try {
      const found = await detector.detect(videoEl);
      for (const item of found || []) {
        const isbn = extractIsbnCandidate(item?.rawValue || "");
        if (isbn) {
          onDetected(isbn);
          return;
        }
      }
    } catch {
      // keep scanning
    }

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return () => {
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    stopVideo(videoEl);
  };
}

async function startZxingDetector(videoEl, onDetected) {
  const reader = new BrowserMultiFormatReader();

  const controls = await reader.decodeFromConstraints(
    {
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    },
    videoEl,
    (result) => {
      const raw = result?.getText?.() || result?.text || "";
      const isbn = extractIsbnCandidate(raw);
      if (isbn) onDetected(isbn);
    }
  );

  return () => {
    try {
      controls?.stop?.();
    } catch {
      // ignore
    }
    try {
      reader.reset?.();
    } catch {
      // ignore
    }
    stopVideo(videoEl);
  };
}

export async function startIsbnScanner({ videoEl, onDetected }) {
  if (!videoEl) {
    throw new Error("Scanner-Videoelement fehlt.");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Kamera wird in diesem Browser nicht unterstützt.");
  }

  let handled = false;
  let stopInner = () => {};

  const finish = (isbn) => {
    if (handled) return;
    handled = true;
    stopInner();
    Promise.resolve(onDetected(isbn)).catch(() => {});
  };

  if ("BarcodeDetector" in globalThis) {
    try {
      stopInner = await startNativeDetector(videoEl, finish);
      return () => stopInner();
    } catch {
      stopVideo(videoEl);
    }
  }

  stopInner = await startZxingDetector(videoEl, finish);
  return () => stopInner();
}
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

  const bookland = s.match(/97[89]\d{10}/);
  if (bookland) return bookland[0];

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

function waitForVideoReady(videoEl, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    if (!videoEl) {
      reject(new Error("Scanner-Videoelement fehlt."));
      return;
    }

    if (videoEl.readyState >= 2) {
      resolve();
      return;
    }

    let done = false;
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      videoEl.removeEventListener("loadedmetadata", onReady);
      videoEl.removeEventListener("canplay", onReady);
      fn(value);
    };

    const onReady = () => finish(resolve);

    const timer = setTimeout(() => {
      finish(reject, new Error("Kamera konnte nicht initialisiert werden."));
    }, timeoutMs);

    videoEl.addEventListener("loadedmetadata", onReady, { once: true });
    videoEl.addEventListener("canplay", onReady, { once: true });
  });
}

function cameraErrorMessage(err) {
  const name = String(err?.name || "");
  const msg = String(err?.message || "").trim();

  if (!window.isSecureContext) {
    return "Live-Scanner braucht HTTPS oder localhost.";
  }

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Kamerazugriff verweigert. Bitte Kamera im Browser erlauben.";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Keine Kamera gefunden.";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Kamera ist bereits in Benutzung oder blockiert.";
  }

  if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
    return "Passende Kamera-Konfiguration nicht verfügbar.";
  }

  if (name === "AbortError") {
    return "Kamera-Start wurde abgebrochen.";
  }

  return msg || "Kamera konnte nicht gestartet werden.";
}

async function getCameraStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
  } catch (err) {
    throw new Error(cameraErrorMessage(err));
  }
}

async function attachStreamToVideo(videoEl, stream) {
  videoEl.srcObject = stream;
  videoEl.muted = true;
  videoEl.autoplay = true;
  videoEl.setAttribute("playsinline", "true");
  videoEl.setAttribute("webkit-playsinline", "true");

  await waitForVideoReady(videoEl);

  try {
    await videoEl.play();
  } catch {
    // ignore; many browsers still render the stream after metadata is ready
  }
}

async function startNativeDetector(videoEl, onDetected) {
  const stream = await getCameraStream();
  await attachStreamToVideo(videoEl, stream);

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
  let controls = null;

  try {
    controls = await reader.decodeFromConstraints(
      {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      videoEl,
      (result) => {
        const raw = result?.getText?.() || result?.text || "";
        const isbn = extractIsbnCandidate(raw);
        if (isbn) onDetected(isbn);
      }
    );
  } catch (err) {
    try {
      reader.reset?.();
    } catch {
      // ignore
    }
    stopVideo(videoEl);
    throw new Error(cameraErrorMessage(err));
  }

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

  if (!window.isSecureContext) {
    throw new Error(
      `Live-Scanner braucht HTTPS oder localhost. Aktuelle URL: ${location.href}`
    );
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      `getUserMedia fehlt. URL=${location.href} | secure=${window.isSecureContext}`
    );
  }

  let handled = false;
  let stopInner = () => {};

  const finish = (isbn) => {
    if (handled) return;
    handled = true;

    try {
      stopInner();
    } catch {
      // ignore
    }

    Promise.resolve(onDetected?.(isbn)).catch(() => {});
  };

  if ("BarcodeDetector" in globalThis) {
    try {
      stopInner = await startNativeDetector(videoEl, finish);
      return () => {
        try {
          stopInner();
        } catch {
          // ignore
        }
      };
    } catch {
      stopVideo(videoEl);
    }
  }

  stopInner = await startZxingDetector(videoEl, finish);
  return () => {
    try {
      stopInner();
    } catch {
      // ignore
    }
  };
}
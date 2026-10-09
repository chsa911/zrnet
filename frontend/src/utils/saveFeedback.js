// frontend/src/utils/saveFeedback.js
// Shared helpers so every "Speichern"/"Upload" in the app gives the same,
// understandable feedback and can be retried safely.

export const BOOK_SAVE_ERROR_MESSAGES = {
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
  network_error:
    "Server nicht erreichbar. Bitte Internetverbindung prüfen und erneut versuchen – deine Eingaben bleiben erhalten.",
  timeout:
    "Der Server hat nicht rechtzeitig geantwortet. Bitte erneut auf Speichern tippen – es entsteht dabei kein Duplikat.",
  http_413: "Die Datei ist zu groß für den Server.",
  http_502: "Server gerade nicht erreichbar (502). Bitte gleich erneut versuchen.",
  http_503: "Server gerade nicht erreichbar (503). Bitte gleich erneut versuchen.",
  http_504: "Server hat nicht rechtzeitig geantwortet (504). Bitte erneut versuchen – es entsteht kein Duplikat.",
  missing_file: "Kein Cover-Foto übermittelt.",
  empty_file: "Cover-Foto ist leer. Bitte Foto erneut aufnehmen.",
  book_not_found_for_cover: "Buch für den Cover-Upload nicht gefunden.",
  cover_upload_failed: "Cover konnte auf dem Server nicht gespeichert werden.",
  missing_book_id_in_response:
    "Der Server hat das Speichern nicht bestätigt (keine Buch-ID). Bitte erneut speichern – es entsteht kein Duplikat.",
  internal_error: "Speichern ist fehlgeschlagen (Serverfehler). Bitte erneut versuchen.",
};

// Turns a thrown error from the books API into a friendly German message.
// api/books.js throws errors with:
//   err.code       backend `error` code, or "network_error" / "timeout" / "http_<status>"
//   err.status     HTTP status (missing when there was no response at all)
//   err.message    backend `message` if it sent a human-readable one, else the code
export function friendlySaveErrorMessage(err, fallback = "Fehler beim Speichern.") {
  if (!err) return fallback;

  if (err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(String(err?.message))) {
    return BOOK_SAVE_ERROR_MESSAGES.network_error;
  }

  const raw = String(err?.message || "").trim();
  const code = String(err?.code || "").trim();

  // If the backend already sent a human-readable message (contains spaces /
  // umlauts), trust it as-is.
  if (raw && /[ äöüß]/i.test(raw)) return raw;

  const known = BOOK_SAVE_ERROR_MESSAGES[code] || BOOK_SAVE_ERROR_MESSAGES[raw];
  if (known) return known;

  if (!raw && !code) return fallback;
  return `${fallback.replace(/\.$/, "")} (${code || raw}).`;
}

// True when we never got an answer from the server. In that case the save may
// or may not have happened – retrying with the SAME requestId is safe because
// the backend returns the already-created book instead of creating a second one.
export function isNoResponseError(err) {
  return !!err?.noResponse || err instanceof TypeError;
}

// One id per "logical" save. Reuse it for every retry of the same entry and
// drop it after a confirmed success.
export function newRequestId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

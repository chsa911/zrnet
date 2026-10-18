// backend/utils/saveFailures.js
//
// "Offene Vorgänge": registrations that were rejected / never finished and
// have not been dealt with yet. SINGLE SOURCE OF TRUTH for the admin banner,
// the list page and the persistence watcher (scripts/checkPersistence.js).
//
// Source: public.book_save_attempts (logged before the save transaction, so
// it survives rollbacks). Several attempts for the same title are ONE
// Vorgang. A Vorgang disappears when
//   - the book was saved successfully later (same request_id or same title),
//   - it was re-registered from the list (followup_status = 'done'), or
//   - it was dismissed on purpose (followup_status = 'dismissed').
// Pure input errors (missing fields, no size) are not Vorgänge: the form
// showed them and nothing was lost.

const INPUT_ERROR_RE = "^(missing_required_fields|width_and_height_required|no_series_for_size|invalid_id|not_found)";

// $1 = max age in days (NULL = no limit)
const OPEN_FAILURES_SQL = `
  WITH open_attempts AS (
    SELECT a.*
    FROM public.book_save_attempts a
    WHERE (a.status = 'failed'
           OR (a.status = 'pending' AND a.created_at < now() - interval '10 minutes'))
      AND a.followup_status IS NULL
      AND nullif(btrim(a.title_display), '') IS NOT NULL
      AND coalesce(a.error_message, '') !~ '${INPUT_ERROR_RE}'
      AND ($1::int IS NULL OR a.created_at >= now() - make_interval(days => $1::int))
      -- later saved successfully?
      AND NOT EXISTS (
        SELECT 1 FROM public.book_save_attempts s
        WHERE s.status = 'success'
          AND s.created_at > a.created_at
          AND (s.request_id = a.request_id
               OR lower(btrim(s.title_display)) = lower(btrim(a.title_display)))
      )
      -- or registered by some other way afterwards?
      AND NOT EXISTS (
        SELECT 1 FROM public.books b
        WHERE lower(btrim(b.title_display)) = lower(btrim(a.title_display))
          AND b.registered_at > a.created_at
      )
  )
  SELECT
    md5(lower(btrim(min(title_display))))                       AS key,
    array_agg(id ORDER BY created_at)                           AS ids,
    (array_agg(title_display ORDER BY created_at DESC))[1]      AS title,
    (array_agg(author_input ORDER BY created_at DESC)
       FILTER (WHERE author_input IS NOT NULL))[1]              AS author,
    (array_agg(pages ORDER BY created_at DESC)
       FILTER (WHERE pages IS NOT NULL))[1]                     AS pages,
    (array_agg(requested_barcode ORDER BY created_at DESC)
       FILTER (WHERE requested_barcode IS NOT NULL))[1]         AS barcode,
    (array_agg(width_cm ORDER BY created_at DESC)
       FILTER (WHERE width_cm IS NOT NULL))[1]                  AS width_cm,
    (array_agg(height_cm ORDER BY created_at DESC)
       FILTER (WHERE height_cm IS NOT NULL))[1]                 AS height_cm,
    (array_agg(book_id ORDER BY created_at DESC)
       FILTER (WHERE book_id IS NOT NULL))[1]                   AS book_id,
    (array_agg(coalesce(error_message, status) ORDER BY created_at DESC))[1] AS error,
    (array_agg(payload ORDER BY created_at DESC)
       FILTER (WHERE payload IS NOT NULL))[1]                   AS payload,
    count(*)::int                                               AS attempts,
    min(created_at)                                             AS first_at,
    max(created_at)                                             AS last_at
  FROM open_attempts
  GROUP BY lower(btrim(title_display))
  ORDER BY max(created_at) DESC
`;

// Readable German reason for a stored error message.
function friendlyReason(error) {
  const e = String(error || "");
  if (/phys_code/i.test(e))
    return "Die Buch-Nummer (Maße, Seiten, Position, Kapitel, letztes Wort) gehörte bereits zu einem anderen Buch.";
  if (/barcode_already_assigned|book_barcode_link_failed/i.test(e))
    return "Der Barcode war bereits einem anderen Buch zugewiesen.";
  if (/barcode_has_unresolved_conflict/i.test(e))
    return "Der Barcode hat eine ungelöste Konflikt-Markierung.";
  if (/no_barcodes_available/i.test(e)) return "Für diese Größe war kein freier Barcode mehr verfügbar.";
  if (/barcode_not_found/i.test(e)) return "Der Barcode existiert nicht im Barcode-Bestand.";
  if (/barcode_wrong_(position|prefix)/i.test(e)) return "Der Barcode passt nicht zur Größe des Buchs.";
  if (/registration_not_persisted/i.test(e))
    return "Die Registrierung wurde nicht vollständig gespeichert (Nachprüfung fehlgeschlagen).";
  if (/near_duplicate_book_blocked/i.test(e)) return "Ein sehr ähnliches Buch war gerade angelegt worden.";
  if (/duplicate key|23505/i.test(e)) return "Ein Wert war bereits bei einem anderen Buch vergeben (Duplikat).";
  if (e === "pending") return "Das Speichern wurde nie abgeschlossen (Abbruch oder Serverfehler).";
  return e ? `Serverfehler: ${e}` : "Unbekannter Fehler.";
}

async function listOpenFailures(db, { days = null } = {}) {
  const d = Number.isFinite(Number(days)) && Number(days) > 0 ? Math.trunc(Number(days)) : null;
  const { rows } = await db.query(OPEN_FAILURES_SQL, [d]);
  return rows.map((r) => ({ ...r, reason: friendlyReason(r.error) }));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanIds(ids) {
  return (Array.isArray(ids) ? ids : [])
    .map((x) => String(x || "").trim())
    .filter((x) => UUID_RE.test(x))
    .slice(0, 500);
}

// Mark attempts as dealt with. status: 'dismissed' | 'done'
async function closeFailures(db, ids, { status = "dismissed", note = null, bookId = null } = {}) {
  const clean = cleanIds(ids);
  if (!clean.length) return 0;
  const st = status === "done" ? "done" : "dismissed";
  const r = await db.query(
    `
    UPDATE public.book_save_attempts
    SET followup_status = $2,
        followup_note   = $3,
        followup_at     = now(),
        book_id         = COALESCE(book_id, $4::uuid)
    WHERE id = ANY($1::uuid[])
      AND followup_status IS NULL
    `,
    [clean, st, note ? String(note).slice(0, 500) : null, bookId && UUID_RE.test(bookId) ? bookId : null]
  );
  return r.rowCount;
}

module.exports = { OPEN_FAILURES_SQL, listOpenFailures, closeFailures, friendlyReason, cleanIds };

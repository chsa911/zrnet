-- Vollständiger Verlauf aller Barcodes, die in den letzten 7 Tagen freigegeben wurden.
-- Pro Barcode alle Zuweisungen (alt -> neu) mit Buch, assigned_at, freed_at,
-- Dauer, und Prüfung gegen die vorherige Zuweisung. Reine Lese-Abfragen.
-- Für einen einzelnen Barcode: in Teil 1 die WHERE-Bedingung durch
--   WHERE lower(ba.barcode) = lower('ob100')   ersetzen.

-- 1) Verlauf aus barcode_assignments (Ledger)
WITH ziel AS (
  SELECT DISTINCT lower(barcode) AS bc
  FROM public.barcode_assignments
  WHERE freed_at >= now() - interval '7 days'
),
ledger AS (
  SELECT
    ba.*,
    row_number() OVER w                    AS nr,
    count(*)     OVER (PARTITION BY lower(ba.barcode)) AS anzahl,
    lag(ba.freed_at) OVER w                AS vorher_freed_at,
    lag(ba.book_id)  OVER w                AS vorher_book_id
  FROM public.barcode_assignments ba
  JOIN ziel z ON z.bc = lower(ba.barcode)
  WINDOW w AS (PARTITION BY lower(ba.barcode) ORDER BY ba.assigned_at, ba.freed_at NULLS LAST)
)
SELECT
  l.barcode,
  l.nr || '/' || l.anzahl AS zuweisung,
  b.title_display,
  b.reading_status,
  to_char(b.registered_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI') AS buch_registriert,
  to_char(l.assigned_at   AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI') AS assigned_at,
  to_char(l.freed_at      AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI') AS freed_at,
  justify_interval(coalesce(l.freed_at, now()) - l.assigned_at)              AS dauer,
  CASE
    WHEN b.id IS NULL                                        THEN 'BUCH FEHLT'
    WHEN l.freed_at IS NOT NULL AND l.freed_at < l.assigned_at THEN 'freed VOR assigned'
    WHEN l.nr > 1 AND l.vorher_freed_at IS NULL              THEN 'ÜBERLAPPUNG: Vorgänger noch offen'
    WHEN l.nr > 1 AND l.assigned_at < l.vorher_freed_at      THEN 'ÜBERLAPPUNG: vor Freigabe neu vergeben'
    WHEN l.freed_at IS NULL AND b.reading_status <> 'in_progress' THEN 'offen, aber Buch nicht in_progress'
    WHEN date_trunc('second', l.assigned_at) = timestamptz '2025-12-27 19:54:37+01' THEN 'OK (Import-Datum)'
    ELSE 'OK'
  END AS pruefung,
  l.book_id
FROM ledger l
LEFT JOIN public.books b ON b.id = l.book_id
ORDER BY lower(l.barcode), l.nr;

-- 2) Nur die Auffälligkeiten aus Teil 1 über ALLE Barcodes (nicht nur letzte Woche)
WITH ledger AS (
  SELECT ba.*,
    row_number() OVER w AS nr,
    lag(ba.freed_at) OVER w AS vorher_freed_at
  FROM public.barcode_assignments ba
  WINDOW w AS (PARTITION BY lower(ba.barcode) ORDER BY ba.assigned_at, ba.freed_at NULLS LAST)
)
SELECT l.barcode, l.nr, b.title_display, b.reading_status,
       l.assigned_at, l.freed_at, l.vorher_freed_at, l.book_id
FROM ledger l
LEFT JOIN public.books b ON b.id = l.book_id
WHERE (l.nr > 1 AND (l.vorher_freed_at IS NULL OR l.assigned_at < l.vorher_freed_at))
   OR (l.freed_at < l.assigned_at)
   OR (l.freed_at IS NULL AND b.reading_status IS DISTINCT FROM 'in_progress')
ORDER BY lower(l.barcode), l.nr;

-- 3) Gegenprobe mit barcode_history (wird von der App/Sync geschrieben)
SELECT
  h.barcode,
  b.title_display,
  h.reading_status,
  to_char(h.book_registered_at        AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI') AS registriert,
  to_char(h.reading_status_changed_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI') AS status_geaendert,
  to_char(h.freed_at                  AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI') AS history_freed_at,
  to_char(ba.freed_at                 AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI') AS ledger_freed_at,
  CASE WHEN ba.id IS NULL THEN 'kein Ledger-Eintrag' ELSE '' END AS hinweis,
  h.client_change_id
FROM public.barcode_history h
LEFT JOIN public.books b ON b.id = h.book_id
LEFT JOIN public.barcode_assignments ba
       ON ba.book_id = h.book_id AND lower(ba.barcode) = lower(h.barcode)
WHERE lower(h.barcode) IN (SELECT DISTINCT lower(barcode) FROM public.barcode_assignments
                           WHERE freed_at >= now() - interval '7 days')
ORDER BY lower(h.barcode), h.freed_at;

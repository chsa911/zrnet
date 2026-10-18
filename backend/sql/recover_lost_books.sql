-- recover_lost_books.sql
-- NUR LESEND – ändert nichts. In DBeaver Abfrage für Abfrage ausführen.
--
-- Zweck: Bücher finden, die registriert werden sollten (Barcode aufgemalt),
-- deren Speichern aber abgelehnt wurde (z. B. Barcode schon vergeben) und
-- die deshalb nie in public.books angekommen sind.
--
-- Quelle: public.book_save_attempts. Jeder Speicherversuch wird dort VOR der
-- eigentlichen Transaktion protokolliert und bleibt auch bei einem Rollback
-- erhalten. Protokolliert wird seit ca. Ende Juni 2026.
-- Enthalten sind: Titel, Autor-Eingabe, Seiten, gewünschter Barcode,
-- Breite/Höhe, Fehlermeldung. NICHT enthalten: letztes Wort, Kapitel,
-- Verlag usw. – die müssen beim Nachtragen neu erfasst werden.


-- 1) Die Liste der verlorenen Bücher (eine Zeile pro Titel + Barcode,
--    Wiederholungsversuche zusammengefasst).
--    "inhaber_*" zeigt, welches Buch den Barcode in der DB gerade hält –
--    das ist der Grund für die Ablehnung und muss geklärt werden.
--    "entwurf_id" ist gefüllt, wenn das Buch als Entwurf (ohne Barcode)
--    existiert – dann reicht es, diesen Entwurf zu registrieren.
WITH fehlgeschlagen AS (
  SELECT a.*
  FROM public.book_save_attempts a
  WHERE a.status IS DISTINCT FROM 'success'
    AND nullif(btrim(a.title_display), '') IS NOT NULL
    -- später doch noch erfolgreich (gleiche request_id)? -> nicht verloren
    AND NOT EXISTS (
      SELECT 1 FROM public.book_save_attempts s
      WHERE s.status = 'success'
        AND s.request_id IS NOT NULL
        AND s.request_id = a.request_id
    )
),
gruppen AS (
  SELECT
    min(title_display)                  AS titel,
    min(author_input)                   AS autor_eingabe,
    max(pages)                          AS seiten,
    lower(requested_barcode)            AS barcode,
    max(width_cm)                       AS breite_cm,
    max(height_cm)                      AS hoehe_cm,
    count(*)                            AS versuche,
    min(created_at)                     AS erster_versuch,
    max(created_at)                     AS letzter_versuch,
    string_agg(DISTINCT coalesce(error_message, status), ' | ') AS fehler,
    lower(btrim(min(title_display)))    AS titel_key
  FROM fehlgeschlagen
  GROUP BY lower(btrim(title_display)), lower(requested_barcode)
)
SELECT
  g.titel, g.autor_eingabe, g.seiten, g.barcode, g.breite_cm, g.hoehe_cm,
  g.versuche,
  g.erster_versuch  AT TIME ZONE 'Europe/Berlin' AS erster_versuch,
  g.letzter_versuch AT TIME ZONE 'Europe/Berlin' AS letzter_versuch,
  g.fehler,
  h.title_display   AS inhaber_titel,
  h.reading_status  AS inhaber_status,
  h.registered_at AT TIME ZONE 'Europe/Berlin' AS inhaber_registriert,
  h.id              AS inhaber_id,
  e.id              AS entwurf_id
FROM gruppen g
-- welches Buch hält den Barcode gerade?
LEFT JOIN LATERAL (
  SELECT b.id, b.title_display, b.reading_status, b.registered_at
  FROM public.books b
  WHERE g.barcode IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.book_barcodes bb
              WHERE bb.book_id = b.id AND lower(bb.barcode) = g.barcode)
      OR EXISTS (SELECT 1 FROM public.barcode_assignments ba
                 WHERE ba.book_id = b.id AND lower(ba.barcode) = g.barcode
                   AND ba.freed_at IS NULL)
    )
  ORDER BY (b.reading_status = 'in_progress') DESC, b.registered_at DESC NULLS LAST
  LIMIT 1
) h ON true
-- gibt es das Buch als Entwurf ohne Barcode?
LEFT JOIN LATERAL (
  SELECT b.id
  FROM public.books b
  WHERE lower(btrim(b.title_display)) = g.titel_key
    AND NOT EXISTS (SELECT 1 FROM public.book_barcodes bb WHERE bb.book_id = b.id)
  ORDER BY b.added_at DESC NULLS LAST
  LIMIT 1
) e ON true
-- ausblenden, wenn ein Buch mit diesem Titel inzwischen MIT Barcode existiert
-- (dann wurde es offenbar auf anderem Weg nachgetragen)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.books b
  JOIN public.book_barcodes bb ON bb.book_id = b.id
  WHERE lower(btrim(b.title_display)) = g.titel_key
)
ORDER BY g.letzter_versuch DESC;


-- 2) Überblick: wie viele verlorene Versuche je Fehlerart
SELECT coalesce(error_message, status) AS fehler,
       count(*) AS versuche,
       count(DISTINCT lower(btrim(title_display))) AS titel
FROM public.book_save_attempts
WHERE status IS DISTINCT FROM 'success'
GROUP BY 1
ORDER BY 2 DESC;


-- 3) Doppelt belegte Barcodes: ein Barcode, der bei abgelehnten Versuchen
--    angefragt wurde und bei dem in der DB ein ANDERES Buch eingetragen ist.
--    Am Regal prüfen, auf welchem Buch der Barcode wirklich klebt.
WITH abgelehnt AS (
  SELECT lower(requested_barcode) AS barcode,
         string_agg(DISTINCT title_display, ' | ') AS abgelehnt_fuer
  FROM public.book_save_attempts
  WHERE status IS DISTINCT FROM 'success'
    AND requested_barcode IS NOT NULL
    AND error_message ILIKE '%barcode%'
  GROUP BY lower(requested_barcode)
)
SELECT x.barcode, x.abgelehnt_fuer,
       (SELECT string_agg(b.title_display || ' [' || b.reading_status || ']', ' | ')
          FROM public.book_barcodes bb JOIN public.books b ON b.id = bb.book_id
         WHERE lower(bb.barcode) = x.barcode) AS in_db_bei
FROM abgelehnt x
ORDER BY x.barcode;

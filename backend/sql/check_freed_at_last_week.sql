-- Barcodes, deren freed_at in den letzten 7 Tagen gesetzt wurde,
-- verglichen mit books.reading_status_updated_at.
-- Erwartung (Trigger close_open_barcodes_on_status_change):
--   freed_at = reading_status_updated_at  (Mobile-Zeit)
-- Abweichungen entstehen, wenn freed_at über einen Fallback mit now() gesetzt wurde
-- (mobileSync.freeBarcode / barcodeHolders.releaseBookBarcodes) oder
-- reading_status_updated_at NULL war bzw. später noch geändert wurde.
-- Zeiten in Europe/Berlin. Reine Lese-Abfrage.

SELECT
  ba.barcode,
  b.title_display,
  b.reading_status,
  to_char(ba.assigned_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI:SS') AS assigned_at,
  to_char(ba.freed_at    AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI:SS') AS freed_at,
  to_char(b.reading_status_updated_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI:SS') AS reading_status_updated_at,
  ba.freed_at - b.reading_status_updated_at AS differenz,
  CASE
    WHEN b.id IS NULL                                   THEN 'BUCH FEHLT'
    WHEN b.reading_status_updated_at IS NULL            THEN 'rs_updated_at NULL'
    WHEN b.reading_status NOT IN ('finished','abandoned') THEN 'Status passt nicht'
    WHEN abs(extract(epoch FROM ba.freed_at - b.reading_status_updated_at)) < 1 THEN 'OK'
    ELSE 'ABWEICHUNG'
  END AS pruefung,
  ba.book_id
FROM public.barcode_assignments ba
LEFT JOIN public.books b ON b.id = ba.book_id
WHERE ba.freed_at >= now() - interval '7 days'
ORDER BY (CASE WHEN abs(extract(epoch FROM ba.freed_at - b.reading_status_updated_at)) < 1 THEN 1 ELSE 0 END),
         ba.freed_at DESC;

-- ---------------------------------------------------------------------------
-- 2) Dasselbe für public.barcode_history (freed_at DEFAULT now()!)
--    verglichen mit reading_status_changed_at (Zeile) und books.reading_status_updated_at
SELECT
  h.barcode,
  b.title_display,
  h.reading_status AS hist_status,
  b.reading_status AS akt_status,
  to_char(h.freed_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI:SS')                  AS freed_at,
  to_char(h.reading_status_changed_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI:SS') AS hist_rs_changed_at,
  to_char(b.reading_status_updated_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD HH24:MI:SS') AS book_rs_updated_at,
  h.freed_at - h.reading_status_changed_at AS diff_hist,
  h.freed_at - b.reading_status_updated_at AS diff_book,
  CASE
    WHEN h.reading_status_changed_at IS NULL THEN 'hist rs_changed NULL'
    WHEN abs(extract(epoch FROM h.freed_at - h.reading_status_changed_at)) < 1 THEN 'OK'
    ELSE 'ABWEICHUNG'
  END AS pruefung,
  h.client_change_id,
  h.book_id
FROM public.barcode_history h
LEFT JOIN public.books b ON b.id = h.book_id
WHERE h.freed_at >= now() - interval '7 days'
ORDER BY h.freed_at DESC;

-- ---------------------------------------------------------------------------
-- 3) Quelltext der Trigger-Funktion, die in der DB tatsächlich hängt
--    (trg_release_barcode_on_book_close -> release_barcode_on_book_close,
--     steht in keiner Flyway-Migration im Repo)
SELECT pg_get_functiondef('public.release_barcode_on_book_close()'::regprocedure);

-- ---------------------------------------------------------------------------
-- 4) Welche Trigger hängen wirklich an books / barcode_assignments?
--    Laut Flyway erwartet: trg_close_open_barcodes_on_status_change,
--    trg_prevent_in_progress_status_change, trg_prevent_open_assignment_unless_in_progress
SELECT event_object_table AS tabelle, trigger_name, action_timing, string_agg(event_manipulation, ',') AS events
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table IN ('books','barcode_assignments')
GROUP BY 1,2,3 ORDER BY 1,2;
SELECT installed_rank, version, script, success, installed_on FROM public.flyway_schema_history
WHERE script ILIKE ANY (ARRAY['%barcode_invariants%','%prevent_stale_reading_status%','%lock_in_progress%'])
   OR installed_rank > (SELECT max(installed_rank) - 5 FROM public.flyway_schema_history)
ORDER BY installed_rank;

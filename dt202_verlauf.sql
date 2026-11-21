
-- dt202: Warum zeigt der Barcode-Verlauf nichts?
-- NUR LESEND. DBeaver: Strg+Enter (eine Abfrage).
--
-- Der Barcode-Verlauf in der App liest NUR barcode_assignments.
-- Diese Abfrage sucht dt202 in ALLEN Tabellen, in denen er auftauchen kann.
WITH buecher AS (
  SELECT book_id FROM barcode_assignments WHERE lower(barcode) = 'dt202'
  UNION SELECT book_id FROM book_barcodes WHERE lower(barcode) = 'dt202'
  UNION SELECT book_id FROM barcode_conflict_observations WHERE lower(barcode) = 'dt202'
  UNION SELECT book_id FROM book_save_attempts WHERE lower(requested_barcode) = 'dt202'
)
SELECT '1 inventar' AS teil, bi.updated_at AS zeit, NULL::uuid AS book_id,
       row_to_json(bi)::text AS info
FROM barcode_inventory bi WHERE lower(bi.barcode) = 'dt202'
UNION ALL
SELECT '2 buch', b.reading_status_updated_at, b.id,
       coalesce(b.title_display, '?') || ' | ' || coalesce(a.name_display, '?')
       || ' | ' || coalesce(b.pages::text, '') || ' S. | status=' || coalesce(b.reading_status, 'NULL')
       || ' | registered_at=' || coalesce(b.registered_at::text, '-')
FROM books b LEFT JOIN authors a ON a.id = b.author_id
WHERE b.id IN (SELECT book_id FROM buecher)
UNION ALL
SELECT '3 vergabe (ledger)', ba.assigned_at, ba.book_id,
       ba.barcode || ' | freed_at=' || coalesce(ba.freed_at::text, 'OFFEN')
FROM barcode_assignments ba WHERE lower(ba.barcode) = 'dt202'
UNION ALL
SELECT '4 live-link', NULL, bb.book_id, bb.barcode
FROM book_barcodes bb WHERE lower(bb.barcode) = 'dt202'
UNION ALL
SELECT '5 konflikt-notiz', co.observed_at, co.book_id, row_to_json(co)::text
FROM barcode_conflict_observations co WHERE lower(co.barcode) = 'dt202'
UNION ALL
SELECT '6 speicherversuch', s.created_at, s.book_id,
       coalesce(s.status, '') || ' | ' || coalesce(s.title_display, '') || ' | '
       || coalesce(s.error_message, '')
FROM book_save_attempts s WHERE lower(s.requested_barcode) = 'dt202'
UNION ALL
SELECT '7 handy-sync', NULL, NULL, row_to_json(m)::text
FROM mobile_sync_inbox m WHERE lower(m.barcode) = 'dt202'
UNION ALL
SELECT '8 protokoll', au.changed_at, au.book_id,
       au.op || ' | ' || coalesce(au.application_name, '') || ' | ' || au.changes::text
FROM books_audit au
WHERE au.book_id IN (SELECT book_id FROM buecher)
   OR au.changes::text ILIKE '%dt202%'
UNION ALL
-- Tippfehler-Check: ähnliche Codes, die tatsächlich an Büchern hängen
SELECT '9 aehnliche codes', ba.assigned_at, ba.book_id,
       ba.barcode || ' | ' || coalesce(b.title_display, '?')
       || ' | freed_at=' || coalesce(ba.freed_at::text, 'OFFEN')
FROM barcode_assignments ba LEFT JOIN books b ON b.id = ba.book_id
WHERE lower(ba.barcode) ~ '^(dt20[0-9]|dt[0-9]02|td202|dt0202|dtk?202)$'
  AND lower(ba.barcode) <> 'dt202'
ORDER BY teil, zeit NULLS FIRST;

-- dpk001: wer hatte den Code wann, und warum hat Gilliard ihn nicht mehr?
-- NUR LESEND. DBeaver: Strg+Enter (eine Abfrage).
WITH buecher AS (
  SELECT book_id FROM barcode_assignments WHERE lower(barcode) = 'dpk001'
  UNION SELECT book_id FROM book_barcodes WHERE lower(barcode) = 'dpk001'
  UNION SELECT book_id FROM barcode_conflict_observations WHERE lower(barcode) = 'dpk001'
)
SELECT '1 inventar' AS teil, bi.updated_at AS zeit, NULL::uuid AS book_id,
       row_to_json(bi)::text AS info
FROM barcode_inventory bi WHERE lower(bi.barcode) = 'dpk001'
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
FROM barcode_assignments ba WHERE lower(ba.barcode) = 'dpk001'
UNION ALL
SELECT '4 live-link', NULL, bb.book_id, bb.barcode
FROM book_barcodes bb WHERE lower(bb.barcode) = 'dpk001'
UNION ALL
SELECT '5 konflikt-notiz', NULL, co.book_id, row_to_json(co)::text
FROM barcode_conflict_observations co WHERE lower(co.barcode) = 'dpk001'
UNION ALL
SELECT '6 protokoll', au.changed_at, au.book_id,
       au.op || ' | ' || coalesce(au.application_name, '') || ' | ' || au.changes::text
FROM books_audit au WHERE au.book_id IN (SELECT book_id FROM buecher)
ORDER BY teil, zeit NULLS FIRST;

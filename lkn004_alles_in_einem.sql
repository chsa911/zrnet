-- lkn004: alles in EINER Abfrage (nur lesend). Mit Strg+Enter ausführen.
-- Danach: Rechtsklick ins Ergebnis -> Daten exportieren -> CSV
--         -> in den Ordner zrnet-clean speichern als lkn004_ergebnis.csv
WITH buecher AS (
  SELECT book_id FROM barcode_assignments WHERE lower(barcode) = 'lkn004'
  UNION
  SELECT book_id FROM book_barcodes WHERE lower(barcode) = 'lkn004'
)
SELECT '1 inventar' AS teil, NULL::timestamptz AS zeit, NULL::uuid AS book_id,
       row_to_json(bi)::text AS info
FROM barcode_inventory bi
WHERE lower(bi.barcode) = 'lkn004'
UNION ALL
SELECT '2 lkn-serie', NULL, NULL,
       bi.status || ' | im_pool=' || (bi.rank_in_inventory IS NOT NULL) || ' | ' || count(*) || ' Codes'
FROM barcode_inventory bi
WHERE lower(bi.barcode) LIKE 'lkn%'
GROUP BY bi.status, (bi.rank_in_inventory IS NOT NULL)
UNION ALL
SELECT '3 vergabe', NULL, ba.book_id,
       row_to_json(ba)::text || ' | ' || coalesce(b.title_display, '(kein Titel)') || ' | ' || coalesce(b.reading_status, '')
FROM barcode_assignments ba
LEFT JOIN books b ON b.id = ba.book_id
WHERE lower(ba.barcode) = 'lkn004'
UNION ALL
SELECT '4 buch', b.updated_at, b.id,
       coalesce(b.title_display, '(kein Titel)') || ' | ' || coalesce(b.pages::text, '') || ' S. | ' || coalesce(b.reading_status, '')
FROM books b
WHERE b.id IN (SELECT book_id FROM buecher)
UNION ALL
SELECT '5 protokoll', au.changed_at, au.book_id,
       au.op || ' | ' || coalesce(au.application_name, '') || ' | ' || au.db_user || ' | ' || au.changes::text
FROM books_audit au
WHERE au.book_id IN (SELECT book_id FROM buecher)
ORDER BY teil, zeit NULLS FIRST;

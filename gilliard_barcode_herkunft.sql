-- Gilliard (303 S.): woher kam / wohin ging der Barcode?  NUR LESEND.
-- DBeaver: Strg+Enter (eine Abfrage). Ergebnis nach "teil" und "zeit" sortiert.
WITH buch AS (
  SELECT b.id
  FROM books b
  JOIN authors a ON a.id = b.author_id
  WHERE a.name_display ILIKE '%gilliard%'
    AND b.pages = 303
),
codes AS (
  SELECT lower(barcode) AS code FROM barcode_assignments WHERE book_id IN (SELECT id FROM buch)
  UNION
  SELECT lower(barcode) FROM book_barcodes WHERE book_id IN (SELECT id FROM buch)
  UNION
  -- Barcode, der irgendwann im Protokoll an diesem Buch auftauchte
  SELECT lower(v) FROM books_audit au,
       LATERAL (SELECT au.changes->'barcode'->>'alt' UNION SELECT au.changes->'barcode'->>'neu') x(v)
  WHERE au.book_id IN (SELECT id FROM buch) AND v IS NOT NULL
)
SELECT '1 buch' AS teil, b.updated_at AS zeit, b.id AS book_id,
       coalesce(b.title_display, '(kein Titel)') || ' | status=' || coalesce(b.reading_status, 'NULL')
       || ' | status_seit=' || coalesce(b.reading_status_updated_at::text, '-')
       || ' | registered_at=' || coalesce(b.registered_at::text, '-') AS info
FROM books b WHERE b.id IN (SELECT id FROM buch)
UNION ALL
SELECT '2 vergabe dieses buchs', ba.assigned_at, ba.book_id,
       ba.barcode || ' | freed_at=' || coalesce(ba.freed_at::text, 'OFFEN')
FROM barcode_assignments ba WHERE ba.book_id IN (SELECT id FROM buch)
UNION ALL
SELECT '3 aktueller link', NULL, bb.book_id, bb.barcode
FROM book_barcodes bb WHERE bb.book_id IN (SELECT id FROM buch)
UNION ALL
SELECT '4 code heute bei', ba.assigned_at, ba.book_id,
       ba.barcode || ' | ' || coalesce(b.title_display, '?') || ' | ' || coalesce(b.reading_status, '')
       || ' | freed_at=' || coalesce(ba.freed_at::text, 'OFFEN')
FROM barcode_assignments ba JOIN books b ON b.id = ba.book_id
WHERE lower(ba.barcode) IN (SELECT code FROM codes)
  AND ba.book_id NOT IN (SELECT id FROM buch)
UNION ALL
SELECT '5 protokoll', au.changed_at, au.book_id,
       au.op || ' | ' || coalesce(au.application_name, '') || ' | ' || au.changes::text
FROM books_audit au WHERE au.book_id IN (SELECT id FROM buch)
ORDER BY teil, zeit NULLS FIRST;

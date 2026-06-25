-- 1) Are the protective constraints from V20260212_03__barcode_invariants.sql
--    actually live on the DB? If these come back empty, that migration's
--    transaction rolled back (its pre-check raises an exception and aborts
--    if dirty duplicates already existed when it ran) and nothing has been
--    preventing duplicate/open assignments since.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'barcode_assignments'
  AND indexname = 'uq_barcode_assignments_open';

SELECT tgname
FROM pg_trigger
WHERE tgname = 'trg_prevent_open_assignment_unless_in_progress';

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.book_barcodes'::regclass;

-- 2) True scope: how many barcodes currently have more than one OPEN
--    (freed_at IS NULL) row in barcode_assignments?
SELECT lower(barcode) AS bc, count(*) AS open_rows
FROM public.barcode_assignments
WHERE freed_at IS NULL
GROUP BY 1
HAVING count(*) > 1
ORDER BY open_rows DESC;

-- 3) True scope: how many barcode values have more than one row in
--    book_barcodes (the table that's supposed to have UNIQUE(barcode))?
SELECT lower(barcode) AS bc, count(*) AS rows, array_agg(book_id) AS book_ids
FROM public.book_barcodes
GROUP BY 1
HAVING count(*) > 1
ORDER BY rows DESC;

-- 4) Total counts (just the numbers, for a sense of overall scale)
SELECT
  (SELECT count(*) FROM (
     SELECT lower(barcode) FROM public.barcode_assignments
     WHERE freed_at IS NULL GROUP BY 1 HAVING count(*) > 1
   ) x) AS barcodes_with_duplicate_open_ledger_rows,
  (SELECT count(*) FROM (
     SELECT lower(barcode) FROM public.book_barcodes
     GROUP BY 1 HAVING count(*) > 1
   ) y) AS barcodes_with_duplicate_book_barcodes_rows;

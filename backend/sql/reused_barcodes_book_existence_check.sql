-- For every barcode that has real history -- assigned more than once in
-- the barcode_assignments ledger, or with at least one row in the
-- barcode_history (freed) log -- list every historical book_id it was
-- ever linked to, and whether that book_id still actually exists as a
-- row in public.books. book_exists = false means the ledger/history
-- references a book that was deleted (or never properly saved), even
-- though the barcode still carries that history.

WITH reused_barcodes AS (
  SELECT barcode FROM public.barcode_assignments
  GROUP BY barcode HAVING COUNT(*) > 1
  UNION
  SELECT barcode FROM public.barcode_history
  GROUP BY barcode
),
historical_links AS (
  SELECT barcode, book_id, assigned_at AS event_at, 'assignment' AS source
  FROM public.barcode_assignments
  WHERE barcode IN (SELECT barcode FROM reused_barcodes)
  UNION ALL
  SELECT barcode, book_id, freed_at AS event_at, 'freed_history' AS source
  FROM public.barcode_history
  WHERE barcode IN (SELECT barcode FROM reused_barcodes)
)
SELECT
  hl.barcode,
  hl.book_id,
  hl.source,
  hl.event_at,
  (b.id IS NOT NULL) AS book_exists,
  b.title_display,
  b.reading_status
FROM historical_links hl
LEFT JOIN public.books b ON b.id = hl.book_id
ORDER BY hl.barcode, hl.event_at;

-- Quick view: only the historical book_ids that are missing a books row.
-- This is the actual "problem list" -- everything else above is fine.
WITH historical_links AS (
  SELECT barcode, book_id, 'assignment' AS source
  FROM public.barcode_assignments
  WHERE barcode IN (
    SELECT barcode FROM public.barcode_assignments GROUP BY barcode HAVING COUNT(*) > 1
  )
  UNION ALL
  SELECT barcode, book_id, 'freed_history' AS source
  FROM public.barcode_history
)
SELECT DISTINCT hl.barcode, hl.book_id, hl.source
FROM historical_links hl
LEFT JOIN public.books b ON b.id = hl.book_id
WHERE b.id IS NULL
ORDER BY hl.barcode;

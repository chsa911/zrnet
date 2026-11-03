-- Finished/abandoned books that still hold a barcode (should never happen).
-- Read-only. Run on prod:  psql "$DATABASE_URL" -f find_final_books_with_barcode.sql

-- 1) Live link in book_barcodes (this is what the admin list shows as "Bookcode")
SELECT bb.barcode, b.id, b.title_display, b.reading_status,
       b.reading_status_updated_at, bi.status AS inventory_status
FROM public.books b
JOIN public.book_barcodes bb ON bb.book_id = b.id
LEFT JOIN public.barcode_inventory bi ON lower(bi.barcode) = lower(bb.barcode)
WHERE b.reading_status IN ('abandoned', 'finished')
ORDER BY b.reading_status, b.reading_status_updated_at DESC NULLS LAST;

-- 2) Still-open ledger rows (freed_at IS NULL) for such books
SELECT ba.barcode, b.id, b.title_display, b.reading_status, ba.assigned_at
FROM public.barcode_assignments ba
JOIN public.books b ON b.id = ba.book_id
WHERE ba.freed_at IS NULL
  AND b.reading_status IN ('abandoned', 'finished')
ORDER BY ba.assigned_at DESC NULLS LAST;

-- 3) Count only
SELECT b.reading_status, count(DISTINCT b.id) AS books
FROM public.books b
JOIN public.book_barcodes bb ON bb.book_id = b.id
WHERE b.reading_status IN ('abandoned', 'finished')
GROUP BY 1;

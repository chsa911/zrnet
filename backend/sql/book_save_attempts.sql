-- current link table (in case it's stale and was never cleaned up)
SELECT * FROM public.book_barcodes
WHERE book_id = (SELECT id FROM public.books WHERE title_display ILIKE '%gnadenlose%');

-- separate historical log, if it's populated independently of barcode_assignments
SELECT * FROM public.barcode_history
WHERE book_id = (SELECT id FROM public.books WHERE title_display ILIKE '%gnadenlose%')
ORDER BY created_at DESC;
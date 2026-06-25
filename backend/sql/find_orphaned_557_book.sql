-- Find an in_progress book that's missing its barcode link entirely
-- (registered in `books`, but no row in book_barcodes — the silent-drop
-- bug described in assignBarcodeTx). Narrowed to 557 pages since that's
-- the only fact we have about the mislabeled physical book.

SELECT b.id, b.title_display, b.pages, b.reading_status, b.registered_at
FROM public.books b
LEFT JOIN public.book_barcodes bb ON bb.book_id = b.id
WHERE b.pages = 557
  AND bb.book_id IS NULL
ORDER BY b.registered_at DESC;

-- If nothing comes back, drop the pages filter to see ALL in_progress
-- books with no barcode at all (broader net, in case 557 was a typo too):
--
-- SELECT b.id, b.title_display, b.pages, b.reading_status, b.registered_at
-- FROM public.books b
-- LEFT JOIN public.book_barcodes bb ON bb.book_id = b.id
-- WHERE b.reading_status = 'in_progress'
--   AND bb.book_id IS NULL
-- ORDER BY b.registered_at DESC;

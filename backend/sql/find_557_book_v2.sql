-- Broader pass at identifying the mislabeled 557-page book.
-- Run these and look at title_display / author_input — even a failed
-- attempt may have had something typed in before it errored out.

-- 1) Every save attempt within +/- N days of a date you remember (edit the
--    date below to roughly when you think this book was scanned/added).
-- SELECT id, title_display, author_input, pages, requested_barcode,
--        status, error_message, book_id, created_at, resolved_at
-- FROM public.book_save_attempts
-- WHERE created_at BETWEEN '2026-06-01' AND '2026-06-25'
-- ORDER BY created_at DESC;

-- 2) Any attempt with pages within a small range of 557, in case it was
--    mistyped/misread (e.g. 556, 558, 575).
SELECT id, title_display, author_input, pages, requested_barcode,
       status, error_message, book_id, created_at, resolved_at
FROM public.book_save_attempts
WHERE pages BETWEEN 550 AND 565
ORDER BY created_at DESC;

-- 3) Any book in the `books` table itself (not just save_attempts) with
--    pages near 557 that has no current barcode link at all — broadened
--    range version of find_orphaned_557_book.sql.
SELECT b.id, b.title_display, b.author_display, b.pages, b.reading_status,
       b.registered_at
FROM public.books b
LEFT JOIN public.book_barcodes bb ON bb.book_id = b.id
WHERE b.pages BETWEEN 550 AND 565
  AND bb.book_id IS NULL
ORDER BY b.registered_at DESC;

-- 4) Last resort: every save attempt that never resolved to success,
--    regardless of pages, sorted newest first — scan title_display by eye
--    for anything that rings a bell.
SELECT id, title_display, author_input, pages, requested_barcode,
       status, error_message, created_at
FROM public.book_save_attempts
WHERE status IS DISTINCT FROM 'success'
ORDER BY created_at DESC
LIMIT 50;

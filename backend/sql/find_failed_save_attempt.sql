-- book_save_attempts is logged on its own committed statement, OUTSIDE the
-- books/barcode-assignment transaction (see logSaveAttempt/resolveSaveAttempt
-- in booksPgController.js). So even if the main save rolled back and the
-- book never got created, this table should still have the row — including
-- whatever barcode was requested and the pages that were typed in.

-- 1) Direct hit: any attempt that asked for barcode dik030.
SELECT id, title_display, author_input, pages, requested_barcode,
       width_cm, height_cm, status, error_message, book_id,
       created_at, resolved_at
FROM public.book_save_attempts
WHERE lower(requested_barcode) = lower('dik030')
ORDER BY created_at DESC;

-- 2) Broader net: any attempt with 557 pages, in case the barcode field
--    wasn't what was logged (e.g. it was requested before a barcode got
--    picked, or a different code was typed/scanned).
SELECT id, title_display, author_input, pages, requested_barcode,
       width_cm, height_cm, status, error_message, book_id,
       created_at, resolved_at
FROM public.book_save_attempts
WHERE pages = 557
ORDER BY created_at DESC;

-- 3) All attempts that never resolved successfully (code only ever sets
--    status to 'success' or 'failed' — see resolveSaveAttempt calls in
--    booksPgController.js — so anything else, including NULL/never-resolved,
--    means the save attempt is suspect) — useful for finding other
--    "disappeared" books beyond just this one.
SELECT id, title_display, pages, requested_barcode, status, error_message, created_at, resolved_at
FROM public.book_save_attempts
WHERE book_id IS NULL
   OR status IS DISTINCT FROM 'success'
ORDER BY created_at DESC
LIMIT 100;

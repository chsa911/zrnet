-- Diagnose desync between the historical ledger (barcode_assignments) and the
-- live current-owner table (book_barcodes).
--
-- Root cause: book_barcodes.barcode is UNIQUE per the schema in
-- 20260127_init_barcodes_tables.sql. The old assignBarcodeTx() only deleted
-- book_barcodes rows for the *new* book_id before inserting, never for the
-- *old* book that previously held the same barcode value. So when a freed
-- barcode got reassigned to a new book, the INSERT silently no-op'd
-- (ON CONFLICT DO NOTHING) and the new book never got a visible barcode link,
-- while the old (finished/abandoned) book kept showing up whenever you
-- searched that barcode — with its own, now-outdated, page count.
--
-- This has been fixed going forward in booksPgController.js (assignBarcodeTx
-- now clears any existing row for the barcode value before inserting). This
-- script only finds/repairs *already* affected rows.

-- 1) Specific check for the barcode mentioned by the user.
SELECT
  ba.barcode,
  ba.book_id,
  ba.assigned_at,
  ba.freed_at,
  b.title_display,
  b.pages,
  b.reading_status,
  cur.book_id AS current_link_book_id,
  curb.title_display AS current_link_title,
  curb.pages AS current_link_pages
FROM public.barcode_assignments ba
LEFT JOIN public.books b ON b.id = ba.book_id
LEFT JOIN public.book_barcodes cur ON lower(cur.barcode) = lower(ba.barcode)
LEFT JOIN public.books curb ON curb.id = cur.book_id
WHERE lower(ba.barcode) = lower('dik030')
ORDER BY ba.assigned_at DESC NULLS LAST;

-- 2) System-wide: every barcode where the most recent OPEN assignment's
--    book_id does not match the book_barcodes current link (i.e. the new
--    book "lost" its barcode the same way dik030 likely did). These are the
--    books to go fix manually (or re-run the assign step for).
SELECT
  ba.barcode,
  ba.book_id           AS ledger_says_book_id,
  b.title_display       AS ledger_title,
  b.pages                AS ledger_pages,
  cur.book_id            AS book_barcodes_says_book_id,
  curb.title_display      AS book_barcodes_title,
  curb.pages               AS book_barcodes_pages
FROM public.barcode_assignments ba
LEFT JOIN public.books b ON b.id = ba.book_id
LEFT JOIN public.book_barcodes cur ON lower(cur.barcode) = lower(ba.barcode)
LEFT JOIN public.books curb ON curb.id = cur.book_id
WHERE ba.freed_at IS NULL
  AND (cur.book_id IS DISTINCT FROM ba.book_id);

-- 3) Once you've identified the correct (newer, in_progress) book for a
--    given barcode from query #2, repair the live link manually, e.g. for
--    dik030 once you know the real book_id from query #1/#2:
--
-- DELETE FROM public.book_barcodes WHERE lower(barcode) = lower('dik030');
-- INSERT INTO public.book_barcodes (book_id, barcode)
--   VALUES ('<the-correct-book-id-uuid>', 'dik030');

-- barcode_assignments is the historical LEDGER (every assign/free event,
-- never deleted). It showed exactly one row ever for dik030: Boarderlines,
-- assigned 2025-12-27, never freed.
--
-- book_barcodes is the separate CURRENT-LINK table. Because it only has a
-- composite UNIQUE(book_id, barcode) -- not a standalone UNIQUE(barcode) --
-- it's structurally possible for two different books to hold a row with
-- the same barcode value at once, even if the ledger above looks clean.
-- This checks that table directly for dik030.

SELECT
  bb.book_id,
  b.title_display,
  b.pages
FROM public.book_barcodes bb
LEFT JOIN public.books b ON b.id = bb.book_id
WHERE lower(bb.barcode) = lower('dik030');

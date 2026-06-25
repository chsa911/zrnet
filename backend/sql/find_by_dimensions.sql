-- Direct match by physical measurements: 557 pages, ~124mm wide, ~181mm
-- tall (your 12.4cm x 18.1cm converted to the mm units the DB stores).
-- +/- 3mm tolerance for measuring error. Not limited to "kristall"/"wood"
-- in case the title/author logged don't match what you'd expect.

SELECT
  b.id,
  b.title_display,
  b.author_display,
  b.pages,
  b.year_first_published,
  b.isbn13,
  b.width,
  b.height,
  b.reading_status,
  b.registered_at,
  bb.barcode AS current_barcode
FROM public.books b
LEFT JOIN public.book_barcodes bb ON bb.book_id = b.id
WHERE b.pages = 557
  AND b.width BETWEEN 121 AND 127
  AND b.height BETWEEN 178 AND 184
ORDER BY b.registered_at DESC NULLS LAST;

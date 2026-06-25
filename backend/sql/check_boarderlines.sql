-- Full record for the book dik030 is actually, legitimately linked to
-- (id 93f6b0c9-8add-48a4-8391-ee49acf07a80, "Boarderlines"). Useful to see
-- whether it's still actively in_progress (i.e. genuinely out there
-- somewhere, currently being read) or already finished/abandoned -- which
-- would be odd, since the trigger should have freed dik030 already if so.

SELECT
  b.id,
  b.title_display,
  b.subtitle_display,
  b.author_display,
  b.pages,
  b.width,
  b.height,
  b.reading_status,
  b.reading_status_updated_at,
  b.registered_at,
  bb.barcode AS current_barcode
FROM public.books b
LEFT JOIN public.book_barcodes bb ON bb.book_id = b.id
WHERE b.id = '93f6b0c9-8add-48a4-8391-ee49acf07a80'::uuid;

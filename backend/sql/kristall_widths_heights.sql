-- Width/height (plus enough identifying info to tell rows apart) for every
-- "Kristall der Träume" / Wood candidate. Sorted by dimensions so identical
-- physical editions cluster together and odd ones stand out.

SELECT
  b.id,
  b.width,
  b.height,
  b.pages,
  b.year_first_published,
  b.isbn13,
  b.reading_status,
  b.registered_at,
  bb.barcode AS current_barcode
FROM public.books b
LEFT JOIN public.book_barcodes bb ON bb.book_id = b.id
WHERE b.title_display ILIKE '%kristall%'
ORDER BY b.width, b.height, b.registered_at;

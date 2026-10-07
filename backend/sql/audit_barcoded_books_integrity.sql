-- Integrity audit: books that hold a barcode but are incomplete or inconsistent.
-- Read-only. Run on prod:  psql "$DATABASE_URL" -f audit_barcoded_books_integrity.sql

-- 1) Barcoded books missing author / publisher / title
SELECT bb.barcode, b.id, b.title_display, b.title_keyword, b.pages, b.registered_at,
       (b.author_id IS NULL)    AS no_author,
       (b.publisher_id IS NULL) AS no_publisher,
       (NULLIF(trim(b.title_display),'') IS NULL) AS no_title
FROM public.books b
JOIN public.book_barcodes bb ON bb.book_id = b.id
WHERE b.author_id IS NULL
   OR b.publisher_id IS NULL
   OR NULLIF(trim(b.title_display),'') IS NULL
ORDER BY b.registered_at DESC NULLS LAST;

-- 2) Keyword that does not occur in the title (like ob220: "fever" vs "New Moon")
SELECT bb.barcode, b.id, b.title_keyword, b.title_display, b.updated_at
FROM public.books b
LEFT JOIN public.book_barcodes bb ON bb.book_id = b.id
WHERE NULLIF(trim(b.title_keyword),'') IS NOT NULL
  AND NULLIF(trim(b.title_display),'') IS NOT NULL
  AND position(lower(trim(b.title_keyword)) IN lower(concat_ws(' ', b.title_display, b.subtitle_display))) = 0
ORDER BY b.updated_at DESC NULLS LAST;

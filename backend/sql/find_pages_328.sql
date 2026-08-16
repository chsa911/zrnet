-- All rows with pages = 328, plus whether each currently has a barcode
-- (bb.barcode IS NULL -> likely the stale in_stock draft) and whether its
-- cover file id (book.id) is the one that's 404ing.
--
-- Run: psql "$DATABASE_URL" -f backend/sql/find_pages_328.sql
-- or paste into any Postgres client connected to the Neon DB in .env.

SELECT
  b.id,
  b.title_display,
  b.author_display,
  b.isbn13,
  b.isbn10,
  b.pages,
  b.reading_status,
  b.added_at,
  b.registered_at,
  bb.barcode AS current_barcode,
  (b.id = '3530f7c8-4c14-40ce-ba04-6ffa16ec9e5f') AS is_the_404_cover_id
FROM public.books b
LEFT JOIN public.book_barcodes bb ON bb.book_id = b.id
WHERE b.pages = 328
ORDER BY b.added_at DESC NULLS LAST;

-- All candidate rows for "Kristall der Träume" by Wood, ~557 pages.
-- Shows whether each row currently has a real barcode link (bb.barcode)
-- or is orphaned (bb.barcode IS NULL — the silent-link-failure symptom),
-- plus reading_status and registered_at so you can tell duplicates apart.

SELECT
  b.id,
  b.title_display,
  b.subtitle_display,
  b.author_display,
  b.publisher_id,
  b.pages,
  b.year_first_published,
  b.isbn13,
  b.isbn10,
  b.width,
  b.height,
  b.reading_status,
  b.registered_at,
  b.comment,
  bb.barcode AS current_barcode
FROM public.books b
LEFT JOIN public.book_barcodes bb ON bb.book_id = b.id
WHERE b.title_display ILIKE '%kristall%'
  AND b.author_display ILIKE '%wood%'
ORDER BY b.registered_at DESC NULLS LAST;

-- Companion: full ledger history (barcode_assignments) for any barcode
-- that was ever linked to one of these book ids, in case one of them
-- briefly held dik030 before losing it.
-- (Run query 1 first, copy an id, then:)
-- SELECT * FROM public.barcode_assignments WHERE book_id = '<paste-id>'
-- ORDER BY assigned_at DESC;

-- 2) Direct check: every assignment dik030 has EVER had, oldest to newest,
--    joined to the book title/author/pages at the time. This answers
--    "was dik030 ever on one of the Kristall der Träume rows?" in one go
--    -- no need to paste an id. assigned_at/freed_at show the full timeline,
--    so you can see if it passed through this book before landing on
--    whatever it shows as current now.
SELECT
  ba.barcode,
  ba.book_id,
  b.title_display,
  b.author_display,
  b.pages,
  ba.assigned_at,
  ba.freed_at
FROM public.barcode_assignments ba
LEFT JOIN public.books b ON b.id = ba.book_id
WHERE lower(ba.barcode) = lower('dik030')
ORDER BY ba.assigned_at ASC NULLS LAST;


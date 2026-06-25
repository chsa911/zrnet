-- Did barcode dik030 ever belong to this specific Kristall der Träume row
-- (id 2d51498e-a3a6-4c63-9eda-54a7ad141df4) before it ended up on Boarderlines?
-- If yes, this proves the painted sticker is just leftover from an earlier
-- assignment that was never updated when the book got re-registered/repointed
-- to ri121 -- a labeling drift, not a database bug.

SELECT
  ba.barcode,
  ba.book_id,
  b.title_display,
  ba.assigned_at,
  ba.freed_at
FROM public.barcode_assignments ba
LEFT JOIN public.books b ON b.id = ba.book_id
WHERE lower(ba.barcode) = lower('dik030')
ORDER BY ba.assigned_at ASC NULLS LAST;

-- Direct yes/no version: just checks if that exact book_id ever shows up.
SELECT EXISTS (
  SELECT 1
  FROM public.barcode_assignments
  WHERE lower(barcode) = lower('dik030')
    AND book_id = '2d51498e-a3a6-4c63-9eda-54a7ad141df4'::uuid
) AS dik030_was_ever_on_this_kristall_book;

-- Full history of ri121 itself -- every book it's ever been assigned to,
-- oldest first. Confirms whether it's a clean, single-owner code (good) or
-- part of the same duplication mess as dik030 (another desync to watch for).
SELECT
  ba.barcode,
  ba.book_id,
  b.title_display,
  b.pages,
  ba.assigned_at,
  ba.freed_at
FROM public.barcode_assignments ba
LEFT JOIN public.books b ON b.id = ba.book_id
WHERE lower(ba.barcode) = lower('ri121')
ORDER BY ba.assigned_at ASC NULLS LAST;

-- "Real" history = more than just the current/topical occupation.
-- Three sources, each a different flavor of "this barcode has been
-- somewhere before":
--
--   1. barcode_history              -- every time a barcode was actually
--                                       freed from a book (released log)
--   2. barcode_assignments          -- ledger; >1 row = reused/reassigned
--   3. barcode_conflict_observations -- admin-logged "also seen on" notes

-- 1) Barcodes that were freed/released from at least one prior book.
--    This is the most direct signal: if it's here, it definitely had a
--    real occupant before whatever holds it (or doesn't) now.
SELECT
  bh.barcode,
  COUNT(*) AS times_freed,
  array_agg(DISTINCT bh.book_id::text) AS prior_book_ids,
  MIN(bh.freed_at) AS first_freed_at,
  MAX(bh.freed_at) AS last_freed_at
FROM public.barcode_history bh
GROUP BY bh.barcode
ORDER BY times_freed DESC, bh.barcode;

-- 2) Barcodes reused/reassigned across more than one book_id over time
--    (ledger has >1 row for the same barcode).
SELECT
  ba.barcode,
  COUNT(*) AS assignment_count,
  COUNT(*) FILTER (WHERE ba.freed_at IS NULL) AS open_count,
  array_agg(DISTINCT ba.book_id::text) AS book_ids,
  MIN(ba.assigned_at) AS first_assigned_at,
  MAX(ba.assigned_at) AS last_assigned_at
FROM public.barcode_assignments ba
GROUP BY ba.barcode
HAVING COUNT(*) > 1
ORDER BY assignment_count DESC, ba.barcode;

-- 3) Barcodes that have a conflict observation logged (physically seen on
--    a second book), regardless of resolved/unresolved status.
SELECT
  co.barcode,
  COUNT(*) AS conflict_count,
  COUNT(*) FILTER (WHERE NOT co.resolved) AS unresolved_count,
  array_agg(DISTINCT co.book_id::text) AS flagged_book_ids,
  MIN(co.observed_at) AS first_observed_at,
  MAX(co.observed_at) AS last_observed_at
FROM public.barcode_conflict_observations co
GROUP BY co.barcode
ORDER BY conflict_count DESC, co.barcode;

-- 4) Combined worklist: one row per barcode, flagging which of the three
--    cases above apply. Anything with all-false here has no history at
--    all -- it's only ever had its current/topical occupation.
SELECT
  barcode,
  bool_or(has_freed_history) AS has_freed_history,
  bool_or(has_reuse) AS has_reuse,
  bool_or(has_conflict) AS has_conflict
FROM (
  SELECT barcode, true AS has_freed_history, false AS has_reuse, false AS has_conflict
  FROM public.barcode_history
  GROUP BY barcode

  UNION ALL

  SELECT barcode, false, true, false
  FROM public.barcode_assignments
  GROUP BY barcode
  HAVING COUNT(*) > 1

  UNION ALL

  SELECT barcode, false, false, true
  FROM public.barcode_conflict_observations
  GROUP BY barcode
) x
GROUP BY barcode
ORDER BY barcode;

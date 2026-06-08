BEGIN;

-- Hard rule (defense in depth, independent of which code path writes to
-- public.books — admin UI, registration flow, mobile sync, future scripts, ...):
--
-- A book that is "in_progress" is holding an open barcode_assignment. The
-- only legitimate way to let go of that book — and therefore the only
-- legitimate way to release/free its barcode — is to mark it "finished" or
-- "abandoned". There is no "back to stock" path for in_progress books: the
-- transition in_progress -> in_stock / in_progress -> wishlist is blocked
-- outright, regardless of how it's attempted (admin "save without barcode",
-- an out-of-order mobile-sync push, a future script, ...).
--
-- This is the natural counterpart to trg_prevent_stale_reading_status_update
-- (V20260607_01): that one stops backward-in-time rewrites of the same
-- transition; this one stops the transition from being attempted at all.

CREATE OR REPLACE FUNCTION public.prevent_in_progress_status_change_except_finish_or_abandon()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.reading_status = 'in_progress'
     AND NEW.reading_status IS DISTINCT FROM OLD.reading_status
     AND NEW.reading_status NOT IN ('finished', 'abandoned')
  THEN
    RAISE EXCEPTION
      'Invalid reading_status transition for book %: in_progress can only move to finished or abandoned (attempted: %). The barcode must be released by finishing/abandoning the book.',
      NEW.id, NEW.reading_status
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_in_progress_status_change ON public.books;

CREATE TRIGGER trg_prevent_in_progress_status_change
BEFORE UPDATE OF reading_status
ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.prevent_in_progress_status_change_except_finish_or_abandon();

-- Barcodes are now only ever released via the finished/abandoned path (the
-- in_progress -> in_stock/wishlist branch above can no longer occur, and any
-- other status can't hold an open assignment per
-- trg_prevent_open_assignment_unless_in_progress). Drop the now-impossible
-- "close on becoming wishlist/in_stock" branch from the existing trigger so
-- the code matches the invariant — freed_at is set if and only if the book
-- transitions to finished/abandoned.

CREATE OR REPLACE FUNCTION public.close_open_barcodes_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Close when finished/abandoned: freed_at = reading_status_updated_at (mobile time)
  IF NEW.reading_status IN ('finished','abandoned')
     AND (OLD.reading_status IS DISTINCT FROM NEW.reading_status)
  THEN
    UPDATE public.barcode_assignments
    SET freed_at = COALESCE(NEW.reading_status_updated_at, now())
    WHERE book_id = NEW.id
      AND freed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;

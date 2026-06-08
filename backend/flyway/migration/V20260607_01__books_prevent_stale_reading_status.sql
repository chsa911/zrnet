BEGIN;

-- Defense in depth, independent of which code path writes to public.books
-- (admin UI, registration flow, mobile sync, future scripts, ...):
--
-- A write that changes reading_status but carries an OLDER
-- reading_status_updated_at than what's already stored is, by definition,
-- describing a past state. Applying it would silently rewind the book's
-- status (e.g. a freshly registered "in_progress" book flipping back to
-- "in_stock"/"wishlist" because of a queued/out-of-order mobile-sync push),
-- and — via trg_close_open_barcodes_on_status_change — would also rip the
-- book's open barcode assignment off, even though the book is still in hand.
--
-- This trigger refuses such backward-in-time status changes at the row level:
-- it keeps the existing reading_status / reading_status_updated_at and lets
-- every other column in the same UPDATE go through untouched.
--
-- Forward-in-time changes (incl. legitimate transitions to in_stock/wishlist
-- via the explicit "back to stock" admin action, which always stamp a fresh
-- now()) are unaffected.

CREATE OR REPLACE FUNCTION public.prevent_stale_reading_status_update()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.reading_status IS DISTINCT FROM OLD.reading_status
     AND OLD.reading_status_updated_at IS NOT NULL
     AND NEW.reading_status_updated_at IS NOT NULL
     AND NEW.reading_status_updated_at < OLD.reading_status_updated_at
  THEN
    NEW.reading_status := OLD.reading_status;
    NEW.reading_status_updated_at := OLD.reading_status_updated_at;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_stale_reading_status_update ON public.books;

CREATE TRIGGER trg_prevent_stale_reading_status_update
BEFORE UPDATE OF reading_status, reading_status_updated_at
ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.prevent_stale_reading_status_update();

COMMIT;

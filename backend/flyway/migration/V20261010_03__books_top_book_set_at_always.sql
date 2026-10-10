BEGIN;

-- Every time a book is marked as top book it must get a timestamp.
--
-- Until now there were two columns for the same fact:
--   top_book_set_at  -> written by the web/admin code, read by the website
--   topbook_set_at   -> written only by the mobile sync (routes/mobileSync.js)
-- so a book marked "top" in the app never got top_book_set_at, and code paths
-- that set top_book without a timestamp left it NULL.
--
-- From now on top_book_set_at is the one source of truth, enforced here for
-- every writer (admin UI, registration, mobile sync, scripts):
--   * top_book becomes TRUE and no timestamp is given -> the app's
--     topbook_set_at if present, otherwise now()
--   * top_book stays TRUE                             -> original date is kept
--   * top_book is (or becomes) not TRUE                -> timestamp cleared
--   * topbook_set_at is kept as a mirror of top_book_set_at (legacy column).

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS top_book_set_at timestamptz;
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS topbook_set_at  timestamptz;

CREATE OR REPLACE FUNCTION public.books_stamp_top_book_set_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  app_ts timestamptz;
BEGIN
  IF NEW.top_book IS NOT TRUE THEN
    NEW.top_book_set_at := NULL;

  ELSIF TG_OP = 'INSERT' THEN
    NEW.top_book_set_at := COALESCE(NEW.top_book_set_at, NEW.topbook_set_at, now());

  ELSIF OLD.top_book IS TRUE AND OLD.top_book_set_at IS NOT NULL THEN
    -- already top: keep the original date (form saves re-send top_book = true
    -- together with a fresh now(), which would otherwise move the date)
    NEW.top_book_set_at := OLD.top_book_set_at;

  ELSE
    -- newly marked top (or top without a date so far)
    IF NEW.topbook_set_at IS DISTINCT FROM OLD.topbook_set_at THEN
      app_ts := NEW.topbook_set_at;            -- timestamp sent by the app
    END IF;
    IF NEW.top_book_set_at IS NOT DISTINCT FROM OLD.top_book_set_at THEN
      NEW.top_book_set_at := NULL;             -- nothing new given by the web code
    END IF;
    NEW.top_book_set_at := COALESCE(NEW.top_book_set_at, app_ts, now());
  END IF;

  NEW.topbook_set_at := NEW.top_book_set_at;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_books_stamp_top_book_set_at ON public.books;

CREATE TRIGGER trg_books_stamp_top_book_set_at
BEFORE INSERT OR UPDATE OF top_book, top_book_set_at, topbook_set_at
ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.books_stamp_top_book_set_at();

-- Backfill existing top books without a timestamp.
-- Best available estimate, in this order: the app's timestamp, the last
-- reading-status change (top is usually set when finishing), registration.
UPDATE public.books
SET top_book_set_at = COALESCE(topbook_set_at, reading_status_updated_at, registered_at, now())
WHERE top_book IS TRUE AND top_book_set_at IS NULL;

-- Clear stale timestamps on books that are not top (and align the mirror).
UPDATE public.books
SET top_book_set_at = NULL
WHERE top_book IS DISTINCT FROM TRUE
  AND (top_book_set_at IS NOT NULL OR topbook_set_at IS NOT NULL);

UPDATE public.books
SET topbook_set_at = top_book_set_at
WHERE topbook_set_at IS DISTINCT FROM top_book_set_at;

COMMIT;

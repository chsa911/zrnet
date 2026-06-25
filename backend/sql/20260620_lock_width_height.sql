-- Hard DB-level safeguard (in addition to the app-level checks in
-- booksPgController.js): once a book's width or height has a real value,
-- nobody — app, mobile sync, or a manual UPDATE in DBeaver — can null it
-- out again, even after a barcode is later freed (finished/abandoned).
--
-- This is what should have prevented the "Die gnadenlose Jagd" situation:
-- a book ending up finished with no width/height and no barcode trail.
--
-- Run this once via DBeaver against the rxlog database.

CREATE OR REPLACE FUNCTION public.prevent_width_height_clear()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.width IS NOT NULL AND NEW.width IS NULL THEN
    RAISE EXCEPTION 'width cannot be cleared once set (book id=%)', OLD.id
      USING ERRCODE = '23514';
  END IF;

  IF OLD.height IS NOT NULL AND NEW.height IS NULL THEN
    RAISE EXCEPTION 'height cannot be cleared once set (book id=%)', OLD.id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_width_height_clear ON public.books;

CREATE TRIGGER trg_prevent_width_height_clear
  BEFORE UPDATE OF width, height ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_width_height_clear();

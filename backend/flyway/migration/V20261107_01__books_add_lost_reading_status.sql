-- Neuer Endstatus 'lost' für Bücher, die verloren gegangen sind.
--
-- 'lost' verhält sich wie 'finished' / 'abandoned':
--   * ein Buch in_progress darf auf 'lost' wechseln (Barcode wird frei),
--   * beim Wechsel auf 'lost' wird der Barcode komplett freigegeben
--     (Ledger schließen, Link löschen, Inventar AVAILABLE),
--   * ein 'lost' Buch darf nie wieder einen Barcode-Link bekommen.
--
-- Die Funktionen werden 1:1 aus V20260608_01 / V20261103_01 übernommen und
-- nur um 'lost' erweitert. Mehrfach ausführbar.

BEGIN;

-- 1) Check-Constraint ------------------------------------------------------

ALTER TABLE public.books
  DROP CONSTRAINT IF EXISTS books_reading_status_check;

ALTER TABLE public.books
  ADD CONSTRAINT books_reading_status_check
  CHECK (reading_status = ANY (ARRAY[
    'wishlist',
    'in_progress',
    'finished',
    'abandoned',
    'lost',
    'in_stock'
  ]));

-- 2) in_progress darf nur auf finished / abandoned / lost wechseln -----------

CREATE OR REPLACE FUNCTION public.prevent_in_progress_status_change_except_finish_or_abandon()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.reading_status = 'in_progress'
     AND NEW.reading_status IS DISTINCT FROM OLD.reading_status
     AND NEW.reading_status NOT IN ('finished', 'abandoned', 'lost')
  THEN
    RAISE EXCEPTION
      'Invalid reading_status transition for book %: in_progress can only move to finished, abandoned or lost (attempted: %). The barcode must be released by finishing/abandoning/losing the book.',
      NEW.id, NEW.reading_status
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Statuswechsel auf finished / abandoned / lost gibt Barcode frei --------

CREATE OR REPLACE FUNCTION public.close_open_barcodes_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  codes text[];
BEGIN
  IF NEW.reading_status IN ('finished', 'abandoned', 'lost')
     AND (OLD.reading_status IS DISTINCT FROM NEW.reading_status)
  THEN
    SELECT array_agg(DISTINCT lower(c)) INTO codes
    FROM (
      SELECT barcode AS c FROM public.barcode_assignments
      WHERE book_id = NEW.id AND freed_at IS NULL
      UNION ALL
      SELECT barcode FROM public.book_barcodes WHERE book_id = NEW.id
    ) x;

    -- freed_at = reading_status_updated_at (Handy-Zeit), sonst jetzt
    UPDATE public.barcode_assignments
    SET freed_at = COALESCE(NEW.reading_status_updated_at, now())
    WHERE book_id = NEW.id
      AND freed_at IS NULL;

    DELETE FROM public.book_barcodes WHERE book_id = NEW.id;

    IF codes IS NOT NULL THEN
      UPDATE public.barcode_inventory bi
      SET status = 'AVAILABLE', updated_at = now()
      WHERE lower(bi.barcode) = ANY(codes)
        AND bi.status IS DISTINCT FROM 'AVAILABLE'
        AND NOT public.barcode_held_by_active_book(bi.barcode);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4) Keine neuen Barcode-Links auf finished / abandoned / lost Bücher -------

CREATE OR REPLACE FUNCTION public.prevent_barcode_link_on_final_book()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE st text;
BEGIN
  SELECT reading_status INTO st FROM public.books WHERE id = NEW.book_id;
  IF st IN ('finished', 'abandoned', 'lost') THEN
    RAISE EXCEPTION
      'Barcode link forbidden: book % has reading_status=% (barcode=%). Finished/abandoned/lost books never hold a barcode.',
      NEW.book_id, st, NEW.barcode
      USING ERRCODE = '23514'; -- check_violation
  END IF;
  RETURN NEW;
END;
$function$;

COMMIT;

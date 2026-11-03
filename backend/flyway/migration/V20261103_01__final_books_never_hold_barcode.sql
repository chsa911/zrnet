-- Harte Regel: Ein Buch mit reading_status 'finished' oder 'abandoned' hat
-- NIE einen Barcode. Der Barcode muss freigegeben sein.
--
-- Bisher wurde nur beim Wechsel in_progress -> finished/abandoned im App-Code
-- der Link in book_barcodes gelöscht; der DB-Trigger hat nur
-- barcode_assignments geschlossen. Dadurch blieben Links hängen (z. B.
-- in_stock -> abandoned, direkte SQL-Änderungen, Altdaten) und die Admin-
-- Liste zeigte bei finished/abandoned Büchern noch einen Bookcode.
--
-- Diese Migration
--   1) bereinigt alle bestehenden Fälle,
--   2) gibt den Barcode beim Statuswechsel jetzt auch DB-seitig komplett frei
--      (Ledger schließen, Link löschen, Inventar AVAILABLE),
--   3) verbietet neue Links auf finished/abandoned Bücher.
--
-- "Frei" im Inventar nur, wenn kein anderes in_progress Buch den Code noch
-- trägt (gleiche Regel wie utils/barcodeHolders.js heldByActiveBookSql).
-- Mehrfach ausführbar.

BEGIN;

-- Hilfsfunktion: hält noch ein in_progress Buch diesen Code?
CREATE OR REPLACE FUNCTION public.barcode_held_by_active_book(p_barcode text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
  SELECT EXISTS (
           SELECT 1
           FROM public.barcode_assignments ba
           JOIN public.books b ON b.id = ba.book_id
           WHERE lower(ba.barcode) = lower(p_barcode)
             AND ba.freed_at IS NULL
             AND b.reading_status = 'in_progress'
         )
      OR EXISTS (
           SELECT 1
           FROM public.book_barcodes bb
           JOIN public.books b ON b.id = bb.book_id
           WHERE lower(bb.barcode) = lower(p_barcode)
             AND b.reading_status = 'in_progress'
         );
$function$;

-- 1) Bereinigung bestehender Fälle -----------------------------------------

CREATE TEMP TABLE _final_book_codes ON COMMIT DROP AS
SELECT DISTINCT lower(x.barcode) AS barcode
FROM (
  SELECT bb.barcode
  FROM public.book_barcodes bb
  JOIN public.books b ON b.id = bb.book_id
  WHERE b.reading_status IN ('finished', 'abandoned')
  UNION ALL
  SELECT ba.barcode
  FROM public.barcode_assignments ba
  JOIN public.books b ON b.id = ba.book_id
  WHERE ba.freed_at IS NULL
    AND b.reading_status IN ('finished', 'abandoned')
) x;

UPDATE public.barcode_assignments ba
SET freed_at = COALESCE(b.reading_status_updated_at, now())
FROM public.books b
WHERE ba.book_id = b.id
  AND ba.freed_at IS NULL
  AND b.reading_status IN ('finished', 'abandoned');

DELETE FROM public.book_barcodes bb
USING public.books b
WHERE bb.book_id = b.id
  AND b.reading_status IN ('finished', 'abandoned');

UPDATE public.barcode_inventory bi
SET status = 'AVAILABLE', updated_at = now()
WHERE lower(bi.barcode) IN (SELECT barcode FROM _final_book_codes)
  AND bi.status IS DISTINCT FROM 'AVAILABLE'
  AND NOT public.barcode_held_by_active_book(bi.barcode);

-- 2) Statuswechsel gibt den Barcode komplett frei ---------------------------

CREATE OR REPLACE FUNCTION public.close_open_barcodes_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  codes text[];
BEGIN
  IF NEW.reading_status IN ('finished', 'abandoned')
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

-- Trigger existiert schon (V20260212_03); sicherheitshalber neu anlegen.
DROP TRIGGER IF EXISTS trg_close_open_barcodes_on_status_change ON public.books;
CREATE TRIGGER trg_close_open_barcodes_on_status_change
AFTER UPDATE OF reading_status, reading_status_updated_at
ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.close_open_barcodes_on_status_change();

-- 3) Keine neuen Links auf finished/abandoned Bücher ------------------------

CREATE OR REPLACE FUNCTION public.prevent_barcode_link_on_final_book()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE st text;
BEGIN
  SELECT reading_status INTO st FROM public.books WHERE id = NEW.book_id;
  IF st IN ('finished', 'abandoned') THEN
    RAISE EXCEPTION
      'Barcode link forbidden: book % has reading_status=% (barcode=%). Finished/abandoned books never hold a barcode.',
      NEW.book_id, st, NEW.barcode
      USING ERRCODE = '23514'; -- check_violation
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_barcode_link_on_final_book ON public.book_barcodes;
CREATE TRIGGER trg_prevent_barcode_link_on_final_book
BEFORE INSERT OR UPDATE OF book_id, barcode
ON public.book_barcodes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_barcode_link_on_final_book();

COMMIT;

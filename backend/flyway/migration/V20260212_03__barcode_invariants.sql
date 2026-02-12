BEGIN;

-- 0) Cleanup: close any currently open assignments for books that are NOT in_progress
UPDATE public.barcode_assignments ba
SET freed_at = COALESCE(b.reading_status_updated_at, now())
FROM public.books b
WHERE ba.book_id = b.id
  AND ba.freed_at IS NULL
  AND b.reading_status <> 'in_progress';

-- 1) One open assignment per barcode (history on many books is OK)
--    This implements: "barcode can only be reused when all freed_at are non-null"
DO $$
DECLARE dup_cnt int;
BEGIN
  SELECT count(*) INTO dup_cnt
  FROM (
    SELECT lower(barcode) AS bc
    FROM public.barcode_assignments
    WHERE freed_at IS NULL
    GROUP BY 1
    HAVING count(*) > 1
  ) t;

  IF dup_cnt > 0 THEN
    RAISE EXCEPTION 'Cannot enforce unique open barcode: duplicates with freed_at IS NULL exist. Fix them first.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_barcode_assignments_open
ON public.barcode_assignments (lower(barcode))
WHERE freed_at IS NULL;

-- 2) Block creating/opening assignments unless book is in_progress
CREATE OR REPLACE FUNCTION public.prevent_open_assignment_unless_in_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE st text;
BEGIN
  -- only enforce for OPEN assignments
  IF NEW.freed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT reading_status INTO st
  FROM public.books
  WHERE id = NEW.book_id;

  IF st IS DISTINCT FROM 'in_progress' THEN
    RAISE EXCEPTION
      'Open barcode assignment forbidden: book % has reading_status=% (barcode=%)',
      NEW.book_id, st, NEW.barcode;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_open_assignment_unless_in_progress ON public.barcode_assignments;

CREATE TRIGGER trg_prevent_open_assignment_unless_in_progress
BEFORE INSERT OR UPDATE OF book_id, barcode, freed_at
ON public.barcode_assignments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_open_assignment_unless_in_progress();

-- 3) Auto-close open barcodes when status becomes finished/abandoned (use mobile timestamp),
--    and also close if status becomes wishlist/in_stock (hard rule: never have barcode)
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

  -- Close when becoming wishlist/in_stock (should never keep a barcode)
  IF NEW.reading_status IN ('wishlist','in_stock')
     AND (OLD.reading_status IS DISTINCT FROM NEW.reading_status)
  THEN
    UPDATE public.barcode_assignments
    SET freed_at = now()
    WHERE book_id = NEW.id
      AND freed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_close_open_barcodes_on_status_change ON public.books;

CREATE TRIGGER trg_close_open_barcodes_on_status_change
AFTER UPDATE OF reading_status, reading_status_updated_at
ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.close_open_barcodes_on_status_change();

COMMIT;
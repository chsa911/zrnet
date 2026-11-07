-- Lifecycle eines Leseversuchs (eine Zeile in public.books):
--
--   Upload (Cover + ISBN + Seitenzahl)   -> in_stock
--   Registrierung (Barcode, Daten prüfen) -> in_progress
--   gelesen / abgebrochen / verloren      -> finished | abandoned | lost
--
-- finished / abandoned / lost sind ENDGÜLTIG. Der Barcode ist dann gelöst,
-- es bleibt nur die Leseerinnerung mit Timestamps. Ein erneutes Lesen
-- desselben Titels ist ein neuer Upload, also eine neue Zeile.
--
-- Diese Migration verbietet jeden Statuswechsel aus einem Endstatus heraus,
-- egal über welchen Weg (Admin-UI, API, Offene Vorgänge, Skripte, SQL).
-- Zusammen mit trg_prevent_barcode_link_on_final_book (V20261103_01 /
-- V20261107_01) kann ein solches Buch damit nie wieder einen Barcode bekommen.
--
-- Triggername bewusst so gewählt, dass er (alphabetisch) NACH
-- trg_prevent_stale_reading_status_update läuft: ein veralteter Push, den
-- jener Trigger stillschweigend verwirft, soll hier keinen Fehler auslösen.

BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_status_change_from_final()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.reading_status IN ('finished', 'abandoned', 'lost')
     AND NEW.reading_status IS DISTINCT FROM OLD.reading_status
  THEN
    RAISE EXCEPTION
      'final_status_is_terminal: book % is % and cannot change to %. A finished/abandoned/lost reading attempt is final; register the book again as a new upload.',
      NEW.id, OLD.reading_status, NEW.reading_status
      USING ERRCODE = '23514'; -- check_violation
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_status_change_from_final ON public.books;

CREATE TRIGGER trg_prevent_status_change_from_final
BEFORE UPDATE OF reading_status
ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.prevent_status_change_from_final();

COMMIT;

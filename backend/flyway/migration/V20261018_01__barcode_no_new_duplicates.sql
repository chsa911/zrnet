-- Keine NEUEN Doppel-Barcodes mehr – Altlasten bleiben unangetastet.
--
-- Hintergrund: Aus früheren Zeiten klebt derselbe Barcode teils auf mehreren
-- Büchern (mehrere offene Zeilen in barcode_assignments). Diese Altlasten
-- werden NICHT verändert. Ab jetzt lehnt die Datenbank aber jede NEUE offene
-- Zuweisung ab, wenn derselbe Barcode bereits von einem ANDEREN Buch mit
-- reading_status = 'in_progress' gehalten wird – egal über welchen Weg
-- geschrieben wird (Admin-UI, Mobile-Sync, Skripte, DBeaver).
--
-- Gleiche Regel wie utils/barcodeHolders.js (heldByActiveBookSql), nur
-- zusätzlich in der DB erzwungen. Die Fehlermeldung ist genau der Code, den
-- der Server schon kennt -> HTTP 409 mit verständlicher Meldung im Formular.
--
-- Bewusste Ausnahme (nur für Datenbereinigung / Tests, nur in der aktuellen
-- Transaktion):   SET LOCAL zrnet.allow_legacy_multicopy = 'on';
--
-- Mehrfach ausführbar.

BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_new_duplicate_open_barcode()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- nur offene Zuweisungen sind relevant
  IF NEW.freed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- unveränderte, bereits offene Zeile (z. B. Altlast) bleibt erlaubt
  IF TG_OP = 'UPDATE'
     AND OLD.freed_at IS NULL
     AND OLD.book_id = NEW.book_id
     AND lower(OLD.barcode) = lower(NEW.barcode) THEN
    RETURN NEW;
  END IF;

  IF coalesce(current_setting('zrnet.allow_legacy_multicopy', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  -- zwei gleichzeitige Registrierungen mit demselben Barcode serialisieren,
  -- damit nicht beide die Prüfung unten bestehen
  PERFORM pg_advisory_xact_lock(hashtext('zrnet_barcode:' || lower(NEW.barcode)));

  IF EXISTS (
       SELECT 1
       FROM public.barcode_assignments ba
       JOIN public.books b ON b.id = ba.book_id
       WHERE lower(ba.barcode) = lower(NEW.barcode)
         AND ba.freed_at IS NULL
         AND ba.book_id <> NEW.book_id
         AND ba.id IS DISTINCT FROM NEW.id
         AND b.reading_status = 'in_progress'
     )
     OR EXISTS (
       SELECT 1
       FROM public.book_barcodes bb
       JOIN public.books b ON b.id = bb.book_id
       WHERE lower(bb.barcode) = lower(NEW.barcode)
         AND bb.book_id <> NEW.book_id
         AND b.reading_status = 'in_progress'
     )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'barcode_already_assigned_to_other_book',
      DETAIL  = format('barcode=%s book_id=%s', NEW.barcode, NEW.book_id),
      HINT    = 'Barcode wird bereits von einem anderen Buch (in_progress) gehalten.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_new_duplicate_open_barcode ON public.barcode_assignments;

CREATE TRIGGER trg_prevent_new_duplicate_open_barcode
BEFORE INSERT OR UPDATE OF book_id, barcode, freed_at
ON public.barcode_assignments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_new_duplicate_open_barcode();

COMMIT;

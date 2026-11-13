-- =====================================================================
-- Barcode-Serien dauerhaft sperren: alle Größenfarben "k…" außer "k"
-- (damit auch die ganze lkn-Serie)
--
-- DBeaver:
--   * VORHER oben in der Leiste von "Auto" auf "Manual Commit" umstellen
--   * ganzes Skript ausführen: Alt+X  (NICHT Strg+Enter)
--   * Probelauf: endet mit ROLLBACK -> nichts wird gespeichert.
--     Ergebnis = letzter Tab: Bücher in Arbeit, die einen gesperrten Code tragen.
--   * Echt: unten ROLLBACK; durch COMMIT; ersetzen und erneut Alt+X.
--
-- Was passiert:
--   1) Sicherung der betroffenen Inventar-Zeilen
--   2) status = 'RETIRED' für alle betroffenen Codes
--   3) Trigger auf barcode_inventory: RETIRED bleibt RETIRED.
--      Die App setzt Codes an mehreren Stellen auf AVAILABLE/ASSIGNED
--      (Freigabe bei finished/abandoned, Mobile-Sync, manuelle Zuweisung) –
--      das wird für gesperrte Codes ab jetzt still ignoriert.
--   4) Trigger auf book_barcodes und barcode_assignments: ein gesperrter
--      Code darf KEINEM NEUEN Buch mehr zugewiesen werden – auch nicht per
--      Scan/Hand-Eingabe (die App prüft den Status dort bisher nicht).
--      Bücher, die den Code heute schon tragen, behalten ihn.
--   Bewusste Ausnahme (nur für Reparaturen, nur in dieser Transaktion):
--      SET LOCAL zrnet.allow_retired_barcode = 'on';
--
-- Mehrfach ausführbar.
-- =====================================================================

BEGIN;

DO $$
BEGIN
  IF now() = statement_timestamp() THEN
    RAISE EXCEPTION 'Abbruch: DBeaver steht auf Auto-Commit. Bitte oben in der Leiste von "Auto" auf "Manual Commit" umstellen und das Skript erneut ausführen.';
  END IF;
END $$;

-- Regel an EINER Stelle: gehört dieser Code zu einer gesperrten Serie?
CREATE OR REPLACE FUNCTION public.barcode_series_retired(p_barcode text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT substr(lower(regexp_replace(coalesce(p_barcode, ''), '[0-9]+$', '')), 2) LIKE 'k%'
     AND substr(lower(regexp_replace(coalesce(p_barcode, ''), '[0-9]+$', '')), 2) <> 'k';
$function$;

-- 1) Sicherung --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.barcode_inventory_retire_backup_20261112 AS
  SELECT bi.*, now() AS gesichert_am FROM public.barcode_inventory bi WITH NO DATA;

INSERT INTO public.barcode_inventory_retire_backup_20261112
SELECT bi.*, now()
FROM public.barcode_inventory bi
WHERE public.barcode_series_retired(bi.barcode)
  AND bi.status IS DISTINCT FROM 'RETIRED';

-- 2) Sperren ----------------------------------------------------------------
UPDATE public.barcode_inventory bi
SET status = 'RETIRED', updated_at = now()
WHERE public.barcode_series_retired(bi.barcode)
  AND bi.status IS DISTINCT FROM 'RETIRED';

-- 3) RETIRED bleibt RETIRED -------------------------------------------------
CREATE OR REPLACE FUNCTION public.keep_retired_barcode_retired()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.status = 'RETIRED'
     AND NEW.status IS DISTINCT FROM 'RETIRED'
     AND coalesce(current_setting('zrnet.allow_retired_barcode', true), '') <> 'on'
  THEN
    NEW.status := 'RETIRED';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_keep_retired_barcode_retired ON public.barcode_inventory;
CREATE TRIGGER trg_keep_retired_barcode_retired
BEFORE UPDATE OF status ON public.barcode_inventory
FOR EACH ROW
EXECUTE FUNCTION public.keep_retired_barcode_retired();

-- 4) Keine neue Zuweisung gesperrter Codes ----------------------------------
CREATE OR REPLACE FUNCTION public.prevent_retired_barcode_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'barcode_assignments' AND NEW.freed_at IS NOT NULL THEN
    RETURN NEW;                       -- geschlossene Historien-Zeile: egal
  END IF;

  IF coalesce(current_setting('zrnet.allow_retired_barcode', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
       SELECT 1 FROM public.barcode_inventory bi
       WHERE lower(bi.barcode) = lower(NEW.barcode)
         AND bi.status = 'RETIRED')
  THEN
    RETURN NEW;
  END IF;

  -- Buch trägt diesen Code heute schon (offene Zuweisung) -> darf ihn behalten
  IF EXISTS (
       SELECT 1 FROM public.barcode_assignments ba
       WHERE ba.book_id = NEW.book_id
         AND lower(ba.barcode) = lower(NEW.barcode)
         AND ba.freed_at IS NULL
         AND (TG_TABLE_NAME <> 'barcode_assignments' OR ba.id IS DISTINCT FROM NEW.id))
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = 'P0001',
    MESSAGE = 'barcode_retired',
    DETAIL  = format('barcode=%s book_id=%s', NEW.barcode, NEW.book_id),
    HINT    = 'Dieser Barcode gehört zu einer gesperrten Serie und darf nicht mehr vergeben werden.';
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_retired_barcode_link ON public.book_barcodes;
CREATE TRIGGER trg_prevent_retired_barcode_link
BEFORE INSERT OR UPDATE OF book_id, barcode ON public.book_barcodes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_retired_barcode_assignment();

DROP TRIGGER IF EXISTS trg_prevent_retired_barcode_assignment ON public.barcode_assignments;
CREATE TRIGGER trg_prevent_retired_barcode_assignment
BEFORE INSERT OR UPDATE OF book_id, barcode, freed_at ON public.barcode_assignments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_retired_barcode_assignment();

-- Ergebnis: Bücher in Arbeit, die (noch) einen gesperrten Code tragen -------
SELECT coalesce(bb.barcode, ba.barcode) AS barcode,
       b.id, b.title_display, b.pages, b.reading_status
FROM books b
LEFT JOIN book_barcodes bb ON bb.book_id = b.id
LEFT JOIN barcode_assignments ba ON ba.book_id = b.id AND ba.freed_at IS NULL
WHERE b.reading_status = 'in_progress'
  AND (public.barcode_series_retired(bb.barcode) OR public.barcode_series_retired(ba.barcode))
ORDER BY 1;

ROLLBACK;

-- Neues Schlagwort an einem Buch zählt als Anreicherung -> books.enriched_at
--
-- Schlagworte liegen in public.book_keywords (V20261111_01), nicht in books.
-- Der enriched_at-Trigger auf books (V20261013_02) sieht sie deshalb nicht.
-- Dieser Trigger ergänzt das, egal über welchen Weg (Admin-UI, Skripte, DBeaver).
--
-- Regel (passend zu V20261013_02):
--   * nur wenn ein Schlagwort NEU an das Buch kommt (echter INSERT in book_keywords).
--     Bloßes Umsortieren (ON CONFLICT ... DO UPDATE sort_order) und Entfernen
--     zählen nicht.
--   * nicht beim Anlegen / Registrieren: Bücher, deren added_at oder
--     registered_at weniger als 2 Minuten zurückliegt, werden übersprungen
--     (das zählt als "Upload").
--
-- Kein Backfill: gezählt wird ab Einspielen. Mehrfach ausführbar.

BEGIN;

CREATE OR REPLACE FUNCTION public.book_keywords_stamp_enriched_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER            -- rxlog_app darf enriched_at selbst nicht schreiben
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.books b
     SET enriched_at = now()
   WHERE b.id = NEW.book_id
     AND b.added_at < now() - interval '2 minutes'
     AND (b.registered_at IS NULL OR b.registered_at < now() - interval '2 minutes');
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_book_keywords_stamp_enriched_at ON public.book_keywords;

CREATE TRIGGER trg_book_keywords_stamp_enriched_at
AFTER INSERT ON public.book_keywords
FOR EACH ROW
EXECUTE FUNCTION public.book_keywords_stamp_enriched_at();

COMMIT;

BEGIN;

-- enriched_at: Zeitpunkt, an dem einem Buch zuletzt DATEN HINZUGEFÜGT wurden
-- (z. B. die neue Physical ID / phys_code, Seiten, Maße, Kapitel, letztes Wort,
-- Sprache, Genre …). Grundlage für "Enriched today" im Admin-Dashboard.
--
-- Regel (für alle Schreibwege: Admin-UI, Mobile-Sync, Skripte, DBeaver):
--   * nur bei UPDATE, nicht beim Anlegen (das zählt als "Upload")
--   * nur wenn ein bisher leeres Feld (NULL oder '') einen Wert bekommt
--     -> reine Korrekturen eines vorhandenen Werts zählen NICHT
--   * nicht beim Registrieren (registered_at ändert sich im selben UPDATE)
--   * Verwaltungsfelder zählen nicht: alle *_at-Spalten, barcode,
--     reading_status, top_book, home_featured_slot, request_id, raw, Suchspalten
--
-- Der Trigger heißt trg_zz_… damit er NACH trg_books_set_phys_code läuft
-- (BEFORE-Trigger laufen alphabetisch) und eine dort neu gebildete
-- Nummer mitzählt.
--
-- Kein Backfill: es gibt keine Historie; gezählt wird ab Einspielen.
-- Mehrfach ausführbar.

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS enriched_at timestamptz;

CREATE OR REPLACE FUNCTION public.books_stamp_enriched_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  o jsonb := to_jsonb(OLD);
BEGIN
  IF NEW.registered_at IS DISTINCT FROM OLD.registered_at THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_each(to_jsonb(NEW)) AS n(key, value)
    WHERE n.value <> 'null'::jsonb
      AND n.value <> '""'::jsonb
      AND (o -> n.key IS NULL OR o -> n.key = 'null'::jsonb OR o -> n.key = '""'::jsonb)
      AND n.key !~ '_at$'
      AND n.key !~ '(tsv|search)'
      AND n.key NOT IN ('barcode', 'reading_status', 'top_book', 'home_featured_slot',
                        'request_id', 'raw')
  ) THEN
    NEW.enriched_at := now();
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_zz_books_stamp_enriched_at ON public.books;

CREATE TRIGGER trg_zz_books_stamp_enriched_at
BEFORE UPDATE ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.books_stamp_enriched_at();

CREATE INDEX IF NOT EXISTS idx_books_enriched_at ON public.books (enriched_at);

COMMIT;

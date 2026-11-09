-- Regionen (books.action_continent) neu ordnen:
--
--   alt                       neu
--   1 Südliches Afrika   ->   1 Afrika
--   6 Nordafrika         ->   1 Afrika   (zusammengelegt)
--                             6 Weltweit (Code wird neu belegt)
--
-- Damit gilt:
--   0 Asien  1 Afrika  2 Nordamerika  3 Südamerika  4 Mitteleuropa
--   5 Ostaustralien  6 Weltweit  7 Westaustralien  8 Nordeuropa  9 Südeuropa
--
-- Die alten Werte werden vorher in books_region_backup_20261109 gesichert,
-- so bleibt nachvollziehbar, welches Buch "Nordafrika" bzw. "Südliches Afrika" war.
-- Ein zweiter Lauf würde "Weltweit"-Bücher zu Afrika machen; deshalb tut er
-- nichts, sobald die Sicherung books_region_backup_20261109 existiert.

BEGIN;
DO $$
BEGIN
  IF to_regclass('public.books_region_backup_20261109') IS NOT NULL THEN
    RAISE NOTICE 'Regionen wurden bereits umgestellt (books_region_backup_20261109 existiert) – nichts zu tun.';
    RETURN;
  END IF;
  CREATE TABLE public.books_region_backup_20261109 AS
  SELECT id, action_continent, now() AS gesichert_am
  FROM public.books
  WHERE action_continent IN (1, 6);
  -- Bücher: Nordafrika -> Afrika
  UPDATE public.books SET action_continent = 1, updated_at = now() WHERE action_continent = 6;
  -- Landschaften und Epochen (falls schon mit 6 angelegt)
  IF to_regclass('public.landscapes') IS NOT NULL THEN
    UPDATE public.landscapes SET continent = 1 WHERE continent = 6;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'time_eras' AND column_name = 'continents') THEN
    UPDATE public.time_eras
    SET continents = (SELECT array_agg(DISTINCT CASE WHEN c = 6 THEN 1 ELSE c END) FROM unnest(continents) c)::int2[]
    WHERE 6 = ANY (continents);
  END IF;
END $$;
COMMENT ON COLUMN public.books.action_continent IS
  'Region der Handlung: 0 Asien, 1 Afrika, 2 Nordamerika, 3 Südamerika, 4 Mitteleuropa, 5 Ostaustralien, 6 Weltweit, 7 Westaustralien, 8 Nordeuropa, 9 Südeuropa';
COMMIT;

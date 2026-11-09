-- Neue Region 10 = "Fiktiv" für Bücher, die ganz in einer erfundenen Welt
-- spielen (Atlantis, Mittelerde, Narnia ...).
--
--   0 Asien  1 Afrika  2 Nordamerika  3 Südamerika  4 Mitteleuropa
--   5 Ostaustralien  6 Weltweit  7 Westaustralien  8 Nordeuropa  9 Südeuropa
--   10 Fiktiv
--
-- Der Name des erfundenen Ortes steht in books.action_place_fictional
-- (gibt es schon). Ein erfundener Ort in einer echten Gegend (z. B. ein
-- ausgedachtes Dorf in Bayern) behält seine echte Region/Land/Bundesland und
-- trägt nur den Namen in action_place_fictional.
--
-- Auch Landschaften und Epochen dürfen fiktiv sein (Region 10), z. B.
-- "Mittelerde › Nebelgebirge" oder "Drittes Zeitalter".
--
-- Mehrfach ausführbar.

BEGIN;

ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_action_continent_chk;
ALTER TABLE public.books ADD CONSTRAINT books_action_continent_chk
  CHECK (action_continent IS NULL OR action_continent BETWEEN 0 AND 10);

-- landscapes.continent (Inline-Check aus V20261109_01 hat einen automatischen Namen)
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT con.conname FROM pg_constraint con
    WHERE con.conrelid = 'public.landscapes'::regclass AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%continent%'
  LOOP
    EXECUTE format('ALTER TABLE public.landscapes DROP CONSTRAINT %I', c);
  END LOOP;
END $$;
ALTER TABLE public.landscapes ADD CONSTRAINT landscapes_continent_chk
  CHECK (continent IS NULL OR continent BETWEEN 0 AND 10);

ALTER TABLE public.time_eras DROP CONSTRAINT IF EXISTS time_eras_continents_chk;
ALTER TABLE public.time_eras ADD CONSTRAINT time_eras_continents_chk
  CHECK (continents <@ '{0,1,2,3,4,5,6,7,8,9,10}'::int2[]);

COMMENT ON COLUMN public.books.action_continent IS
  'Region der Handlung: 0 Asien, 1 Afrika, 2 Nordamerika, 3 Südamerika, 4 Mitteleuropa, 5 Ostaustralien, 6 Weltweit, 7 Westaustralien, 8 Nordeuropa, 9 Südeuropa, 10 Fiktiv';
COMMENT ON COLUMN public.books.action_place_fictional IS
  'Name eines erfundenen Ortes/einer erfundenen Welt (Atlantis, Mittelerde, ein ausgedachtes Dorf ...)';

GRANT UPDATE (action_continent, action_country, action_state, action_city,
              action_place_fictional, action_time_year) ON public.books TO rxlog_app;

COMMIT;

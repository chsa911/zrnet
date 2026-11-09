-- Epochen (time_eras) räumlich eingrenzen und mit Büchern verbinden.
--
-- Eine Epoche gilt nur für einen Raum: "Mittelalter" ist europäisch,
-- "Kulturrevolution" chinesisch. Deshalb bekommt time_eras:
--   continents   Regionen wie books.action_continent (0 Asien, 4 Mitteleuropa,
--                8 Nordeuropa, 9 Südeuropa ...); leer = überall
--   countries    Länderkürzel wie books.action_country (D, C ...); leer = ganze Region(en)
--   default_country  wird beim Zuordnen ins leere Land übernommen
--   parent_id    Unterepochen (z. B. Kulturrevolution unter "China unter Mao")
--   search_terms Regex-Teile für automatische Vorschläge
-- und es gibt die Zuordnung book_time_eras (mehrere Epochen pro Buch möglich).
--
-- Bestehende Zeilen in time_eras bleiben unverändert; neue Spalten sind leer.
-- Mehrfach ausführbar.

BEGIN;

ALTER TABLE public.time_eras ADD COLUMN IF NOT EXISTS parent_id    uuid   NULL REFERENCES public.time_eras(id) ON DELETE RESTRICT;
ALTER TABLE public.time_eras ADD COLUMN IF NOT EXISTS continents   int2[] NOT NULL DEFAULT '{}';
ALTER TABLE public.time_eras ADD COLUMN IF NOT EXISTS countries    text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.time_eras ADD COLUMN IF NOT EXISTS search_terms text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.time_eras ADD COLUMN IF NOT EXISTS default_country text NULL;

ALTER TABLE public.time_eras DROP CONSTRAINT IF EXISTS time_eras_not_own_parent;
ALTER TABLE public.time_eras ADD CONSTRAINT time_eras_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id);
ALTER TABLE public.time_eras DROP CONSTRAINT IF EXISTS time_eras_continents_chk;
ALTER TABLE public.time_eras ADD CONSTRAINT time_eras_continents_chk CHECK (continents <@ '{0,1,2,3,4,5,6,7,8,9}'::int2[]);
ALTER TABLE public.time_eras DROP CONSTRAINT IF EXISTS time_eras_years_chk;
ALTER TABLE public.time_eras ADD CONSTRAINT time_eras_years_chk CHECK (start_year IS NULL OR end_year IS NULL OR start_year <= end_year);

CREATE INDEX IF NOT EXISTS time_eras_parent_idx ON public.time_eras (parent_id);

CREATE TABLE IF NOT EXISTS public.book_time_eras (
  book_id      uuid        NOT NULL REFERENCES public.books(id)     ON DELETE CASCADE,
  time_era_id  uuid        NOT NULL REFERENCES public.time_eras(id) ON DELETE CASCADE,
  sort_order   int4        NULL,
  source       text        NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (book_id, time_era_id)
);

CREATE INDEX IF NOT EXISTS book_time_eras_era_idx ON public.book_time_eras (time_era_id);

GRANT SELECT, INSERT, UPDATE ON public.time_eras TO rxlog_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_time_eras TO rxlog_app;

-- ---- Startdaten -------------------------------------------------------------
-- Jahre: negative Zahlen = v. Chr. (nicht benötigt für diese Einträge)

INSERT INTO public.time_eras (slug, name, start_year, end_year, continents, countries, search_terms, sort_order) VALUES
  ('mittelalter', 'Mittelalter', 500, 1500, '{4,8,9}', '{}',
     ARRAY['mittelalter','mittelalterlich','middle ages','medieval'], 300),
  ('china-mao', 'China unter Mao', 1949, 1976, '{0}', '{C}',
     ARRAY['\mmaos?\M','mao zedong','mao tse','mao-tse','tse-tung','maoismus','maoist','gro(ß|ss)er sprung','great leap'], 610)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.time_eras (slug, name, parent_id, start_year, end_year, continents, countries, search_terms, sort_order)
SELECT 'kulturrevolution', 'Kulturrevolution', p.id, 1966, 1976, '{0}', '{C}',
       ARRAY['kultur-?revolution','cultural revolution','rote garden?','red guards?','wen ?hua da ge ming'], 611
FROM public.time_eras p WHERE p.slug = 'china-mao'
ON CONFLICT (slug) DO NOTHING;

-- Falls 'mittelalter' schon vorher existierte: nur leere Felder ergänzen
UPDATE public.time_eras SET
  continents   = CASE WHEN continents   = '{}' THEN '{4,8,9}'::int2[] ELSE continents END,
  search_terms = CASE WHEN search_terms = '{}' THEN ARRAY['mittelalter','mittelalterlich','middle ages','medieval'] ELSE search_terms END,
  start_year   = coalesce(start_year, 500),
  end_year     = coalesce(end_year, 1500)
WHERE slug = 'mittelalter';

COMMIT;

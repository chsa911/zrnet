-- Landschaften (Gebirge, Gipfel, Wüsten, Meere ...) als eigene Ebene neben
-- Region (books.action_continent) und Land (books.action_country).
--
--   landscapes        eine Zeile pro Landschaft, hierarchisch über parent_id
--                     (z. B. Himalaya -> Mount Everest, Karakorum -> K2)
--   book_landscapes   Zuordnung Buch <-> Landschaft (mehrere pro Buch möglich).
--                     Gespeichert wird die genaueste Ebene (K2, nicht zusätzlich
--                     Karakorum); Abfragen fassen über parent_id zusammen.
--
-- Mehrfach ausführbar.

BEGIN;

CREATE TABLE IF NOT EXISTS public.landscapes (
  id            uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name          text        NOT NULL UNIQUE CHECK (btrim(name) <> ''),
  kind          text        NOT NULL
                            CHECK (kind IN ('gebirge', 'gipfel', 'wueste', 'meer', 'fluss', 'see',
                                            'insel', 'polargebiet', 'landschaft')),
  parent_id     uuid        NULL REFERENCES public.landscapes(id) ON DELETE RESTRICT,
  continent     int2        NULL CHECK (continent IS NULL OR continent BETWEEN 0 AND 9),  -- wie books.action_continent
  countries     text[]      NOT NULL DEFAULT '{}',   -- Länderkürzel wie books.action_country (D, A, CH, C, PK ...)
  default_country text      NULL,                    -- wird beim Zuordnen ins leere Land übernommen
  default_state text        NULL,                    -- wird beim Zuordnen ins leere Bundesland übernommen
  height_m      int4        NULL CHECK (height_m IS NULL OR height_m > 0),               -- nur Gipfel
  search_terms  text[]      NOT NULL DEFAULT '{}',   -- Regex-Teile für automatische Vorschläge
  sort_order    int4        NOT NULL DEFAULT 100,
  is_active     boolean     NOT NULL DEFAULT true,
  notes         text        NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landscapes_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX IF NOT EXISTS landscapes_parent_idx ON public.landscapes (parent_id);

CREATE TABLE IF NOT EXISTS public.book_landscapes (
  book_id       uuid        NOT NULL REFERENCES public.books(id)      ON DELETE CASCADE,
  landscape_id  uuid        NOT NULL REFERENCES public.landscapes(id) ON DELETE CASCADE,
  sort_order    int4        NULL,
  source        text        NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (book_id, landscape_id)
);

CREATE INDEX IF NOT EXISTS book_landscapes_landscape_idx ON public.book_landscapes (landscape_id);

GRANT SELECT, INSERT, UPDATE ON public.landscapes TO rxlog_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_landscapes TO rxlog_app;

-- Neue Landschaften können auch direkt im Buchformular als freier Text
-- angelegt werden ("Anden › Cerro Torre").

-- ---- Startdaten ---------------------------------------------------------------
-- Regionen: 0 Asien, 4 Mitteleuropa
-- Länder als Kürzel wie in books.action_country:
--   C China, PK Pakistan, NEP Nepal, IND Indien, BHT Bhutan,
--   D Deutschland, A Österreich, CH Schweiz, I Italien, F Frankreich,
--   SLO Slowenien, FL Liechtenstein, MC Monaco

INSERT INTO public.landscapes (slug, name, kind, continent, countries, search_terms, sort_order) VALUES
  ('himalaya',  'Himalaya',  'gebirge', 0, '{NEP,IND,C,BHT,PK}',
     ARRAY['himalaya','himalaja','sherpa','annapurna','kangchenjunga','kantsch','lhotse','makalu','cho oyu','dhaulagiri','manaslu','shisha ?pangma'], 10),
  ('karakorum', 'Karakorum', 'gebirge', 0, '{PK,IND,C}',
     ARRAY['karakorum','karakoram','baltoro','gasherbrum','broad peak','masherbrum','hunza'], 20),
  ('alpen',     'Alpen',     'gebirge', 4, '{D,A,CH,I,F,SLO,FL,MC}',
     ARRAY['\malpen\M','\malpin','alps\M','matterhorn','mont blanc','montblanc','großglockner','grossglockner','dolomiten','watzmann'], 30)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.landscapes (slug, name, kind, continent, countries, default_country, default_state, search_terms, sort_order) VALUES
  ('bayerischer-wald', 'Bayerischer Wald', 'gebirge', 4, '{D}', 'D', 'Bayern',
     ARRAY['bayerische[rn]? wald','bayerwald','\marber\M','nationalpark bayerischer'], 40)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.landscapes (slug, name, kind, parent_id, continent, countries, default_country, default_state, height_m, search_terms, sort_order)
SELECT v.slug, v.name, 'gipfel', p.id, p.continent, v.countries, v.default_country, v.default_state, v.height_m, v.search_terms, v.sort_order
FROM (VALUES
  ('mount-everest', 'Mount Everest', 'himalaya',  '{NEP,C}'::text[], 'NEP', NULL, 8849,
     ARRAY['everest','chomolungma','qomolangma','sagarmatha'], 11),
  ('nanga-parbat',  'Nanga Parbat',  'himalaya',  '{PK}'::text[],    'PK', NULL, 8126,
     ARRAY['nanga parbat','diamir','rupal','nackte berg','nackten berg'], 12),
  ('k2',            'K2',            'karakorum', '{PK,C}'::text[], 'PK', NULL, 8611,
     ARRAY['\mk2\M','chogori','godwin.austen'], 21),
  ('zugspitze',     'Zugspitze',     'alpen',     '{D,A}'::text[], 'D', 'Bayern', 2962,
     ARRAY['zugspitz'], 31)
) AS v(slug, name, parent_slug, countries, default_country, default_state, height_m, search_terms, sort_order)
JOIN public.landscapes p ON p.slug = v.parent_slug
ON CONFLICT (slug) DO NOTHING;

COMMIT;

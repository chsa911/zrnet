-- Schlagworte: beliebig viele pro Buch.
--
--   keywords        eine Zeile pro Schlagwort (Name eindeutig ohne Groß/Klein)
--   book_keywords   Zuordnung Buch <-> Schlagwort
--
-- Angelegt werden Schlagworte direkt auf der Buchseite (Admin): ein neu
-- eingetippter Name wird automatisch erzeugt.
--
-- Mehrfach ausführbar.

BEGIN;

CREATE TABLE IF NOT EXISTS public.keywords (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name        text        NOT NULL CHECK (btrim(name) <> '' AND length(name) <= 80),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS keywords_name_lower_uq ON public.keywords (lower(name));

CREATE TABLE IF NOT EXISTS public.book_keywords (
  book_id     uuid        NOT NULL REFERENCES public.books(id)    ON DELETE CASCADE,
  keyword_id  uuid        NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
  sort_order  int4        NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (book_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS book_keywords_keyword_idx ON public.book_keywords (keyword_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.keywords      TO rxlog_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_keywords TO rxlog_app;

COMMIT;
